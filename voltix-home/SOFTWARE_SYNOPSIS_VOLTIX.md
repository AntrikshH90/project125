# SOFTWARE SYNOPSIS — VOLTIX HOME
## Software Engineering Contribution Document

> **Project:** Voltix Home — AI-Powered Smart Home Automation System  
> **Author:** Antriksh (Software Lead)  
> **Role in Team:** Full-Stack Software Development, AI Pipeline Integration, Database Design  
> **Note:** This document covers **software contributions only**. Hardware firmware and wiring details are maintained by the hardware team.

---

## TABLE OF CONTENTS

| S.No. | Section |
|-------|---------|
| 1 | Software Overview & Architecture |
| 2 | Technology Stack |
| 3 | AI & Machine Learning Pipeline |
| 4 | Backend — Node.js Server & MQTT Broker |
| 5 | Database Design (Prisma ORM) |
| 6 | REST API Reference |
| 7 | Real-Time Communication (Socket.io) |
| 8 | Frontend — React Dashboard |
| 9 | Security Design |
| 10 | Testing & Validation |
| 11 | System Data Flow |
| 12 | Deployment & Configuration |
| 13 | Performance Benchmarks |

---

## 1. SOFTWARE OVERVIEW & ARCHITECTURE

Voltix Home is a three-tier software system:

```
+----------------------------------------------------------+
|                    TIER 1 — FRONTEND                      |
|    Next.js 14 React App (TypeScript + Tailwind CSS)       |
|    Real-time updates via Socket.io-client                  |
+----------------------------+-----------------------------+
                             |  WebSocket + REST
+----------------------------v-----------------------------+
|                    TIER 2 — BACKEND SERVER               |
|    Custom Node.js server (server.ts)                      |
|    +-------------------+  +---------------------------+   |
|    | Aedes MQTT Broker |  | Socket.io Gateway         |   |
|    | (port 1883)       |  | (WebSocket push to UI)    |   |
|    +-------------------+  +---------------------------+   |
|    +-------------------+  +---------------------------+   |
|    | Next.js API Routes|  | Face Engine Bridge        |   |
|    | (REST endpoints)  |  | (callback from Python)    |   |
|    +-------------------+  +---------------------------+   |
|    +-------------------+  +---------------------------+   |
|    | Cloudflare Tunnel |  | Prisma ORM                |   |
|    | Manager           |  | (DB queries)              |   |
|    +-------------------+  +---------------------------+   |
+----------------------------+-----------------------------+
                             |
+----------------------------v-----------------------------+
|                    TIER 3 — DATA & AI                    |
|    +------------------+    +------------------------+    |
|    | SQLite / Postgres|    | FastAPI Vision Service |    |
|    | (via Prisma ORM) |    | (port 8000 — Python)   |    |
|    +------------------+    +------------------------+    |
|                            | face_recognition + dlib|    |
|                            | YuNet + SFace + MiniFAS|    |
|                            +------------------------+    |
+----------------------------------------------------------+
```

### Key Software Design Principles
- **Single process, multiple servers**: The MQTT broker, HTTP server, and Socket.io all run inside one Node.js process (`server.ts`), minimising operational complexity.
- **Microservice for AI**: The computationally heavy face recognition runs as a separate FastAPI Python process, allowing independent scaling and GPU utilisation without blocking Node.js.
- **Event-driven architecture**: MQTT messages from hardware devices trigger database updates and real-time UI broadcasts via Socket.io — no polling anywhere.
- **Type safety throughout**: TypeScript is used end-to-end in the Node.js/Next.js layer; Zod validates all environment variables at startup.

---

## 2. TECHNOLOGY STACK

### 2.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.3 | React framework with App Router, SSR, and API routes |
| React | 18.3.1 | UI component library |
| TypeScript | 5.4.5 | Static typing for reliability and IDE support |
| Tailwind CSS | 3.4.3 | Utility-first CSS framework |
| Framer Motion | 11.2.10 | Smooth UI animations and transitions |
| Recharts | 3.10.1 | Declarative chart library for access event visualisation |
| Socket.io-client | 4.8.3 | WebSocket client for real-time state updates |
| TanStack React Query | 5.35.5 | Server state management and caching |
| Lucide React | 0.378.0 | Icon library |
| Radix UI | 1.0.2 | Accessible headless UI primitives |
| clsx + tailwind-merge | 2.1.1 / 2.3.0 | Conditional class name management |

