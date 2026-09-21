/**
 * Voltix Home — ESP32-CAM Gate Controller
 * Captures a frame on demand/P motion, POSTs it to the Voltix Face API,
 * opens gate (solenoid relay on GPIO13) when GRANTED.
 *
 * Board: AI Thinker ESP32-CAM. Tested with Arduino framework (esp32 core 2.0.14+).
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS, VOLTIX_API_URL, GATE_API_KEY

/* ---------- CONFIG (edit before flashing) ---------- */
#define GATE_RELAY_PIN   13
#define FLASH_LED_PIN    4
#define GATE_OPEN_MS     5000UL
#define API_TIMEOUT_MS   10000UL

static camera_config_t camConfig() {
  camera_config_t c{};
  c.ledc_channel = LEDC_CHANNEL_0; c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = 5; c.pin_d1 = 18; c.pin_d2 = 19; c.pin_d3 = 21;
  c.pin_d4 = 36; c.pin_d5 = 39; c.pin_d6 = 34; c.pin_d7 = 35;
  c.pin_xclk = 0; c.pin_pclk = 22; c.pin_vsync = 25; c.pin_href = 23;
  c.pin_sccb_sda = 26; c.pin_sccb_scl = 27;
  c.pin_pwdn = 32; c.pin_reset = -1;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size   = FRAMESIZE_QVGA;      // small enough for fast HTTP upload
  c.jpeg_quality = 12;
  c.fb_count     = 2; c.grab_mode = CAMERA_GRAB_LATEST;
  return c;
}

void setupCamera() {
  if (psramFound()) {}                 // QVGA works with or without PSRAM
  esp_err_t err = esp_camera_init(&camConfig());
  if (err != ESP_OK) { Serial.printf("CAM init failed 0x%x\n", err); delay(3000); ESP.restart(); }
}

void openGate() {
  Serial.println("GATE OPEN");
  digitalWrite(GATE_RELAY_PIN, HIGH);
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(GATE_OPEN_MS);                 // blocking is fine here (single action device)
  digitalWrite(FLASH_LED_PIN, LOW);
  digitalWrite(GATE_RELAY_PIN, LOW);
}

void scanAndSubmit() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) { Serial.println("Frame grab failed"); return; }

  digitalWrite(FLASH_LED_PIN, HIGH);   // flash for better exposure during capture window

  HTTPClient http;
  http.setConnectTimeout(API_TIMEOUT_MS);
  http.begin(String(VOLTIX_API_URL) + "/api/vision/face");
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Voltix-Key", GATE_API_KEY);
  int code = http.POST(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  if (code == 200) {
    String body = http.getString();    // {"decision":"GRANTED","person":"Alice","confidence":0.93}
    Serial.println("API: " + body);
    if (body.indexOf("\"decision\":\"GRANTED\"") >= 0) openGate();
  } else {
    Serial.printf("Face API error %d\n", code);
  }
  http.end();
}

void setup() {
  pinMode(GATE_RELAY_PIN, OUTPUT); digitalWrite(GATE_RELAY_PIN, LOW);
  pinMode(FLASH_LED_PIN, OUTPUT);
  Serial.begin(115200);
  WiFi.mode(WIFI_STA); WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(250); Serial.print("."); }
  Serial.printf("\nCAM ready, IP: %s\n", WiFi.localIP().toString().c_str());
  setupCamera();
}

void loop() {
  // Stream server (port 81) can run concurrently via WEB_server sketch or separate task.
  scanAndSubmit();
  delay(4000);                         // retry cadence / PIR interrupt would wake sooner
}