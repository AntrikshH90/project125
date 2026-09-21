# Voltix Home — Hardware Flashing & Wiring Guide

This directory contains the firmware sketches for:
1. **ESP32 8-Channel Relay Module** (`esp32_relay8/`): Self-hosted Sinric Pro replacement supporting 8+ appliances with physical push button fallback.
2. **ESP32-CAM Gate Controller** (`esp32cam_gate/`): Smart gate camera with face recognition and solenoid lock trigger.

---

## 1. ESP32 8-Relay Appliance Controller (Sinric Pro Replacement)

### Hardware Requirements:
- ESP32 DevKit V1 (30 or 38 pin)
- 8-Channel Relay Module (Active LOW, 5V/12V with optocoupler isolation)
- 8x Push Buttons / Wall Switches (optional, for manual physical override)
- 5V 2A DC Power Supply

### Pinout Mapping:

| Channel | Appliance | Relay Pin (ESP32) | Push Button Pin (to GND) | Load Rating |
|---|---|---|---|---|
| **CH 1** | Living Room Lights | **GPIO 16** | **GPIO 32** | 60 W |
| **CH 2** | TV / Entertainment | **GPIO 17** | **GPIO 33** | 150 W |
| **CH 3** | AC Unit | **GPIO 18** | **GPIO 27** | 1,650 W |
| **CH 4** | Water Heater / Geyser | **GPIO 19** | **GPIO 14** | 2,000 W |
| **CH 5** | Kitchen Fridge | **GPIO 21** | **GPIO 12** | 220 W |
| **CH 6** | Microwave Point | **GPIO 22** | **GPIO 15** | 1,200 W |
| **CH 7** | Exhaust Fan | **GPIO 23** | **GPIO 4** | 45 W |
| **CH 8** | Garage Socket / Lights | **GPIO 25** | **GPIO 26** | 180 W |

### Flashing via Arduino IDE:
1. Install **ESP32 Board Package** in Arduino IDE (`Boards Manager` ➔ search `esp32` by Espressif).
2. Install Required Libraries via Library Manager (`Ctrl + Shift + I`):
   - `PubSubClient` (by Nick O'Leary)
   - `ArduinoJson` (v6 or v7 by Benoit Blanchon)
3. Open `firmware/esp32_relay8/VoltixRelay8.ino`.
4. Update `WIFI_SSID`, `WIFI_PASS`, `MQTT_BROKER` (your PC's local IP), and `SECRET_KEY`.
5. Select Board: `DOIT ESP32 DEVKIT V1` or `ESP32 Dev Module`.
6. Connect ESP32 via Micro-USB and hit **Upload**.

---

## 2. ESP32-CAM Smart Gate Access Controller

### Hardware Requirements:
- AI-Thinker ESP32-CAM board with OV2640 camera
- FTDI USB-to-TTL Serial Programmer (3.3V / 5V)
- 5V Relay Module (connected to Solenoid Door Lock / Magnetic Lock)
- 12V Solenoid Gate Lock + 12V 2A DC Adapter

### Wiring Diagram:

| ESP32-CAM Pin | Connection Target |
|---|---|
| **5V** | 5V Power Supply (≥2A) |
| **GND** | Power Supply GND + FTDI GND |
| **U0R (GPIO 3)** | FTDI TX |
| **U0T (GPIO 1)** | FTDI RX |
| **GPIO 13** | Relay IN (Gate Solenoid Trigger) |
| **GPIO 4** | Flash LED (Integrated) |
| **IO0** | Connect to **GND during flashing**, disconnect for normal boot |

### Flashing via Arduino IDE:
1. Open `firmware/esp32cam_gate/VoltixGateCam.ino`.
2. Connect **IO0 to GND** on the ESP32-CAM.
3. Plug in the FTDI programmer.
4. Select Board: `AI Thinker ESP32-CAM`.
   - CPU Frequency: `240MHz`
   - Flash Frequency: `80MHz`
   - Flash Mode: `QIO`
   - Partition Scheme: `Huge APP (3MB No OTA/1MB SPIFFS)`
5. Click **Upload**.
6. When done, **disconnect IO0 from GND** and press the **RST** button.

---

## 3. MQTT Topics Reference

| Topic | Direction | Payload Example |
|---|---|---|
| `voltix/devices/voltix-relay-01/set` | Server ➔ ESP32 | `{"relay": 3, "state": "ON", "key": "YOUR_KEY"}` |
| `voltix/devices/voltix-relay-01/state` | ESP32 ➔ Server | `{"deviceId": "voltix-relay-01", "relay": 3, "state": "ON", "rssi": -54}` |
| `voltix/devices/voltix-relay-01/online` | LWT (Retained) | `{"online": true}` |
| `voltix/gate/set` | Server ➔ Gate | `{"state": "OPEN"}` |
