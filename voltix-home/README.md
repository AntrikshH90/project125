# Voltix Home

Smart home automation system with face recognition gate access, MQTT-based device control, and a real-time dashboard.

## Architecture Overview

```
┌─────────────────┐   HTTP POST /frame    ┌──────────────────────────────┐
│   ESP32-CAM     │ ────────────────────▶ │  Next.js Server (Node)       │
│  Gate + Stream  │ ◀──────────────────── │  ├─ API Routes (REST)        │
└─────────────────┘   {authorized, name}  │  ├─ Socket.io Gateway        │
                                          │  ├─ Aedes MQTT Broker :1883  │
┌─────────────────┐                       │  ├─ Face Engine Bridge       │
│ ESP32 8-Relay   │ ◀────MQTT──▶─────────▶│  │   (Python face-recognition│
│ x8 Appliances   │  voltix/devices/#     │  │    microservice :8000)    │
└─────────────────┘                       │  └─ Prisma → PostgreSQL      │
      ▲ physical buttons                  └──────────┬───────────────────┘
                                                     │ WebSocket (<100ms)
                                              ┌──────▼──────┐
                                              │  Dashboard  │
                                              │ Next.js App │
                                              └─────────────┘
```

## MQTT Protocol

| Topic | Direction | Payload |
|-------|-----------|---------|
| `voltix/devices/{deviceId}/set` | Broker → Device | `{"state":"ON","key":"SECRET"}` |
| `voltix/devices/{deviceId}/state` | Device → Broker | `{"deviceId":"RELAY-01","relay":3,"state":"ON","rssi":-52,...}` |
| `voltix/devices/{deviceId}/online` | LWT | `{"online":true}` |
| `voltix/gate/authorize` | Backend → Gate | `{"decision":"GRANTED","person":"Alice","confidence":0.93,"snapshot":"/snaps/x.jpg"}` |
| `voltix/gate/set` | Dashboard → Relay | `{"state":"OPEN"}` |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database URL, device key, and admin credentials
```

### 3. Database setup (PostgreSQL)

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run all services

**Terminal 1 — Main server (HTTP + Socket.io + MQTT):**
```bash
npm run dev
```

**Terminal 2 — Face recognition microservice:**
```bash
pip install -r services/vision/requirements.txt
npm run vision
```

### 5. Flash firmware

- ESP32-CAM: `firmware/esp32cam_gate/main.cpp` (edit `secrets.h` first)
- ESP32 Relay: `firmware/esp32_relay8/main.cpp` (edit `WIFI_SSID`, `MQTT_BROKER`, `SECRET_KEY`)

## Project Structure

```
voltix-home/
├── server.ts                    # Custom Node server (HTTP + Socket.io + Aedes)
├── lib/
│   ├── prisma.ts                # Prisma client singleton
│   ├── mqtt-handlers.ts         # Device traffic business logic
│   ├── env.ts                   # Zod-validated env loader
│   └── utils.ts                 # cn() helper
├── app/
│   ├── page.tsx                 # Dashboard shell
│   ├── layout.tsx               # Root layout
│   └── api/
│       ├── accesslogs/route.ts  # Paginated log history
│       ├── accesslogs/export/   # Streaming CSV export
│       ├── appliances/route.ts  # List all appliances
│       ├── cam/stream/route.ts  # MJPEG proxy
│       └── internal/            # Vision engine bridge (key-guarded)
├── components/
│   ├── ApplianceGrid.tsx        # 8-channel relay control
│   ├── GatePanel.tsx            # Live feed + access logs
│   └── ui/button.tsx            # Shared button primitive
├── hooks/
│   └── useVoltixSocket.ts       # Realtime Socket.io client hook
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── firmware/
│   ├── esp32cam_gate/
│   │   ├── main.cpp
│   │   └── secrets.h
│   └── esp32_relay8/main.cpp
├── services/vision/
│   ├── main.py
│   └── requirements.txt
├── .env / .env.example
└── README.md
```

## Deployment Checklist

- **Security:** Set a strong `VOLTIX_DEVICE_KEY` (≥32 chars); match firmware `SECRET_KEY` exactly
- **Wi-Fi:** Update SSID/password in firmware; consider `WiFiMulti` fallback
- **MQTT ACL:** Consider switching Aedes → Mosquitto with username/password for production
- **Vision accuracy:** Enroll each person with 3–5 reference angles; tune `MATCH_TOLERANCE` (0.38–0.48)
- **Backup:** Nightly `pg_dump`; persistent volume for `public/snapshots/`
- **Scalability:** Add more relay boards by incrementing `DEVICE_ID` and seeding channels

## Latency Profile

- ESP32 → Aedes (5ms LAN)
- Aedes → Socket.io fan-out (2ms)
- Socket.io → React optimistic toggle = instant UI
- ~30–80ms device confirmation via retained state echo

## License

MIT