# 🏨 Aanya — Grand Horizon Hotel Voice Agent

End-to-end **Hinglish hotel reservation voice agent**: browser/mic → **STT
(Deepgram, or free offline Vosk)** → **LLM brain (function calling)** →
**TTS (ElevenLabs, or free Edge neural voice)** → browser speaker, with live
**barge-in interruption**, SQLAlchemy booking DB, and a fully **zero-API-key
mode** (Vosk Hindi STT + Edge Hindi TTS + any OpenAI-compatible LLM).

```
┌──────────────┐  PCM 16k  ┌─────────────┐  text  ┌──────────────┐  sentences  ┌───────────────┐
│ Browser UI   │ ─────────▶ │ Deepgram    │ ─────▶ │ LLM Brain    │ ──────────▶ │ ElevenLabs    │
│ (web/index)  │            │ nova-2/multi│        │ (Hermes /    │             │ TTS WS        │
│  mic+speaker │ ◀──────── │  STT  WS    │        │  any OpenAI- │             │ pcm_16000     │
└──────────────┘  PCM 16k  └─────────────┘        │  compatible) │             └───────┬───────┘
       ▲            ▲                               └──────┬───────┘                  │
       │            │                    tool calls        │                          │
       │            └── barge-in: Deepgram SpeechStarted ───┼── abort turn + flush ────┘
       └── JSON events (state/transcript/tool/interrupt)   │
                                             ┌─────────────▼─────────────┐
                                             │ SQLite / PostgreSQL       │
                                             │ rooms · guests · bookings │
                                             └───────────────────────────┘
```

---

## Project layout

```
aanya-voice-agent/
├── .env                        # all keys & settings (already filled for you)
├── requirements.txt
├── aanya/
│   ├── config.py               # env-driven config + auto-mock logic
│   ├── prompts/system_prompt.txt   # SECTION 1 — Aanya's persona & rules
│   ├── tools/schema.json       # SECTION 1 — function-calling JSON schemas
│   ├── db.py                   # SECTION 2 — SQLAlchemy models + tool executors
│   ├── brain.py                # LLM client + tool loop + sentence chunker
│   ├── stt_deepgram.py         # SECTION 3 — Deepgram streaming STT (WS)
│   ├── tts_elevenlabs.py       # SECTION 3 — ElevenLabs streaming TTS (WS)
│   ├── orchestrator.py         # SECTION 3 — VoiceCall: pipeline + barge-in
│   ├── server.py               # SECTION 2 — FastAPI: REST + /voice WS
│   └── console.py              # terminal tester (mic or --text mode)
├── scripts/
│   ├── voice_pipeline_standalone.py   # SECTION 3 — standalone (no server)
│   ├── smoke_test.py                  # DB + brain + TTS tests
│   └── server_e2e_test.py             # REST + WS end-to-end tests
└── web/index.html              # SECTION 4 — single-file WebRTC-style client
```

---

## Quick start (2 minutes — works with NO API keys)

The system ships in **mock mode**: no `DEEPGRAM_API_KEY` → typed text is
treated as speech; no `ELEVENLABS_API_KEY` → a chime plays instead of Aanya's
voice. Your `.env` already has a working LLM key (tokenrouter), so the brain
is live.

```bash
cd C:/Users/antriksh/Downloads/aanya-voice-agent

# 1. create venv + install (once)
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt

# 2. start the server
.venv/Scripts/python -m uvicorn aanya.server:app --host 127.0.0.1 --port 8300

# 3. open the UI  →  http://127.0.0.1:8300
#    press "📞 Start Reservation Call", allow mic, speak (or type below).
```

Try this over the mic or the text bar:

> "Namaste, ek room chahiye 20 September se, do raat ke liye. Deluxe ka rate kya hai?"
> "Haan book kar do. Naam Rahul Verma, number 98765 43210."

You'll see the tool calls live in the transcript panel (`check_room_availability`
→ quote → `create_hotel_booking` → booking ID), and the booking lands in
`data/aanya.db`.

**No mic? No problem** — type in the text bar (mock-STT path). **Test without
the browser?** `python -m aanya.console --text` from a terminal.

---

## SECTION 5 — Full setup & deployment guide

### 5.1 Prerequisites

