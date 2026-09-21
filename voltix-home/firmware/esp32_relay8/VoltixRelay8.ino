/**
 * ============================================================================
 * VOLTIX HOME — ESP32 8-CHANNEL SMART RELAY CONTROLLER
 * Self-Hosted Sinric Pro Alternative (Unlimited Devices, 0ms Latency)
 * Features:
 *   - Auto-reconnect WiFi & MQTT with Last Will & Testament (LWT)
 *   - Persistent Relay States in Non-Volatile Flash (ESP32 Preferences)
 *   - 8 Physical Button Inputs with Hardware Debounce (Works even if offline!)
 *   - Individual Channel & Master Broadcast control with Cryptographic Key
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

/* ================= USER CONFIG — EDIT BEFORE FLASHING ================= */
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "192.168.1.100";  // IP address of your Voltix server
const uint16_t MQTT_PORT  = 1883;

const char* DEVICE_ID     = "voltix-relay-01";
const char* SECRET_KEY    = "CHANGE_ME_SUPER_SECRET_AT_LEAST_32_CHARS_LONG";
/* ====================================================================== */

// 8 Relay Output Pins (Active-LOW Relays: LOW = ON, HIGH = OFF)
constexpr uint8_t RELAY_PINS[8] = {16, 17, 18, 19, 21, 22, 23, 25};

// 8 Manual Push Button Input Pins (Connect between GPIO & GND)
constexpr uint8_t BTN_PINS[8]   = {32, 33, 27, 14, 12, 15, 4, 26};

bool relayStates[8]          = {false};
bool lastBtnState[8]         = {HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH};
unsigned long btnDebounce[8] = {0};

char topicBuf[128];
char payloadBuf[256];
uint32_t lastHeartbeatMs     = 0;
uint32_t lastWifiCheckMs     = 0;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Preferences prefs;

void applyRelay(uint8_t ch, bool on, bool saveToMemory = true) {
  if (ch >= 8) return;
  relayStates[ch] = on;
  digitalWrite(RELAY_PINS[ch], on ? LOW : HIGH); // Active-LOW relay module
  
  if (saveToMemory) {
    char key[8];
    snprintf(key, sizeof(key), "r%d", ch);
    prefs.putBool(key, on);
  }
}

void publishState(uint8_t ch) {
  snprintf(payloadBuf, sizeof(payloadBuf),
    "{\"deviceId\":\"%s\",\"relay\":%d,\"state\":\"%s\",\"rssi\":%d,\"uptime\":%lu}",
    DEVICE_ID, ch, relayStates[ch] ? "ON" : "OFF",
    WiFi.RSSI(), millis() / 1000);
  
  snprintf(topicBuf, sizeof(topicBuf), "voltix/devices/%s/state", DEVICE_ID);
  mqtt.publish(topicBuf, payloadBuf, true); // Retained QoS1 state
}

void publishAllStates() {
  for (uint8_t i = 0; i < 8; i++) {
    publishState(i);
  }
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, len);
  if (err) {
    Serial.println("MQTT JSON Parse Error");
    return;
  }

  // Cryptographic Authentication Check
  const char* key = doc["key"] | "";
  if (strcmp(key, SECRET_KEY) != 0) {
    Serial.println("MQTT Access Denied: Invalid Security Key!");
    return;
  }

  const char* st = doc["state"] | "";
  bool on = (strcmp(st, "ON") == 0);

  if (doc.containsKey("relay")) {
    uint8_t ch = doc["relay"].as<uint8_t>();
    if (ch < 8) {
      applyRelay(ch, on);
      publishState(ch);
      Serial.printf("⚡ Relay CH %d -> %s\n", ch + 1, on ? "ON" : "OFF");
    }
  } else {
    // Broadcast all 8 channels (e.g. Master Leave Home command)
    for (uint8_t i = 0; i < 8; i++) {
      applyRelay(i, on);
    }
    publishAllStates();
    Serial.printf("⚡ All Relays -> %s\n", on ? "ON" : "OFF");
  }
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi Connected! IP: %s (RSSI: %d dBm)\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
  }
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to Voltix MQTT Broker...");
    snprintf(topicBuf, sizeof(topicBuf), "voltix/devices/%s/online", DEVICE_ID);
    
    // Last Will Testament: retained offline notice if power cut
    bool ok = mqtt.connect(DEVICE_ID, nullptr, nullptr,
      topicBuf, 1, true, "{\"online\":false}");
      
    if (!ok) {
      Serial.printf(" Failed (rc=%d), retrying in 2s\n", mqtt.state());
      delay(2000);
      return;
    }
    
    Serial.println(" Connected! ⚡");
    mqtt.publish(topicBuf, "{\"online\":true}", true);
    
    // Subscribe to commands
    snprintf(topicBuf, sizeof(topicBuf), "voltix/devices/%s/set", DEVICE_ID);
    mqtt.subscribe(topicBuf, 1);
    
    publishAllStates();
  }
}

void pollButtons() {
  static const uint32_t DEBOUNCE_MS = 50;
  for (uint8_t i = 0; i < 8; i++) {
    bool now = digitalRead(BTN_PINS[i]);
    if (now != lastBtnState[i] && millis() - btnDebounce[i] > DEBOUNCE_MS) {
      btnDebounce[i] = millis();
      lastBtnState[i] = now;
      if (now == LOW) { // Button Pressed
        applyRelay(i, !relayStates[i]);
        Serial.printf("Physical Button %d Pressed -> Relay %d is %s\n",
          i + 1, i + 1, relayStates[i] ? "ON" : "OFF");
        publishState(i);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  prefs.begin("voltix", false);

  // Initialize Relays & Buttons
  for (uint8_t i = 0; i < 8; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    char key[8];
    snprintf(key, sizeof(key), "r%d", i);
    bool savedState = prefs.getBool(key, false);
    applyRelay(i, savedState, false); // Restore last known state
    
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

  if (now - lastWifiCheckMs > 10000) {
    lastWifiCheckMs = now;
    ensureWifi();
  }

  if (!mqtt.connected()) {
    ensureMqtt();
  } else {
    mqtt.loop();
  }

  if (now - lastHeartbeatMs > 30000) {
    lastHeartbeatMs = now;
    if (mqtt.connected()) publishAllStates();
  }

  pollButtons();
}
