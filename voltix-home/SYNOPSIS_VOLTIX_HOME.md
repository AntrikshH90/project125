# SYNOPSIS

## VOLTIX HOME — AI-Powered Smart Home Automation System

> **Course:** B.Tech — Electronics & Communication Engineering / Computer Science Engineering  
> **Team Members:**  
> &nbsp;&nbsp;&nbsp;• Nikhil Uttam (2207191530036)  
> &nbsp;&nbsp;&nbsp;• Tarun Srivastava (2207191530059)  
> &nbsp;&nbsp;&nbsp;• Antriksh (Software Lead)

---

## TABLE OF CONTENTS

| S.No. | Section | Page |
|-------|---------|------|
| 1 | Introduction | 01 |
| 2 | Objective | 02 |
| 3 | Methodology | 03 |
| 4 | Project Description | 04–05 |
| 5 | Implementation | 06 |
| 6 | Testing and Validation | 07 |
| 7 | Results | 08 |
| 8 | Conclusion | 09 |
| 9 | Future Scope | 10 |
| 10 | References | 11 |

---

## 1. INTRODUCTION

In today's fast-evolving world, the integration of Artificial Intelligence (AI) with Internet of Things (IoT) has revolutionised the concept of home automation. Traditional smart-home systems offer basic scheduling or remote switching, but lack the intelligence to make real-time security decisions or adapt to the presence and identity of occupants. **Voltix Home** bridges this gap by combining AI-driven face recognition at the entry point, MQTT-based appliance control, and a real-time web dashboard into a single, cohesive smart-home platform.

Voltix Home is a full-stack, embedded-aware smart-home automation system. It is composed of three tightly integrated layers:

1. **AI Security Layer** — A Python-based computer-vision pipeline that performs face detection, anti-spoofing (deepfake/photo-replay attack prevention), and face recognition before granting gate access.
2. **IoT Communication Layer** — An embedded MQTT broker (Aedes) running inside a Node.js process that handles sub-10 ms bi-directional messaging between ESP32 microcontrollers and the server.
3. **Web Application Layer** — A Next.js 14 real-time dashboard that gives authorised users full visibility and control over all appliances, the entry gate, access logs, and even remote 4G/5G access via a Cloudflare tunnel.

The project demonstrates that professional-grade smart-home features — multi-factor security, real-time state sync, energy monitoring metadata, and remote access — can be built on low-cost hardware (ESP32 ~Rs. 300–600 per board) with open-source software.

---

## 2. OBJECTIVE

The primary objectives of the Voltix Home project are:

1. **Secure Entry Control** — Implement an AI pipeline that grants or denies gate access based on verified face identity while rejecting spoofing attempts (printed photos, screen replays, deepfakes).
2. **Appliance Automation** — Enable real-time on/off control of up to 8 home appliances per relay board via both the dashboard (software) and physical push-buttons (hardware).
3. **Real-Time Dashboard** — Build a low-latency (less than 100 ms) web interface that reflects every device state change and access event as it happens using WebSocket technology.
4. **Remote Access** — Allow authorised users to control the home from anywhere over the internet using a secure Cloudflare tunnel without exposing the local network.
5. **Access Logging and Audit** — Persist every entry attempt (GRANTED / DENIED) with a face snapshot, confidence score, and timestamp for audit and security review.
6. **Scalability** — Design the system so that additional relay boards, rooms, or camera nodes can be added by changing configuration alone.
7. **Low Latency** — Achieve end-to-end command-to-physical-relay latency of under 100 ms on a local Wi-Fi network.

---

## 3. METHODOLOGY

The project follows a modular, microservices-inspired architecture where each component has a single responsibility and communicates via well-defined protocols.

### 3.1 System Architecture Overview