### 2.2 Backend (Node.js)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js + tsx | — / 4.11.0 | Runtime with TypeScript execution (no compile step needed) |
| Next.js API Routes | 14.2.3 | REST endpoints collocated with frontend |
| Socket.io (Server) | 4.7.5 | Real-time bidirectional push to browser clients |
| Aedes | 0.50.0 | Embedded MQTT v3.1.1 broker |
| mqtt.js | 5.3.5 | MQTT client connecting server to its own embedded broker |
| NextAuth.js | 4.24.15 | Authentication with session management |
| Prisma Client | 5.14.0 | Type-safe ORM for database operations |
| Zod | 3.23.8 | Runtime environment variable validation |
| cross-env | 7.0.3 | Cross-platform environment variable injection |

### 2.3 AI / Machine Learning (Python)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.10+ | Runtime for all AI services |
| FastAPI | >= 0.110.0 | High-performance async REST framework for vision microservice |
| Uvicorn | >= 0.29.0 | ASGI server running the FastAPI app |
| face_recognition | 1.3.0 | dlib-based 128-d face embedding and matching |
| OpenCV (cv2) | >= 4.10, < 5 | Video capture, image processing, YuNet/SFace ONNX inference |
| PyTorch | >= 2.1 | MiniFASNet anti-spoofing model inference (CUDA / CPU) |
| NumPy | >= 1.24, < 3 | Numerical operations on embeddings and image tensors |
| httpx | >= 0.27.0 | Async HTTP client (Python vision service calls Next.js callback) |

### 2.4 Database

| Technology | Role |
|-----------|------|
| SQLite | Development database (zero-config, file-based) |
| PostgreSQL | Production database (for nightly backups, concurrent access) |
| Prisma ORM 5.14 | Schema definition, migrations, type-safe queries |

### 2.5 DevOps / Tooling

| Tool | Purpose |
|------|---------|
| ESLint 8.57 | Code linting |
| PostCSS + Autoprefixer | CSS processing |
| prisma generate | Auto-generates TypeScript client from schema |
| Cloudflare cloudflared | Secure tunnel for remote access without port forwarding |

---

## 3. AI & MACHINE LEARNING PIPELINE

This is the core software innovation of the project. Three computer-vision models are composed into a sequential pipeline before any gate access is granted.

### 3.1 Model Inventory

