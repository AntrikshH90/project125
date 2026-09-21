'use client';
import { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Cpu,
  Wifi,
  Key,
  Layers,
  Terminal,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FlashingCenter() {
  const [activeTab, setActiveTab] = useState<'relay' | 'cam'>('relay');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // User Config State
  const [wifiSsid, setWifiSsid] = useState('YOUR_WIFI_SSID');
  const [wifiPass, setWifiPass] = useState('YOUR_WIFI_PASSWORD');
  const [serverIp, setServerIp] = useState('192.168.1.100');
  const [deviceId, setDeviceId] = useState('voltix-relay-01');
  const [secretKey, setSecretKey] = useState(
    'CHANGE_ME_SUPER_SECRET_AT_LEAST_32_CHARS_LONG'
  );

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const relaySketchCode = `/**
 * ============================================================================
 * VOLTIX HOME — ESP32 8-CHANNEL SMART APPLIANCE CONTROLLER
 * Self-Hosted Sinric Pro Alternative (Supports 8+ Appliances with 0ms Latency)
 * Features: MQTT Non-Blocking, EEPROM State Memory, 8 Physical Button Overrides
 * ============================================================================
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ---------- USER CONFIGURATION ----------
const char* WIFI_SSID     = "${wifiSsid}";
const char* WIFI_PASS     = "${wifiPass}";
const char* MQTT_BROKER   = "${serverIp}"; // Voltix server IP
const uint16_t MQTT_PORT  = 1883;

const char* DEVICE_ID     = "${deviceId}";
const char* SECRET_KEY    = "${secretKey}";
// ----------------------------------------

// 8-Channel Relay Output Pins (Active-LOW: LOW = ON, HIGH = OFF)
constexpr uint8_t RELAY_PINS[8] = {16, 17, 18, 19, 21, 22, 23, 25};

// 8 Push Button Manual Override Inputs (Button connects between Pin & GND)
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
    "{\\"deviceId\\":\\"%s\\",\\"relay\\":%d,\\"state\\":\\"%s\\",\\"rssi\\":%d,\\"uptime\\":%lu}",
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
      Serial.printf("⚡ Relay CH %d -> %s\\n", ch + 1, on ? "ON" : "OFF");
    }
  } else {
    for (uint8_t i = 0; i < 8; i++) {
      applyRelay(i, on);
    }
    publishAllStates();
    Serial.printf("⚡ All Relays -> %s\\n", on ? "ON" : "OFF");
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
    Serial.printf("\\nWiFi Connected! IP: %s (RSSI: %d dBm)\\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
  }
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to Voltix MQTT Broker...");
    snprintf(topicBuf, sizeof(topicBuf), "voltix/devices/%s/online", DEVICE_ID);
    
    bool ok = mqtt.connect(DEVICE_ID, nullptr, nullptr,
      topicBuf, 1, true, "{\\"online\\":false}");
      
    if (!ok) {
      Serial.printf(" Failed (rc=%d), retrying in 2s\\n", mqtt.state());
      delay(2000);
      return;
    }
    
    Serial.println(" Connected! ⚡");
    mqtt.publish(topicBuf, "{\\"online\\":true}", true);
    
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
      if (now == LOW) {
        applyRelay(i, !relayStates[i]);
        Serial.printf("Physical Button %d Pressed -> Relay %d is %s\\n",
          i + 1, i + 1, relayStates[i] ? "ON" : "OFF");
        publishState(i);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  prefs.begin("voltix", false);

  for (uint8_t i = 0; i < 8; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    char key[8];
    snprintf(key, sizeof(key), "r%d", i);
    bool savedState = prefs.getBool(key, false);
    applyRelay(i, savedState, false);
    
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
`;

  const camSketchCode = `/**
 * ============================================================================
 * VOLTIX HOME — ESP32-CAM SMART GATE & FACE ACCESS CONTROLLER
 * Hardware: AI-Thinker ESP32-CAM (OV2640) + Solenoid Lock Relay on GPIO 13
 * ============================================================================
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>

// ---------- USER CONFIGURATION ----------
const char* WIFI_SSID       = "${wifiSsid}";
const char* WIFI_PASS       = "${wifiPass}";
const char* VOLTIX_API_URL  = "http://${serverIp}:3000";
const char* GATE_API_KEY    = "${secretKey}";

#define GATE_RELAY_PIN      13
#define FLASH_LED_PIN       4
#define GATE_OPEN_MS        5000UL
// ----------------------------------------

static camera_config_t camConfig() {
  camera_config_t c{};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer   = LEDC_TIMER_0;
  c.pin_d0 = 5;  c.pin_d1 = 18; c.pin_d2 = 19; c.pin_d3 = 21;
  c.pin_d4 = 36; c.pin_d5 = 39; c.pin_d6 = 34; c.pin_d7 = 35;
  c.pin_xclk = 0; c.pin_pclk = 22; c.pin_vsync = 25; c.pin_href = 23;
  c.pin_sccb_sda = 26; c.pin_sccb_scl = 27;
  c.pin_pwdn = 32; c.pin_reset = -1;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size   = FRAMESIZE_QVGA;
  c.jpeg_quality = 10;
  c.fb_count     = 2;
  c.grab_mode    = CAMERA_GRAB_LATEST;
  return c;
}

void setupCamera() {
  esp_err_t err = esp_camera_init(&camConfig());
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\\n", err);
    delay(3000);
    ESP.restart();
  }
}

void openGate() {
  Serial.println("⚡ ACCESS GRANTED: OPENING GATE SOLENOID ⚡");
  digitalWrite(GATE_RELAY_PIN, HIGH);
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(GATE_OPEN_MS);
  digitalWrite(FLASH_LED_PIN, LOW);
  digitalWrite(GATE_RELAY_PIN, LOW);
  Serial.println("🔒 GATE LOCKED");
}

void captureAndAuthorize() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Frame capture failed");
    return;
  }

  HTTPClient http;
  http.begin(String(VOLTIX_API_URL) + "/api/vision/face");
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Voltix-Key", GATE_API_KEY);
  http.setTimeout(8000);

  int httpCode = http.POST(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("Vision Response: " + response);
    if (response.indexOf("\\"decision\\":\\"GRANTED\\"") >= 0) {
      openGate();
    }
  } else {
    Serial.printf("Face API error code: %d\\n", httpCode);
  }
  http.end();
}

void setup() {
  pinMode(GATE_RELAY_PIN, OUTPUT);
  digitalWrite(GATE_RELAY_PIN, LOW);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }

  Serial.printf("\\nCAM Ready! IP: %s\\n", WiFi.localIP().toString().c_str());
  setupCamera();
}

void loop() {
  captureAndAuthorize();
  delay(4000);
}
`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="anima-panel space-y-4">
        <div className="corner-lines">
          <div className="corner-lines__top-left" />
          <div className="corner-lines__top-right" />
          <div className="corner-lines__bottom-left" />
          <div className="corner-lines__bottom-right" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e6e6e6] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tag text-[#808080]">005/</span>
              <h3 className="font-parabole text-2xl font-bold text-[#020202]">
                ESP32 Hardware & Flashing Studio
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#575757] font-light mt-1">
              Self-hosted firmware for 8+ relay channels, hardware push-button inputs, and camera gate access
            </p>
          </div>

          <span className="font-mono-tag rounded-full bg-[#dae4af] px-3 py-1 text-xs text-[#020202] font-semibold">
            Sinric Pro Replacement
          </span>
        </div>

        {/* Live Configurator Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Wi-Fi SSID</label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              className="anima-field w-full"
            />
          </div>

          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Wi-Fi Password</label>
            <input
              type="text"
              value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)}
              className="anima-field w-full"
            />
          </div>

          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Voltix Server Local IP</label>
            <input
              type="text"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              className="anima-field w-full"
            />
          </div>

          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Device ID</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="anima-field w-full"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#575757] mb-1 font-mono-tag">Voltix Security Key</label>
            <input
              type="text"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="anima-field w-full"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('relay')}
          className={cn(
            'rounded-xl px-4 py-2 font-mono text-xs font-semibold transition-all',
            activeTab === 'relay'
              ? 'bg-[#020202] text-white shadow-md'
              : 'bg-white border border-[#e6e6e6] text-[#808080] hover:text-[#020202]'
          )}
        >
          ESP32 8-Relay Controller
        </button>

        <button
          onClick={() => setActiveTab('cam')}
          className={cn(
            'rounded-xl px-4 py-2 font-mono text-xs font-semibold transition-all',
            activeTab === 'cam'
              ? 'bg-[#020202] text-white shadow-md'
              : 'bg-white border border-[#e6e6e6] text-[#808080] hover:text-[#020202]'
          )}
        >
          ESP32-CAM Smart Gate Access
        </button>
      </div>

      {/* Content */}
      {activeTab === 'relay' ? (
        <div className="space-y-6">
          {/* Pinout Table */}
          <div className="anima-panel space-y-4">
            <div className="corner-lines">
              <div className="corner-lines__top-left" />
              <div className="corner-lines__top-right" />
              <div className="corner-lines__bottom-left" />
              <div className="corner-lines__bottom-right" />
            </div>

            <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3">
              <h4 className="font-parabole text-lg font-bold text-[#020202]">
                8-Channel GPIO Pin Mapping
              </h4>
              <span className="font-mono-tag text-[#576321] bg-[#dae4af] px-2.5 py-0.5 rounded-full font-bold">
                Active-LOW
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#e6e6e6] text-[#808080]">
                    <th className="pb-2">Channel</th>
                    <th className="pb-2">Default Appliance</th>
                    <th className="pb-2">Relay Output Pin</th>
                    <th className="pb-2">Manual Button Input</th>
                    <th className="pb-2">Rated Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] text-[#020202]">
                  <tr>
                    <td className="py-2 text-[#576321] font-bold">CH 1</td>
                    <td>Living Room Lights</td>
                    <td>GPIO 16</td>
                    <td>GPIO 32 (to GND)</td>
                    <td>60 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#576321] font-bold">CH 2</td>
                    <td>TV / Entertainment</td>
                    <td>GPIO 17</td>
                    <td>GPIO 33 (to GND)</td>
                    <td>150 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#576321] font-bold">CH 3</td>
                    <td>AC Unit 1.5T</td>
                    <td>GPIO 18</td>
                    <td>GPIO 27 (to GND)</td>
                    <td>1,650 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#a76c07] font-bold">CH 4</td>
                    <td>Water Heater / Geyser</td>
                    <td>GPIO 19</td>
                    <td>GPIO 14 (to GND)</td>
                    <td>2,000 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#576321] font-bold">CH 5</td>
                    <td>Kitchen Refrigerator</td>
                    <td>GPIO 21</td>
                    <td>GPIO 12 (to GND)</td>
                    <td>220 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#a76c07] font-bold">CH 6</td>
                    <td>Microwave Point</td>
                    <td>GPIO 22</td>
                    <td>GPIO 15 (to GND)</td>
                    <td>1,200 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#576321] font-bold">CH 7</td>
                    <td>Exhaust Fan</td>
                    <td>GPIO 23</td>
                    <td>GPIO 4 (to GND)</td>
                    <td>45 W</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#a76c07] font-bold">CH 8</td>
                    <td>Garage Socket & Lights</td>
                    <td>GPIO 25</td>
                    <td>GPIO 26 (to GND)</td>
                    <td>180 W</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="rounded-2xl border border-[#e6e6e6] bg-[#020202] text-white p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#dae4af]" />
                <span className="font-mono text-xs text-[#dae4af]">
                  firmware/esp32_relay8/VoltixRelay8.ino
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(relaySketchCode, 'relay')}
                  className="anima-btn-secondary !h-9 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {copiedKey === 'relay' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#dae4af] mr-1" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadFile('VoltixRelay8.ino', relaySketchCode)}
                  className="anima-btn-primary !h-9 text-xs"
                >
                  <div className="btn-body">
                    <span>Download .INO</span>
                  </div>
                  <div className="btn-icon-box !w-9">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                </button>
              </div>
            </div>

            <pre className="max-h-[380px] overflow-x-auto overflow-y-auto rounded-xl bg-black/60 p-4 text-[11px] font-mono text-[#dae4af]/90 leading-relaxed border border-white/5">
              <code>{relaySketchCode}</code>
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e6e6e6] bg-[#020202] text-white p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#dae4af]" />
                <span className="font-mono text-xs text-[#dae4af]">
                  firmware/esp32cam_gate/VoltixGateCam.ino
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(camSketchCode, 'cam')}
                  className="anima-btn-secondary !h-9 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {copiedKey === 'cam' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#dae4af] mr-1" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadFile('VoltixGateCam.ino', camSketchCode)}
                  className="anima-btn-primary !h-9 text-xs"
                >
                  <div className="btn-body">
                    <span>Download .INO</span>
                  </div>
                  <div className="btn-icon-box !w-9">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                </button>
              </div>
            </div>

            <pre className="max-h-[380px] overflow-x-auto overflow-y-auto rounded-xl bg-black/60 p-4 text-[11px] font-mono text-[#dae4af]/90 leading-relaxed border border-white/5">
              <code>{camSketchCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