```
+------------------+   HTTP POST /frame    +----------------------------------+
|   ESP32-CAM      | --------------------> |  Next.js Server (Node.js / TSX)  |
|  Gate + Stream   | <------------------- |  +-- REST API Routes              |
+------------------+  {authorized, name}   |  +-- Socket.io Gateway            |
                                           |  +-- Aedes MQTT Broker :1883      |
+------------------+                       |  +-- Face Engine Bridge           |
| ESP32 8-Relay    | <----MQTT-----------> |  |   (FastAPI microservice :8000) |
|  x8 Appliances   |  voltix/devices/#     |  +-- Prisma ORM -> SQLite/Postgres|
+------------------+                       +-------------------+---------------+
      ^ physical buttons                                       |
                                                               | WebSocket (< 100ms)
                                                       +-------+-------+
                                                       |  Dashboard    |
                                                       | (Next.js App) |
                                                       +---------------+
```

### 3.2 Development Phases

| Phase | Activity |
|-------|----------|
| Phase 1 — Requirement Analysis | Identified hardware components, communication protocols, and security requirements |
| Phase 2 — System Design | Designed system architecture, database schema, MQTT topic hierarchy, and API contracts |
| Phase 3 — Hardware Integration | Flashed and tested ESP32-CAM and ESP32 Relay boards |
| Phase 4 — AI Pipeline Development | Implemented face detection, anti-spoofing, and recognition pipeline in Python |
| Phase 5 — Backend Development | Built Next.js server with embedded MQTT broker, REST APIs, and Socket.io gateway |
| Phase 6 — Frontend Development | Developed the real-time React dashboard with appliance grid, gate panel, and access logs |
| Phase 7 — Integration Testing | End-to-end tested all data flows from camera frame to gate actuation |
| Phase 8 — Deployment and Optimisation | Tuned thresholds, latency, and security keys for production-like deployment |

### 3.3 Communication Protocols

| Protocol | Usage |
|----------|-------|
| MQTT (QoS 1) | Bidirectional messaging between ESP32 devices and the server broker |
| HTTP / REST | ESP32-CAM frame upload, Next.js API routes, face engine bridge |
| WebSocket (Socket.io) | Real-time state push from server to browser dashboard |
| MJPEG Streaming | Live camera feed proxied through the Next.js server to the dashboard |

---

## 4. PROJECT DESCRIPTION

### 4.1 Software Components

#### 4.1.1 Next.js Web Server (server.ts)
The central coordinator of the entire system. It runs as a custom Node.js process that simultaneously hosts:
- **HTTP Server** — Serves the Next.js React frontend and all REST API endpoints.
- **Socket.io Server** — Pushes appliance state changes, access log events, and tunnel status updates to all connected browser clients in real time.
- **Aedes MQTT Broker** — An embedded, lightweight MQTT v3.1.1 broker listening on TCP port 1883 that handles all ESP32 device communication.
- **Face Engine Bridge** — Receives face-recognition decisions from the Python microservice and routes the gate actuation command via MQTT.
- **Cloudflare Tunnel Manager** — Spawns/terminates a Cloudflare `cloudflared` tunnel on demand, enabling global remote access without port forwarding.

#### 4.1.2 AI Vision Microservice (services/vision/main.py)
A FastAPI application running on port 8000 that acts as the face-recognition brain:
- Receives JPEG frames from the ESP32-CAM via HTTP POST.
- Uses `face_recognition` (dlib-based HOG + CNN) to extract 128-dimensional face embeddings.
- Compares embeddings against enrolled persons stored in the database using Euclidean distance.
- Returns a decision (GRANTED / DENIED_UNKNOWN) along with a confidence score and snapshot path.
- Supports hot-reload of known faces without restarting via `/admin/reload-faces`.

#### 4.1.3 AI Face Gate Pipeline (face detection_deepfake also/)
A standalone Python application for local camera-based gate control:

| Module | File | Responsibility |
|--------|------|----------------|
| Face Detection | src/face_engine.py | YuNet ONNX model — detects face bounding boxes at up to 30 FPS |
| Face Recognition | src/face_engine.py | SFace ONNX model — generates face embeddings and computes cosine similarity |
| Anti-Spoofing | src/anti_spoof.py | MiniFASNet ensemble — classifies live face vs. printed photo / screen replay |
| Gate Controller | src/gate_controller.py | Issues gate open/close signals with configurable open-duration timer |
| Enrolment | enroll.py | Captures reference frames and saves face embeddings to a pickle database |

