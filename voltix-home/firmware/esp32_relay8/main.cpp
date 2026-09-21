/**
 * Voltix Home — Self-Hosted Sinric Pro Alternative
 * ESP32 DevKit V1 + 8-ch active-LOW relay board.
 * MQTT-driven, non-blocking, auto-reconnect, retained state, physical buttons.
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

/* ================= USER CONFIG — EDIT BEFORE FLASHING ================= */
const char* WIFI_SSID   = "YOUR_WIFI_SSID";
const char* WIFI_PASS   = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER = "192.168.1.10";   // Voltix server IP (Aedes :1883)
const uint16_t MQTT_PORT = 1883;

const char* DEVICE_ID   = "voltix-relay-01";
const char* SECRET_KEY  = "CHANGE_ME_SUPER_SECRET"; // must match env VOLTIX_DEVICE_KEY
/* ====================================================================== */

/* Relay GPIOs + matching physical button pins (button to GND).           */
constexpr uint8_t RELAY_PINS[8] = {16,17,18,19,21,22,23,25};
constexpr uint8_t BTN_PINS[8]   = {32,33,27,14,12,15,4,26};  // adjust per board!

bool relayStates[8]      = {false};         // logical state
bool lastBtnState[8]     = {HIGH};          // internal pullups
unsigned long btnDebounce[8] = {0};

char buf[256];
uint32_t lastHeartbeatMs = 0;
uint32_t lastWifiCheckMs = 0;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

const char* TOPIC_SET   = "voltix/devices/";
const char* TOPIC_STATE = "voltix/devices/";
const char* TOPIC_ONLINE= "voltix/devices/";

void applyRelay(uint8_t ch, bool on) {
  relayStates[ch] = on;
  digitalWrite(RELAY_PINS[ch], !on);        // active-LOW board: LOW = ON
}

void publishAllStates() {
  for (uint8_t i = 0; i < 8; i++) {
    snprintf(buf, sizeof(buf),
      "{\"deviceId\":\"%s\",\"relay\":%d,\"state\":\"%s\",\"rssi\":%d,\"uptime\":%lu}",
      DEVICE_ID, i, relayStates[i] ? "ON" : "OFF",
      WiFi.RSSI(), millis() / 1000);
    char topicBuf[64];
    snprintf(topicBuf, sizeof(topicBuf), "%s%s/state", TOPIC_STATE, DEVICE_ID);
    mqtt.publish(topicBuf, buf, true);   // retained → instant state after reboot/sub
  }
}

/** Validate + execute commands arriving on voltix/devices/DEVICE_ID/set */
void onMessage(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<192> doc;               // small fixed buffer, no heap churn
  if (deserializeJson(doc, payload, len)) { Serial.println("Bad JSON"); return; }

  const char* key = doc["key"] | "";
  if (strcmp(key, SECRET_KEY) != 0) {        // spoof protection on shared LAN
    Serial.println("Rejected: bad key");
    snprintf(buf,sizeof(buf),"{\"deviceId\":\"%s\",\"error\":\"AUTH\"}",DEVICE_ID);
    char topicBuf[64];
    snprintf(topicBuf, sizeof(topicBuf), "%s%s/state", TOPIC_STATE, DEVICE_ID);
    mqtt.publish(topicBuf, buf); return;
  }

  const char* st = doc["state"] | "";
  bool on = strcmp(st, "ON") == 0;

  // Optional per-relay targeting: {"relay":3,...}; else broadcast all channels.
  if (doc.containsKey("relay")) {
    uint8_t ch = doc["relay"].as<uint8_t>();
    if (ch < 8) applyRelay(ch, on);
  } else {
    for (uint8_t i = 0; i < 8; i++) applyRelay(i, on);
  }
  publishAllStates();
}

void ensureMqtt() {
  char topicBuf[64];
  while (!mqtt.connected()) {
    Serial.print("MQTT connecting...");
    snprintf(topicBuf, sizeof(topicBuf), "%s%s/online", TOPIC_ONLINE, DEVICE_ID);
    // Will testament: broker retains offline=false if we drop unexpectedly.
    bool ok = mqtt.connect(DEVICE_ID, nullptr, nullptr,
                          topicBuf, 1, true, "{\"online\":false}");
    if (!ok) { Serial.printf(" failed rc=%d, retry 2s\n", mqtt.state()); delay(2000); continue; }
    Serial.println(" OK");
    snprintf(topicBuf, sizeof(topicBuf), "%s%s/online", TOPIC_ONLINE, DEVICE_ID);
    mqtt.publish(topicBuf, "{\"online\":true}", true);
    char setTopic[64];
    snprintf(setTopic, sizeof(setTopic), "%s%s/set", TOPIC_SET, DEVICE_ID);
    mqtt.subscribe(setTopic, 1);            // QoS1 = at-least-once commands
    publishAllStates();                      // resync server after reconnect
  }
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.disconnect();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) delay(250);
}

void pollButtons() {
  static const uint32_t DEBOUNCE_MS = 50;
  for (uint8_t i = 0; i < 8; i++) {
    bool now = digitalRead(BTN_PINS[i]);
    if (now != lastBtnState[i] && millis() - btnDebounce[i] > DEBOUNCE_MS) {
      btnDebounce[i] = millis();
      lastBtnState[i] = now;
      if (now == LOW) {                      // pressed
        applyRelay(i, !relayStates[i]);      // local manual override — works even if offline
        Serial.printf("BTN: relay %d -> %s\n", i, relayStates[i] ? "ON" : "OFF");
        publishAllStates();                  // sync back to dashboard ASAP
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < 8; i++) {
    pinMode(RELAY_PINS[i], OUTPUT); digitalWrite(RELAY_PINS[i], HIGH); // relays OFF at boot
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  ensureWifi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setKeepAlive(15);
  mqtt.setBufferSize(512);
}

void loop() {
  unsigned long now = millis();

  if (now - lastWifiCheckMs > 10000) { lastWifiCheckMs = now; ensureWifi(); }
  if (now - lastHeartbeatMs > 30000) {               // periodic full-state heartbeat
    lastHeartbeatMs = now;
    if (mqtt.connected()) publishAllStates();
  }

  if (!mqtt.connected()) ensureMqtt();               // auto-reconnect (blocking only when down)
  mqtt.loop();                                       // non-blocking traffic processing
  pollButtons();                                     // physical fallback overrides
}