- **Python 3.11+** (`py -0p` to check; install from python.org or `uv python install 3.11`)
- **uv** (fast pip alternative — <https://docs.astral.sh/uv/>) or plain `pip`
- API keys (all optional — omit any and that stage runs in mock mode):
  - LLM: your tokenrouter key (already in `.env`) — or Nous Portal
    (`portal.nousresearch.com` → `LLM_BASE_URL=https://inference-api.nousresearch.com/v1`,
    `LLM_MODEL=Hermes-4-405B`) — or OpenRouter, or a local vLLM
  - STT: <https://console.deepgram.com> (free $200 credit) → `DEEPGRAM_API_KEY`
  - TTS: <https://elevenlabs.io> (free tier) → `ELEVENLABS_API_KEY`
    and pick a multilingual voice ID (e.g. Aria `9BWtsMINqrJLrRacOk9x`)

### 5.2 Install dependencies

```bash
cd aanya-voice-agent

# with uv (recommended on Windows)
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt

# or with plain pip
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

> `sounddevice` is only needed for the console/standalone mic scripts. On
> Linux it needs `libportaudio2` (`sudo apt install libportaudio2`).

### 5.3 Configure environment (.env)

Everything lives in `.env` at the project root:

```ini
LLM_BASE_URL=https://api.tokenrouter.com/v1     # or https://inference-api.nousresearch.com/v1
LLM_MODEL=z-ai/glm-5.3-free                    # or Hermes-4-405B
LLM_API_KEY=sk-...

DEEPGRAM_API_KEY=...        # nova-2, language=multi → Hinglish codeswitching
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=9BWtsMINqrJLrRacOk9x
ELEVENLABS_MODEL=eleven_flash_v2_5              # eleven_multilingual_v2 = better quality

AANYA_HOST=127.0.0.1
AANYA_PORT=8300
# DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/aanya   # to switch to Postgres
```

Auto-mock rules: empty `DEEPGRAM_API_KEY` → mock STT (type-to-talk);
empty `ELEVENLABS_API_KEY` → mock TTS (chime). Force with `MOCK_STT=1`/`MOCK_TTS=1`.

### 5.4 Run & test locally

```bash
# A) Web UI (recommended)
.venv/Scripts/python -m uvicorn aanya.server:app --host 127.0.0.1 --port 8300
# → http://127.0.0.1:8300

# B) Terminal console (mic + speakers)
.venv/Scripts/python -m aanya.console            # speak
.venv/Scripts/python -m aanya.console --text     # type

# C) Standalone pipeline (Section 3 script, no server)
.venv/Scripts/python scripts/voice_pipeline_standalone.py --text

# D) Automated tests
.venv/Scripts/python scripts/smoke_test.py       # DB tools + brain + TTS
.venv/Scripts/python scripts/server_e2e_test.py  # REST + full WS call session
```

REST endpoints (handy for curl / Postman):

```bash
curl http://127.0.0.1:8300/api/health
curl -X POST http://127.0.0.1:8300/api/availability \
  -H "Content-Type: application/json" \
  -d '{"room_type":"deluxe","check_in":"2026-09-20","check_out":"2026-09-22"}'
curl -X POST http://127.0.0.1:8300/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Executive room ka rate kya hai?"}'
curl http://127.0.0.1:8300/api/bookings
```

### 5.5 Switching the database to PostgreSQL

```bash
uv pip install --python .venv/Scripts/python.exe "psycopg[binary]"
# .env:
DATABASE_URL=postgresql+psycopg://aanya:aanya@localhost:5432/aanya
```
Schema/seed logic is identical (`init_db()` creates + seeds on startup).

### 5.6 Production notes

- **Serve behind HTTPS** (browsers only grant mic on `https://` or `localhost`)
  — put the uvicorn app behind Caddy/nginx with TLS, or deploy on a VPS.
- **Run multiple workers carefully**: SQLite + `--workers N` → use Postgres and
  one `VoiceCall` per WS connection (already isolated per connection).
- **CORS**: add `CORSMiddleware` if you host the page on a different origin.
- **LiveKit / Vapi port**: the orchestrator (`aanya/orchestrator.py`) is
  transport-agnostic — swap the WS transport for `livekit-agents`'s
  `AgentSession` or Vapi's server messages; STT/TTS/brain/tool logic stays.
- **Rate/safety**: `create_hotel_booking` validates phone & never overbooks
  (re-checks inventory in the same transaction); prices are tool-side, never
  taken from the LLM.
- **Latency budget** (typical, with flash TTS): Deepgram final ~300–600 ms ·
  LLM first sentence ~700–1500 ms · ElevenLabs TTFB ~300–500 ms → first audio
  ≈ 1.3–2.6 s, and subsequent sentences stream while earlier ones play.

### 5.7 Troubleshooting

| Symptom | Fix |
|---|---|
| `unable to open database file` | delete `data/` and restart (auto-recreates) |
| 403 from LLM | wrong model for the key — check `LLM_MODEL` matches the key's allowed models |
| Mic button does nothing | page must be `http://localhost:...` or HTTPS; check browser mic permissions |
| No Aanya voice, only chime | add `ELEVENLABS_API_KEY` in `.env` |
| She hears nothing (mock off, key on) | speak after the state shows `listening`; browser tab must stay focused |
| `PortAudio` error in console mode | reinstall `sounddevice`, or use `--text` |

---

## Verification log (this machine, 2026-09-13)

- `smoke_test.py` — DB tools (40+12 rooms seeded, ₹3,500×3+GST=₹11,760 ✓,
  overbook guard ✓, phone validation ✓), live LLM brain Hinglish booking flow ✓,
  mock TTS stream ✓
- `server_e2e_test.py` — REST `/api/health|availability|bookings|agent/chat|bookings`
  ✓, full `/voice` WS session (greeting → availability tool call → booking tool
  call → 80,640 bytes TTS audio streamed) ✓
- Verified live against `api.tokenrouter.com` (model `z-ai/glm-5.3-free`); the
  same code path works against Nous `Hermes-4-405B` by changing 2 env lines.

## Live APIs you haven't wired yet

`DEEPGRAM_API_KEY` and `ELEVENLABS_API_KEY` are empty in `.env` → those stages
run in mock mode. Paste keys in and restart; no code changes needed.