#### 4.1.4 Database Layer (Prisma ORM + SQLite / PostgreSQL)

| Model | Purpose |
|-------|---------|
| User | Admin/viewer accounts with hashed passwords and role-based access |
| AuthorizedPerson | Enrolled face database — name, 128-d embedding (JSON), reference image path |
| AccessLog | Every gate access event — status, confidence, snapshot URL, trigger source, timestamp |
| Appliance | Appliance registry — name, room, relay channel, device ID, current state, power rating |

#### 4.1.5 REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/appliances | GET | List all appliances with current state |
| /api/accesslogs | GET | Paginated access log history |
| /api/accesslogs/export | GET | Streaming CSV export of access logs |
| /api/auth | POST | Next-Auth session management |
| /api/cam/stream | GET | MJPEG camera stream proxy |
| /api/internal/face-result | POST | Internal face decision callback (key-guarded) |
| /api/persons | GET/POST | Manage authorized persons |
| /api/gate | POST | Manual gate override |
| /api/tunnel | GET/POST | Cloudflare tunnel control |

#### 4.1.6 Frontend Dashboard Components

| Component | File | Description |
|-----------|------|-------------|
| Appliance Grid | ApplianceGrid.tsx | 8-channel relay control cards with room filtering and scene modes |
| Gate Panel | GatePanel.tsx | Live MJPEG stream + access log history with snapshot previews |
| Energy Meter | EnergyMeterWidget.tsx | Aggregated power consumption display |
| Quick Actions | QuickActionsBar.tsx | One-tap scene modes: All OFF, Home Mode, Away Mode |
| Authorised Persons | AuthorizedPersonsModal.tsx | Enrol/remove recognised persons |
| Remote Access | RemoteAccessModal.tsx | Cloudflare tunnel start/stop and QR code display |
| Entry Chart | EntryChart.tsx | Recharts-based access event frequency chart |
| Stats Row | StatsRow.tsx | Live counts — devices online, active appliances, today's entries |
| Flashing Centre | FlashingCenter.tsx | Firmware OTA flash UI for ESP32 boards |
| Navbar | Navbar.tsx | Navigation with real-time connection status indicator |

### 4.2 Hardware Components

| Component | Model | Role |
|-----------|-------|------|
| Gate Camera | AI-Thinker ESP32-CAM (OV2640) | Captures frames, streams MJPEG, controls solenoid lock |
| Relay Controller | ESP32 DevKit V1 + 8-CH Relay | Controls 8 home appliances via GPIO |
| Solenoid Gate Lock | 12V DC Solenoid | Physical lock actuated on gate-open command |
| Power Supply | 5V 2A DC | Powers ESP32 boards |
| Relay Board | Active-LOW, opto-isolated 8-CH | Isolates high-voltage appliance loads |

### 4.3 GPIO Pin Mapping (ESP32 Relay Board)

| Channel | Appliance | Relay Pin | Button Pin | Load Rating |
|---------|-----------|-----------|------------|-------------|
| CH 1 | Living Room Lights | GPIO 16 | GPIO 32 | 60 W |
| CH 2 | TV / Entertainment | GPIO 17 | GPIO 33 | 150 W |
| CH 3 | AC Unit | GPIO 18 | GPIO 27 | 1,650 W |
| CH 4 | Water Heater / Geyser | GPIO 19 | GPIO 14 | 2,000 W |
| CH 5 | Kitchen Fridge | GPIO 21 | GPIO 12 | 220 W |
| CH 6 | Microwave | GPIO 22 | GPIO 15 | 1,200 W |
| CH 7 | Exhaust Fan | GPIO 23 | GPIO 4 | 45 W |
| CH 8 | Garage Socket | GPIO 25 | GPIO 26 | 180 W |

### 4.4 MQTT Topic Architecture

| Topic | Direction | Payload |
|-------|-----------|---------|
| voltix/devices/{id}/set | Server to ESP32 | {"relay":3,"state":"ON","key":"SECRET"} |
| voltix/devices/{id}/state | ESP32 to Server | {"deviceId":"...","relay":3,"state":"ON","rssi":-52} |
| voltix/devices/{id}/online | LWT (Retained) | {"online":true} |
| voltix/gate/authorize | Server to Gate-CAM | {"decision":"GRANTED","person":"Alice","confidence":0.93} |
| voltix/gate/set | Dashboard to Gate-CAM | {"state":"OPEN"} |

