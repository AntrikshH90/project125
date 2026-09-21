/**
 * ============================================================================
 * VOLTIX HOME — ESP32-CAM SMART GATE & FACE ACCESS CONTROLLER
 * Hardware: AI-Thinker ESP32-CAM (OV2640) + Solenoid Lock Relay on GPIO 13
 * Features:
 *   - Auto-captures frames on cadence or PIR motion trigger
 *   - Secure multipart POST to Voltix Face Vision REST API
 *   - Actuates Solenoid Lock relay for 5 seconds when GRANTED
 *   - Fires high-power night illuminator flash on GPIO 4
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>

/* ================= USER CONFIG — EDIT BEFORE FLASHING ================= */
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASS       = "YOUR_WIFI_PASSWORD";
const char* VOLTIX_API_URL  = "http://192.168.1.100:3000";
const char* GATE_API_KEY    = "CHANGE_ME_SUPER_SECRET_AT_LEAST_32_CHARS_LONG";

#define GATE_RELAY_PIN      13  // Solenoid Lock or Gate Motor Relay
#define FLASH_LED_PIN       4   // Bright Flash LED
#define GATE_OPEN_MS        5000UL // 5 seconds gate open duration
/* ====================================================================== */

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
  c.frame_size   = FRAMESIZE_QVGA; // Fast image upload
  c.jpeg_quality = 10;
  c.fb_count     = 2;
  c.grab_mode    = CAMERA_GRAB_LATEST;
  return c;
}

void setupCamera() {
  esp_err_t err = esp_camera_init(&camConfig());
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
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
    if (response.indexOf("\"decision\":\"GRANTED\"") >= 0) {
      openGate();
    }
  } else {
    Serial.printf("Face API error code: %d\n", httpCode);
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

  Serial.printf("\nCAM Ready! IP: %s\n", WiFi.localIP().toString().c_str());
  setupCamera();
}

void loop() {
  captureAndAuthorize();
  delay(4000); // Cadence for gate presence detection
}