| Model Name | File | Framework | Input Size | Output |
|------------|------|-----------|-----------|--------|
| YuNet | face_detection_yunet_2023mar.onnx | OpenCV DNN (ONNX Runtime) | Dynamic (set per frame) | Bounding boxes, 5 facial landmarks, score |
| SFace | sface_2021dec.onnx | OpenCV DNN (ONNX Runtime) | Aligned face crop | 128-dimensional cosine embedding vector |
| MiniFASNetV1 | models/anti_spoof/*.pth | PyTorch | Variable patch (h x w) | 3-class softmax: [fake_type0, real, fake_type2] |
| MiniFASNetV2 | models/anti_spoof/*.pth | PyTorch | Variable patch (h x w) | 3-class softmax |
| MiniFASNetV1SE | models/anti_spoof/*.pth | PyTorch (Squeeze-Excitation) | Variable patch | 3-class softmax |
| MiniFASNetV2SE | models/anti_spoof/*.pth | PyTorch (Squeeze-Excitation) | Variable patch | 3-class softmax |
| dlib HOG + CNN | (via face_recognition library) | dlib/C++ | JPEG image | 128-d Euclidean embedding vector |

### 3.2 Pipeline — Step by Step

#### Step 1: Face Detection (YuNet)

```python
# face_engine.py — FaceEngine class
self.detector = cv2.FaceDetectorYN.create(
    "models/face_detection_yunet_2023mar.onnx",
    "", (320, 320),
    score_threshold=0.7,   # confidence filter
    nms_threshold=0.3      # non-maximum suppression
)
_, faces = self.detector.detect(bgr_frame)
face = max(faces, key=lambda f: f[2] * f[3])  # select largest face
```

- Runs at 20–60 FPS depending on hardware.
- Returns bounding box [x, y, w, h] + 5 landmark points per detected face.

#### Step 2: Anti-Spoofing — Liveness Check (MiniFASNet Ensemble)

```python
# anti_spoof.py — AntiSpoofPredict class
# Loads ALL .pth files from models/anti_spoof/ directory
# Runs inference with each model, averages softmax probabilities
prediction = np.zeros(3, dtype=np.float32)
for model, h_input, w_input, scale in self.models:
    patch = CropImage.crop(image_bgr, bbox, scale, w_input, h_input)
    tensor = torch.from_numpy(patch.astype(np.float32))
    tensor = tensor.permute(2, 0, 1).unsqueeze(0).to(self.device)
    logits = model(tensor)
    prediction += F.softmax(logits, dim=1).cpu().numpy()[0]
probs = prediction / len(self.models)
label = np.argmax(probs)   # 1 = real face
real_prob = float(probs[1])
is_live = (label == 1) and (real_prob >= 0.50)  # configurable threshold
```

- **Label 1** = real live face → proceed to recognition.
- **Label 0 or 2** = fake (printed photo or screen replay) → deny immediately.
- 4-model ensemble averaging makes the classifier harder to fool.

#### Step 3: Face Recognition (SFace)

```python
# face_engine.py — FaceEngine.identify()
aligned = self.recognizer.alignCrop(bgr, face_row.reshape(1, -1))
feat = self.recognizer.feature(aligned)          # 128-d embedding
for name, enrolled_feats in self.known.items():
    for f in enrolled_feats:
        sim = self.recognizer.match(feat, f.reshape(1, -1))  # cosine similarity
        if sim > best_sim:
            best_sim, best_name = sim, name
if best_sim >= 0.637:   # configurable match threshold
    return best_name, best_sim
return "Unknown", best_sim
```

- Cosine similarity of **0.637** corresponds approximately to a Euclidean distance of **0.363** — standard for SFace.
- Multiple reference embeddings per person are all compared; best match wins.

#### Step 4: Gate Decision + Stable Frame Gate

```python
# main.py
if is_live:
    live_hits += 1
    name, dist = engine.identify(frame, face)
    authorized = name != "Unknown"
    if authorized and live_hits >= 2 and time.time() - last_grant > 5.0:
        gate.request(name, True, spoof_score, dist)
        last_grant = time.time()
```

- **Minimum 2 consecutive live+matched frames** required before gate opens (prevents flickering decisions).
- **5-second cooldown** after each GRANT.
- Results broadcast via MQTT and persisted to database.

### 3.3 Vision Microservice (FastAPI) — Alternate Flow

For the ESP32-CAM network path (frames arrive via HTTP):

```
ESP32-CAM
  |
  | HTTP POST JPEG to /api/vision/face
  v
FastAPI Vision Service (port 8000)
  1. face_recognition.face_locations(img)   -- dlib HOG detector
  2. face_recognition.face_encodings(img)   -- 128-d dlib embedding
  3. np.linalg.norm(KNOWN_ENCODINGS - face_enc)  -- Euclidean distance
  4. conf = 1.0 - best_distance
  5. granted = (distance < 0.42) AND (conf >= 0.82)
  |
  | HTTP POST result to Next.js /api/internal/face-result
  v
Next.js Backend
  - Persist AccessLog to database
  - Publish MQTT voltix/gate/authorize
  - Socket.io broadcast to dashboard
```

### 3.4 Face Enrolment Workflow

```python
# enroll.py
engine = FaceEngine()
cam = cv2.VideoCapture(0)
# ... capture frame
faces = engine.detect(frame)
face = engine.largest_face(faces)
engine.enroll(frame, face, name="PersonName")
# saves embedding to database/embeddings.pkl
```

The FastAPI service exposes a `/enroll` endpoint for network-based enrolment, and `/admin/reload-faces` for hot-reloading without restart.

---

## 4. BACKEND — NODE.JS SERVER & MQTT BROKER

### 4.1 server.ts — Single-Process Multi-Server Design

The entire backend runs as **one Node.js process** (`tsx watch server.ts`), hosting four simultaneous servers:

```
server.ts
  |
  +-- createServer()         → HTTP server (Next.js + API routes)
  |        |
  |        +-- SocketIOServer → WebSocket push to browser
  |
  +-- Aedes + net.createServer() → TCP MQTT broker on :1883
  |
  +-- mqtt.connect()         → Internal MQTT client (server subscribes to its own broker)
  |
  +-- registerMqttHandlers() → Business logic for device messages
  |
  +-- registerBridge()       → REST-to-MQTT bridge for face result callback
  |
  +-- startCloudflareTunnel() (on demand) → Cloudflare tunnel manager
```

### 4.2 MQTT Message Handling (lib/mqtt-handlers.ts)

The server subscribes to `voltix/#` and routes messages by topic:

```typescript
aedes.subscribe('voltix/#', (packet, done) => {
  const topic = packet.topic;

  // Appliance state update from ESP32
  if (topic.match(/^voltix\/devices\/([^/]+)\/state$/)) {
    const data = JSON.parse(packet.payload.toString());
    await prisma.appliance.update({ where: {...}, data: { currentState: data.state === 'ON' }});
    io.emit('appliance:state', { id: appliance.id, state: ... });
  }

  // Device online/offline heartbeat (Last Will and Testament)
  if (topic.match(/^voltix\/devices\/([^/]+)\/online$/)) {
    await prisma.appliance.updateMany({ where: { deviceId }, data: { online } });
    io.emit('device:lwt', { deviceId, online });
  }
});
```

### 4.3 Socket.io Event Catalogue

| Event (Server → Client) | Payload | Trigger |
|--------------------------|---------|---------|
| `appliance:state` | `{id, state}` | Device reports state change via MQTT |
| `device:lwt` | `{deviceId, online}` | LWT packet received (device disconnect) |
| `access:newlog` | Full AccessLog object with Person | Face scan decision processed |
| `tunnel:state` | `{active, url, status}` | Tunnel started, stopped, or changed |

| Event (Client → Server) | Payload | Action |
|--------------------------|---------|--------|
| `appliance:set` | `{id, state}` | Toggle a single appliance relay |
| `appliance:batch` | `{action: 'ALL_OFF' \| 'ALL_ON' \| 'AWAY_MODE' \| 'HOME_MODE'}` | Scene mode execution |
| `gate:override` | — | Manual gate open from dashboard |
| `tunnel:toggle` | `{action: 'start' \| 'stop'}` | Start or stop Cloudflare tunnel |

### 4.4 Face Engine Bridge (lib/face-bridge.ts)

Connects the Python microservice's HTTP callback to the MQTT + Socket.io output chain:

```
POST /api/internal/face-result  (from FastAPI Python service)
  |  (protected by X-Voltix-Key header)
  v
face-bridge.ts
  → calls handleFaceRecognition(decision)
  → if GRANTED: publishGateAuthorize() via MQTT
  → prisma.accessLog.create()
  → io.emit('access:newlog', log)
```

### 4.5 Cloudflare Tunnel Manager (lib/tunnel-manager.ts)

- Spawns `cloudflared tunnel --url http://localhost:{port}` as a child process.
- Parses stdout to extract the public URL using regex.
- Emits `tunnel:state` updates to all connected dashboard clients via Socket.io.
- Handles process cleanup on stop.

---

## 5. DATABASE DESIGN (PRISMA ORM)

### 5.1 Schema (prisma/schema.prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("ADMIN")   // ADMIN, VIEWER
  createdAt    DateTime @default(now())
}

model AuthorizedPerson {
  id                 String      @id @default(cuid())
  name               String
  embedding          String      // JSON stringified 128-d float array
  referenceImagePath String      // /public/snapshots/ref/...
  createdAt          DateTime    @default(now())
  accessLogs         AccessLog[]
}

model AccessLog {
  id            String            @id @default(cuid())
  timestamp     DateTime          @default(now())
  personId      String?
  person        AuthorizedPerson? @relation(fields: [personId], references: [id])
  status        String            // GRANTED | DENIED_UNKNOWN | DENIED_LOW_CONFIDENCE
  confidence    Float             @default(0)
  snapshotUrl   String
  triggerSource String            @default("FACE_SCAN")  // FACE_SCAN | MANUAL_OVERRIDE
  @@index([timestamp(sort: Desc)])
}

model Appliance {
  id           String   @id @default(cuid())
  deviceId     String
  relayChannel Int      // 0–7
  name         String
  room         String   // LIVING_ROOM | KITCHEN | BEDROOM | GARAGE | OUTDOOR
  currentState Boolean  @default(false)
  online       Boolean  @default(false)
  powerWatts   Float    @default(0)
  updatedAt    DateTime @updatedAt
  @@unique([deviceId, relayChannel])
}
```

### 5.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `embedding` stored as JSON String | Avoids needing pgvector extension; sufficient for household-scale enrolments (< 100 persons) |
| `@@unique([deviceId, relayChannel])` | Prevents duplicate channel registration; used as natural composite key for MQTT routing |
| `@@index([timestamp(sort: Desc)])` on AccessLog | Optimises paginated access log queries (most-recent first) |
| `triggerSource` field | Distinguishes automated face scans from manual dashboard overrides for audit purposes |
| SQLite (dev) + PostgreSQL (prod) | Dev: zero-config setup. Prod: full ACID compliance, pg_dump backup, concurrent writes |

### 5.3 Seeding (prisma/seed.ts)

Seeds 8 appliance records mapped to GPIO channels, one admin user, and configures relay-channel to room mappings.

---

## 6. REST API REFERENCE

All routes are Next.js App Router API routes under `app/api/`.

### GET /api/appliances
Returns all appliances with current state and online status. Used by the ApplianceGrid component on mount.

### GET /api/accesslogs
- **Query params**: `page`, `limit`, `status` (optional filter)
- Returns paginated access log entries with joined person name and snapshot URL.

### GET /api/accesslogs/export
- Streams a CSV file of all access logs.
- Response header: `Content-Type: text/csv; charset=utf-8`

### GET /api/cam/stream
- Proxies the MJPEG stream from the ESP32-CAM.
- Returns `Content-Type: multipart/x-mixed-replace; boundary=frame`

### POST /api/internal/face-result *(internal, key-guarded)*
- Receives recognition result from the Python FastAPI service.
- Header required: `X-Voltix-Key: {VOLTIX_DEVICE_KEY}`
- Payload: `{decision, personId, personName, confidence, snapshot}`
- Triggers AccessLog creation + Socket.io broadcast + MQTT gate command.

### GET/POST /api/persons
- GET: Returns list of all AuthorizedPersons.
- POST: Enrols a new person (name + reference image upload + embedding computation).

### POST /api/gate
- Body: `{action: 'OVERRIDE_OPEN'}`
- Manually opens gate; creates an AccessLog with triggerSource MANUAL_OVERRIDE.

### GET/POST /api/tunnel
- GET: Returns current tunnel state (active, URL).
- POST: `{action: 'start' | 'stop'}` — emits Socket.io event to tunnel manager.

### POST /api/auth/[...nextauth]
- Handled by NextAuth.js — credentials provider with bcrypt password verification.

---

## 7. REAL-TIME COMMUNICATION (SOCKET.IO)

### 7.1 Client-Side Hook (hooks/useVoltixSocket.ts)

A custom React hook that manages the Socket.io connection lifecycle:

```typescript
// Connects on mount, cleans up on unmount
const socket = useSocket('http://localhost:3000');

// Subscribes to server events
socket.on('appliance:state', ({ id, state }) => {
  queryClient.setQueryData(['appliances'], (prev) => updateAppliance(prev, id, state));
});

socket.on('access:newlog', (log) => {
  queryClient.setQueryData(['accesslogs'], (prev) => [log, ...prev]);
});
```

### 7.2 Optimistic Update Strategy

When a user toggles an appliance:
1. **Immediate**: `socket.emit('appliance:set', {id, state})` — fires instantly.
2. **Optimistic**: React Query cache is updated immediately — UI reflects new state without waiting.
3. **Confirmed**: ~30–80 ms later, the ESP32 echoes back its state change via MQTT, and the server re-emits `appliance:state` — UI is already correct.

This gives **instant visual feedback** while remaining consistent with hardware truth.

---

## 8. FRONTEND — REACT DASHBOARD

### 8.1 Component Architecture

```
app/page.tsx (Dashboard Shell)
  |
  +-- Navbar.tsx
  |     - Real-time connection status (Socket.io ping)
  |     - User avatar + logout
  |
  +-- StatsRow.tsx
  |     - Live counts: devices online, active appliances, today's entries
  |
  +-- QuickActionsBar.tsx
  |     - Scene buttons: ALL OFF, HOME MODE, AWAY MODE
  |
  +-- ApplianceGrid.tsx
  |     - 8-channel relay cards with toggle switches
  |     - Room filter tabs (ALL, LIVING ROOM, KITCHEN, BEDROOM...)
  |     - Power wattage display
  |
  +-- GatePanel.tsx
  |     - Live MJPEG camera stream (img src polling)
  |     - Manual gate override button
  |     - Access log table with status badges and snapshot thumbnails
  |
  +-- EntryChart.tsx
  |     - Recharts bar chart: access events by hour
  |
  +-- EnergyMeterWidget.tsx
  |     - Total estimated watt consumption
  |
  +-- AuthorizedPersonsModal.tsx
  |     - Add/remove persons from gate whitelist
  |
  +-- RemoteAccessModal.tsx
  |     - Cloudflare tunnel toggle + QR code display
  |
  +-- FlashingCenter.tsx
        - Firmware update UI for ESP32 boards (OTA)
```

### 8.2 State Management Strategy

| Data Type | How Managed |
|-----------|------------|
| Appliance list + states | TanStack React Query (initial fetch) + Socket.io optimistic updates |
| Access logs | React Query (paginated fetch) + Socket.io prepend new entries |
| Tunnel state | Socket.io event (`tunnel:state`) |
| Auth session | NextAuth.js `useSession()` hook |
| UI component state (modals, tabs) | Local React `useState` |

### 8.3 Key UI Features

- **Room filtering**: ApplianceGrid tabs filter cards by room without re-fetching.
- **Scene modes**: AWAY_MODE turns off all appliances except those named "fridge" — implemented server-side in `server.ts`.
- **Live MJPEG stream**: The gate camera stream is displayed via a regular `<img>` tag pointing to `/api/cam/stream` — the server proxies the ESP32-CAM stream.
- **Access log with snapshots**: Each log entry shows a thumbnail of the captured face frame stored in `/public/snapshots/`.
- **Entry Chart**: Recharts `BarChart` aggregates access log timestamps by hour using client-side data processing.
- **MarqueeTicker**: Scrolling ticker of recent access events for ambient awareness.

---

## 9. SECURITY DESIGN

### 9.1 Authentication Layers

| Layer | Mechanism |
|-------|-----------|
| Dashboard login | NextAuth.js credentials provider with bcrypt password hashing |
| MQTT device commands | Shared secret key (`VOLTIX_DEVICE_KEY`) in every MQTT payload; commands without valid key are silently dropped in `mqtt-handlers.ts` |
| Internal API calls | `X-Voltix-Key` header required on `/api/internal/*` routes |
| Face anti-spoofing | MiniFASNet ensemble rejects printed photos and screen replays |

### 9.2 Environment Variable Validation (lib/env.ts)

```typescript
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  VOLTIX_DEVICE_KEY: z.string().min(32),  // enforced minimum length
  NEXTAUTH_SECRET: z.string().min(32),
  MQTT_PORT: z.coerce.number().default(1883),
  PORT: z.coerce.number().default(3000),
  NEXT_BASE_URL: z.string().url(),
});
export const env = schema.parse(process.env);
```

All required environment variables are validated at startup — the process refuses to start if any are missing or malformed.

### 9.3 Access Control Summary

| Resource | Who Can Access |
|----------|---------------|
| Dashboard | Authenticated users (ADMIN or VIEWER role) |
| Appliance toggle | ADMIN role only |
| Gate override | ADMIN role only |
| Access logs (read) | ADMIN and VIEWER |
| Enrol/remove persons | ADMIN only |
| Internal face-result API | Python vision service with matching device key |
| MQTT broker | Any device presenting valid `key` in payload |

---

## 10. TESTING & VALIDATION

### 10.1 AI Module Tests

| Test File | Command | Purpose |
|-----------|---------|---------|
| `test_setup.py` | `python test_setup.py` | Verifies YuNet and SFace ONNX models load and detect faces in test images |
| `test_recognize.py` | `python test_recognize.py` | Validates that SFace produces stable embeddings and cosine similarity is in expected range for enrolled persons |
| `check_score.py` | `python check_score.py` | Confirms MiniFASNet returns real-probability in [0.0, 1.0] for known real and fake test images |

### 10.2 End-to-End Integration Scenarios

| Test Scenario | Steps | Expected Result |
|--------------|-------|-----------------|
| Face grant flow | 1. Enroll person. 2. Show face to camera for 2+ frames. 3. Check dashboard | Gate GRANTED; access log entry with confidence >= 0.82 appears on dashboard within 100 ms |
| Spoof rejection | 1. Hold printed photo to camera. 2. Check dashboard | "SPOOF DETECTED" displayed; gate stays closed; log entry with DENIED_UNKNOWN |
| Unknown person | 1. Show unenrolled face. 2. Check dashboard | "ACCESS DENIED: not enrolled"; log entry created |
| Appliance toggle latency | 1. Toggle appliance from dashboard. 2. Observe physical relay LED | Relay switches and dashboard updates within 80 ms |
| All-OFF scene | 1. Click AWAY MODE. 2. Check all appliance states | All non-fridge relays turn OFF; database updated; dashboard reflects OFF states |
| Device disconnect | 1. Power off ESP32. 2. Check dashboard | Device shows "offline" within MQTT keepalive timeout (~15 s) |
| Remote access | 1. Click Start Tunnel. 2. Open provided URL on mobile | Full dashboard accessible from external network |
| Hot-reload faces | 1. Enroll new person via API. 2. POST /admin/reload-faces. 3. Show face | New person recognised without restarting vision service |

### 10.3 Performance Benchmarks

| Metric | Value | Conditions |
|--------|-------|------------|
| MQTT command → relay switch | 30–80 ms | LAN, QoS 1 |
| Face detection throughput | 20–30 FPS | CPU (Intel i5/i7) |
| Face detection throughput | 55–60 FPS | GPU (NVIDIA RTX 4050) |
| Gate decision latency (frame to MQTT) | < 500 ms (CPU), < 150 ms (GPU) | 2 stable frames required |
| Vision microservice HTTP response | 150–400 ms | dlib CNN on CPU |
| Socket.io event to browser | < 5 ms | LAN |
| Dashboard initial load | < 1.5 s | Next.js SSR + SQLite |

---

## 11. SYSTEM DATA FLOW

### 11.1 Appliance Control Flow

```
User clicks toggle on Dashboard
         |
         | socket.emit('appliance:set', {id, state})
         v
server.ts Socket.io handler
         |
         +-- prisma.appliance.update()           (persist to DB)
         +-- mqttx.publish(voltix/devices/.../set, payload, QoS:1)
         +-- io.emit('appliance:state', ...)     (optimistic update to all clients)
         |
         | ~30–80ms later
         v
ESP32 Relay Board (physical)
         |
         | MQTT publish: voltix/devices/.../state
         v
Aedes MQTT Broker (embedded)
         |
         v
mqtt-handlers.ts
         |
         +-- prisma.appliance.update()           (confirm state in DB)
         +-- io.emit('appliance:state', ...)     (re-broadcast confirmation)
```

### 11.2 Gate Access Flow (Full)

```
ESP32-CAM captures frame (640x480 JPEG)
         |
         | HTTP POST /api/vision/face
         v
FastAPI Vision Service (port 8000)
         |
         +-- face_recognition.face_locations()
         +-- face_recognition.face_encodings()
         +-- np.linalg.norm() vs KNOWN_ENCODINGS
         +-- decision = GRANTED / DENIED_UNKNOWN
         |
         | HTTP POST /api/internal/face-result
         v
Next.js face-bridge.ts
         |
         +-- prisma.accessLog.create()
         +-- if GRANTED: mqttx.publish(voltix/gate/authorize)
         +-- io.emit('access:newlog', log)
         |
         v
ESP32-CAM receives MQTT authorize decision
         |
         +-- if GRANTED: GPIO 13 HIGH → Relay → Solenoid Lock OPEN (3 seconds)
```

---

## 12. DEPLOYMENT & CONFIGURATION

### 12.1 Required Environment Variables (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma DB connection string | `file:./dev.db` (SQLite) |
| `VOLTIX_DEVICE_KEY` | Shared secret (32+ chars) for MQTT auth | `super-secret-key-here` |
| `NEXTAUTH_SECRET` | NextAuth.js session signing key | `random-32-char-string` |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `PORT` | HTTP server port | `3000` |
| `NEXT_BASE_URL` | URL for Python service to callback | `http://127.0.0.1:3000` |

### 12.2 Running the Software Stack

```bash
# 1. Install Node dependencies
npm install

# 2. Set up database
npx prisma migrate dev --name init
npx prisma db seed

# 3. Start main server (MQTT + HTTP + Socket.io + Next.js)
npm run dev
# → tsx watch server.ts

# 4. Start Python vision microservice
cd services/vision
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
# OR: npm run vision (from project root)

# 5. Run local face gate (optional — for USB camera)
cd "face detection_deepfake also"
pip install -r requirements.txt
python main.py --camera 0 --spoof-threshold 0.50 --match-threshold 0.637
```

### 12.3 Project File Structure (Software Files Only)

```
voltix-home/
├── server.ts                      # Master server (HTTP + Socket.io + MQTT + Tunnel)
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   ├── mqtt-handlers.ts           # MQTT business logic
│   ├── face-bridge.ts             # REST-to-MQTT-to-Socket.io bridge
│   ├── tunnel-manager.ts          # Cloudflare tunnel lifecycle
│   ├── auth.ts                    # NextAuth configuration
│   ├── env.ts                     # Zod-validated env loader
│   └── utils.ts                   # cn() helper
├── app/
│   ├── page.tsx                   # Dashboard entry point
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Global styles
│   └── api/
│       ├── accesslogs/route.ts    # Paginated access log API
│       ├── accesslogs/export/     # CSV streaming export
│       ├── appliances/route.ts    # Appliance list API
│       ├── auth/[...nextauth]/    # NextAuth session routes
│       ├── cam/stream/route.ts    # MJPEG proxy
│       ├── gate/route.ts          # Manual gate override
│       ├── persons/route.ts       # Authorized persons CRUD
│       ├── tunnel/route.ts        # Tunnel control
│       └── internal/              # Key-guarded internal callbacks
├── components/
│   ├── ApplianceGrid.tsx
│   ├── GatePanel.tsx
│   ├── EnergyMeterWidget.tsx
│   ├── EntryChart.tsx
│   ├── QuickActionsBar.tsx
│   ├── AuthorizedPersonsModal.tsx
│   ├── RemoteAccessModal.tsx
│   ├── FlashingCenter.tsx
│   ├── Navbar.tsx
│   ├── StatsRow.tsx
│   ├── MarqueeTicker.tsx
│   ├── DashboardClient.tsx
│   ├── HeroSection.tsx
│   └── ui/
│       └── button.tsx
├── hooks/
│   └── useVoltixSocket.ts         # Socket.io client hook
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Database seeding
├── services/
│   └── vision/
│       ├── main.py                # FastAPI face recognition service
│       └── requirements.txt       # Python dependencies
├── face detection_deepfake also/
│   ├── main.py                    # Local camera gate pipeline
│   ├── enroll.py                  # Face enrolment script
│   ├── check_score.py             # Spoof score validator
│   ├── test_setup.py              # Model load tests
│   ├── test_recognize.py          # Recognition accuracy tests
│   ├── requirements.txt           # Python dependencies
│   ├── models/
│   │   ├── face_detection_yunet_2023mar.onnx
│   │   ├── sface_2021dec.onnx
│   │   └── anti_spoof/            # MiniFASNet .pth model files
│   ├── src/
│   │   ├── face_engine.py         # YuNet + SFace integration
│   │   ├── anti_spoof.py          # MiniFASNet ensemble
│   │   ├── gate_controller.py     # Gate open/close logic
│   │   └── model_lib/
│   │       └── MiniFASNet.py      # Model architecture definitions
│   └── database/
│       └── embeddings.pkl         # Enrolled face embedding store
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .env / .env.example
└── README.md
```

---

## 13. PERFORMANCE BENCHMARKS

| Benchmark | Value | Notes |
|-----------|-------|-------|
| MQTT LAN latency | ~5 ms | ESP32 → Aedes broker |
| Socket.io fan-out | ~2 ms | Aedes → Socket.io to browser |
| Optimistic UI update | Instant | No round-trip needed |
| Device confirmation | 30–80 ms | Full round-trip with relay echo |
| Face detection FPS (CPU) | 20–30 FPS | Intel Core i5/i7 class |
| Face detection FPS (GPU) | 55–60 FPS | NVIDIA RTX 4050 (CUDA 12.8) |
| Anti-spoofing inference | 15–40 ms/frame (GPU) | 4-model ensemble |
| Full gate decision | < 500 ms (CPU) / < 150 ms (GPU) | 2-frame stable requirement |
| Vision service HTTP | 150–400 ms | dlib CNN on CPU |
| Dashboard initial load | < 1.5 s | Next.js SSR + SQLite |
| Tunnel activation time | ~3–5 s | Cloudflare cloudflared spawn |

---

*Document covers software engineering contributions only. For hardware wiring diagrams, GPIO pin mapping, and firmware flashing instructions, refer to `firmware/README.md` and the hardware team's documentation.*