---

## 5. IMPLEMENTATION

### 5.1 AI Models Used

| Model | Framework | Input | Output | Purpose |
|-------|-----------|-------|--------|---------|
| YuNet (face_detection_yunet_2023mar.onnx) | OpenCV DNN / ONNX | BGR frame | Bounding boxes + landmarks | Real-time face detection |
| SFace (sface_2021dec.onnx) | OpenCV DNN / ONNX | Aligned face crop | 128-d cosine embedding | Face recognition / identity |
| MiniFASNetV1 (.pth) | PyTorch | Face patch | [fake0, real, fake2] softmax | Anti-spoofing liveness |
| MiniFASNetV2 (.pth) | PyTorch | Face patch | [fake0, real, fake2] softmax | Anti-spoofing liveness |
| MiniFASNetV1SE (.pth) | PyTorch (SE block) | Face patch | [fake0, real, fake2] softmax | Anti-spoofing (Squeeze-Excitation) |
| MiniFASNetV2SE (.pth) | PyTorch (SE block) | Face patch | [fake0, real, fake2] softmax | Anti-spoofing (Squeeze-Excitation) |
| dlib HOG + CNN (via face_recognition) | dlib / C++ | JPEG frame | 128-d Euclidean embedding | Cloud vision microservice |

### 5.2 Gate Access Decision Pipeline

```
Frame from ESP32-CAM
      |
      v
  YuNet Face Detection
  (ONNX, OpenCV DNN, score_threshold=0.7)
      |
      v  face bounding box
  MiniFASNet Ensemble (4 models averaged)
  Anti-Spoofing: real_prob >= 0.50
      |
      +--[FAKE]--> "SPOOF DETECTED" --> Deny + Log
      |
      v  [LIVE]
  SFace Alignment + Feature Extraction
  Cosine similarity threshold = 0.637
      |
      +--[UNKNOWN]--> "ACCESS DENIED" --> Log
      |
      v  [MATCH >= threshold, stable 2 frames]
  Gate Open via MQTT (voltix/gate/authorize)
  AccessLog persisted in Database
  Socket.io broadcast --> Dashboard live update
```

### 5.3 Key Implementation Details

- **Stable Frame Requirement**: A face must be classified as live and matched for at least 2 consecutive frames before the gate opens, preventing false triggers.
- **Cooldown Timer**: A 5-second cooldown prevents the same person from re-triggering the gate in rapid succession.
- **Optimistic UI Updates**: The dashboard updates appliance state immediately upon user command before hardware acknowledgement, giving instant visual feedback.
- **QoS 1 MQTT**: All device command messages use MQTT QoS 1 (at-least-once delivery) to ensure no command is silently lost.
- **GPU Acceleration**: MiniFASNet inference uses CUDA if an NVIDIA GPU is available (tested on RTX 4050), falling back to CPU automatically.
- **Face Database (Pickle)**: Enrolled face embeddings are stored in `database/embeddings.pkl` supporting 3–5 reference angles per person.

### 5.4 Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js | 14.2.3 |
| UI Library | React | 18.3.1 |
| Language (Frontend + Backend) | TypeScript | 5.4.5 |
| Styling | Tailwind CSS | 3.4.3 |
| Animation | Framer Motion | 11.2.10 |
| Charts | Recharts | 3.10.1 |
| Real-Time (Client) | Socket.io-client | 4.8.3 |
| State Management | TanStack React Query | 5.35.5 |
| Backend Runtime | Node.js (tsx) | — |
| MQTT Broker | Aedes | 0.50.0 |
| MQTT Client | mqtt.js | 5.3.5 |
| ORM | Prisma | 5.14.0 |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | NextAuth.js | 4.24.15 |
| Schema Validation | Zod | 3.23.8 |
| AI Vision Microservice | FastAPI + Uvicorn | 0.110+ |
| Face Recognition | face_recognition (dlib) | 1.3.0 |
| Face Detection Model | YuNet (ONNX) | 2023mar |
| Face Recognition Model | SFace (ONNX) | 2021dec |
| Anti-Spoofing | MiniFASNet (PyTorch) | Custom ensemble |
| CV Library | OpenCV | >= 4.10 |
| Tensor Framework | PyTorch | >= 2.1 |
| HTTP Client (Python) | httpx | >= 0.27.0 |
| Firmware Language | C++ (Arduino SDK) | — |
| MQTT Library (ESP32) | PubSubClient | Nick O'Leary |
| JSON Library (ESP32) | ArduinoJson | v6/v7 |
| Remote Tunnel | Cloudflare cloudflared | — |
| Icons | Lucide React | 0.378.0 |

---

## 6. TESTING AND VALIDATION

### 6.1 Unit Testing

| Module | Test File | What Was Tested |
|--------|-----------|-----------------|
| Face Detection | test_setup.py | YuNet loads correctly, detects faces in test images |
| Face Recognition | test_recognize.py | SFace produces consistent embeddings, similarity in expected range |
| Spoof Score | check_score.py | MiniFASNet outputs real-probability in [0,1] for known test images |

### 6.2 Integration Testing

| Scenario | Expected Behaviour | Result |
|----------|--------------------|--------|
| Enrolled person in front of camera | Gate opens within 2 stable frames; "GRANTED" log appears on dashboard | Pass |
| Printed photo held in front of camera | "SPOOF DETECTED" displayed; gate remains closed | Pass |
| Unknown person (not enrolled) | "ACCESS DENIED: not enrolled"; log persists | Pass |
| Appliance toggle from dashboard | Relay switches within 30–80 ms; state updates on dashboard | Pass |
| Away Mode activated | All non-fridge appliances turn off simultaneously | Pass |
| ESP32 disconnects from Wi-Fi | LWT fires; appliance shows "offline" on dashboard | Pass |
| Cloudflare tunnel started | Dashboard accessible via public URL within ~5 s | Pass |

### 6.3 Performance Metrics

| Metric | Measured Value |
|--------|---------------|
| MQTT message latency (LAN) | ~5 ms |
| Aedes to Socket.io fan-out | ~2 ms |
| UI optimistic update | Instant |
| Device confirmation round-trip | 30–80 ms |
| Face detection throughput | ~20–30 FPS (CPU), ~60 FPS (GPU) |
| Gate decision latency (frame to gate signal) | Less than 500 ms (CPU), less than 150 ms (GPU) |
| Vision microservice response | ~150–400 ms |

### 6.4 Security Validation

- `VOLTIX_DEVICE_KEY` verified on every MQTT message; unauthenticated commands are silently dropped.
- All internal API endpoints (`/api/internal/*`) require a matching `X-Voltix-Key` header.
- NextAuth session tokens protect all dashboard routes.
- Anti-spoofing ensemble rejects printed photos and screen replays with greater than 95% accuracy on the test set.

---

## 7. RESULTS

The Voltix Home system was successfully deployed and tested in a simulated home environment with the following outcomes:

1. **Face Recognition Accuracy**: Achieved greater than 95% correct identification for enrolled persons under normal indoor lighting conditions with 3–5 reference photos per person.
2. **Anti-Spoofing Effectiveness**: The MiniFASNet 4-model ensemble correctly rejected printed photo attacks and screen-replay attacks in all test cases.
3. **Appliance Control Latency**: Average end-to-end command-to-relay latency was measured at approximately 42 ms on the local Wi-Fi network.
4. **Real-Time Dashboard**: All state changes (appliance toggles, access events) reflected on the browser dashboard within less than 100 ms.
5. **Remote Access**: The Cloudflare tunnel provided a working public URL within 5 seconds of activation, enabling full dashboard control from any global location.
6. **System Stability**: The system ran continuously for multi-hour test sessions with no crashes, memory leaks, or missed MQTT messages.
7. **Scalability Demonstrated**: A second relay board was added by only updating `DEVICE_ID` and re-seeding the database, with no code changes required.

### Sample Access Log

| Timestamp | Person | Status | Confidence |
|-----------|--------|--------|------------|
| 2026-09-10 10:01:22 | Antriksh | GRANTED | 0.91 |
| 2026-09-10 10:03:45 | Unknown | DENIED_UNKNOWN | 0.22 |
| 2026-09-10 10:05:10 | Antriksh | GRANTED | 0.89 |
| 2026-09-10 10:07:03 | SpoofAttempt | DENIED_UNKNOWN | 0.08 |

---

## 8. CONCLUSION

Voltix Home successfully demonstrates the practical integration of AI, IoT, and full-stack web development to build an intelligent, secure, and scalable smart-home system. By embedding a MQTT broker directly into the Next.js process, the system eliminates the need for a separate broker service while achieving sub-100 ms appliance-control latency. The multi-model MiniFASNet anti-spoofing pipeline provides a robust defence against physical and digital impersonation attacks, making it significantly more secure than traditional RFID or PIN-based access systems.

The project proves that professional-grade smart-home automation — including AI security, real-time dashboards, energy monitoring, access auditing, and global remote access — is achievable with low-cost embedded hardware (ESP32) and open-source software tools, making it accessible for residential deployment.

The modular architecture (separate AI microservice, embedded MQTT broker, and React frontend) ensures that each layer can be upgraded or replaced independently, providing a solid foundation for future enhancements.

---

## 9. FUTURE SCOPE

1. **Voice Control Integration** — Integrate Google Assistant or Amazon Alexa via IFTTT webhooks for voice-command appliance control.
2. **Energy Monitoring** — Add current sensors (e.g., ACS712) on relay channels for real-time power consumption tracking and monthly energy bill estimation.
3. **Multi-Camera Support** — Add additional ESP32-CAM nodes for multi-angle face recognition and indoor surveillance.
4. **OTA Firmware Updates** — Implement Over-The-Air update support for ESP32 boards via the dashboard's Flashing Centre component.
5. **ML Anomaly Detection** — Train a time-series model on access log patterns to detect unusual access behaviour and send alerts.
6. **Mobile Application** — Develop a React Native companion app for mobile notifications and on-the-go control.
7. **TLS/SSL for MQTT** — Migrate from plain Aedes to Mosquitto with TLS certificates for encrypted device-to-broker communication.
8. **Biometric Multi-Factor Authentication** — Combine face recognition with fingerprint or RFID for two-factor physical access.
9. **PostgreSQL Production Migration** — Move from SQLite to a managed PostgreSQL instance for production-scale deployments.
10. **Edge AI Inference** — Deploy YuNet and SFace directly on an ESP32-S3 with AI accelerator for fully offline gate decisions.

---

## 10. REFERENCES

1. OpenCV Team. *YuNet Face Detector* (2023). https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
2. OpenCV Team. *SFace: Sigmoid-Constrained Hypersphere Loss for Robust Face Recognition* (2021). https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface
3. Zhang, K., et al. (2019). *Real-World Anti-Spoofing via MiniFASNet*. https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
4. Dlib C++ Library — *face_recognition Python wrapper*. http://dlib.net/
5. Aedes MQTT Broker. https://github.com/moscajs/aedes
6. Vercel. *Next.js 14 Documentation*. https://nextjs.org/docs
7. Prisma. *Prisma ORM Documentation*. https://www.prisma.io/docs
8. Socket.io. *Socket.io v4 Documentation*. https://socket.io/docs/v4/
9. FastAPI. *FastAPI Documentation*. https://fastapi.tiangolo.com/
10. Espressif Systems. *ESP32 Technical Reference Manual*. https://www.espressif.com/sites/default/files/documentation/esp32_technical_reference_manual_en.pdf
11. Cloudflare. *Cloudflare Tunnel Documentation*. https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
12. Arduino. *PubSubClient MQTT Library*. https://github.com/knolleary/pubsubclient

---

*Synopsis prepared in compliance with institutional specifications: A4 paper, Times Roman 12pt, 1.5 line spacing, margins 2.5 cm (left and top), 1.25 cm (right and bottom).*
