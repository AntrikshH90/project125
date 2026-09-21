"""FastAPI backend: REST + voice WebSocket + static web UI.

Endpoints:
  GET  /                     → web testing interface (web/index.html)
  GET  /api/health           → {status, mode, rooms}
  POST /api/availability     → check_room_availability (no LLM)
  POST /api/bookings         → create_hotel_booking (no LLM)
  GET  /api/bookings         → recent bookings (masked phone)
  POST /api/agent/chat       → text chat with Aanya (test brain w/o voice)
  POST /api/tts              → synthesize text → base64 PCM (test TTS w/o WS)
  WS   /voice                → live voice call. Binary frames = mic PCM
                               (16 kHz s16le mono). JSON control frames:
                               {"type":"text_input","text":...} (mock STT),
                               {"type":"stop"}.
Outbound JSON events: user_text, interim, agent_text, tool, state,
interrupt; audio arrives as binary frames.
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import select

from .config import config
from .db import Booking, init_db
from .orchestrator import CallEvents, VoiceCall

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("aanya.server")

app = FastAPI(title="Aanya — Grand Horizon Hotel Voice Agent", version="1.0.0")
WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@app.on_event("startup")
async def startup() -> None:
    init_db()
    log.info("Aanya backend up | %s", config.mode_line())


class AvailabilityReq(BaseModel):
    room_type: str
    check_in: str
    check_out: str
    guests: int = 2


class BookingReq(BaseModel):
    room_type: str
    check_in: str
    check_out: str
    guest_name: str
    phone: str
    guests: int = 2
    email: str | None = None
    special_requests: str | None = None


class ChatReq(BaseModel):
    message: str
    session: str | None = None


class TTSReq(BaseModel):
    text: str


@app.get("/", response_class=HTMLResponse)
async def index():
    return (WEB_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": config.mode_line()}


@app.post("/api/availability")
async def availability(req: AvailabilityReq):
    from . import db

    return db.check_room_availability(
        room_type=req.room_type,
        check_in=req.check_in,
        check_out=req.check_out,
        guests=req.guests,
    )


@app.post("/api/bookings")
async def create_booking(req: BookingReq):
    from . import db

    return db.create_hotel_booking(
        room_type=req.room_type,
        check_in=req.check_in,
        check_out=req.check_out,
        guest_name=req.guest_name,
        phone=req.phone,
        guests=req.guests,
        email=req.email,
        special_requests=req.special_requests,
    )


@app.get("/api/bookings")
async def list_bookings(limit: int = 20):
    from .db import SessionLocal

    out = []
    with SessionLocal() as db:
        rows = db.execute(
            select(Booking).order_by(Booking.id.desc()).limit(min(limit, 100))
        ).scalars()
        for b in rows:
            out.append(
                {
                    "booking_ref": b.booking_ref,
                    "room_type": b.room_type,
                    "check_in": b.check_in.isoformat(),
                    "check_out": b.check_out.isoformat(),
                    "guests": b.guests,
                    "total_amount": float(b.total_amount),
                    "status": b.status,
                    "phone": b.guest.phone[:2] + "****" + b.guest.phone[-2:],
                    "guest_name": b.guest.name,
                }
            )
    return {"bookings": out}


# text chat endpoint — talk to the brain without voice
_chat_brains: dict = {}


@app.post("/api/agent/chat")
async def agent_chat(req: ChatReq):
    from .brain import AanyaBrain

    sid = req.session or "default"
    brain = _chat_brains.get(sid)
    if brain is None:
        brain = _chat_brains[sid] = AanyaBrain()
    try:
        reply = ""
        tool_events = []
        async for ev in brain.chat(req.message):
            if ev["type"] == "sentence":
                reply += ev["text"] + " "
            elif ev["type"] in ("tool_start", "tool_result"):
                tool_events.append(ev)
        return {"reply": reply.strip(), "tool_events": tool_events, "session": sid}
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/tts")
async def tts_synth(req: TTSReq):
    from .tts_elevenlabs import ElevenLabsTTS

    tts = ElevenLabsTTS()
    try:
        chunks = []
        async for ev in tts.speak_text(req.text):
            if ev.get("audio"):
                chunks.append(ev["audio"])
        pcm = b"".join(chunks)
        return {"audio_b64": base64.b64encode(pcm).decode(), "sample_rate": 16000}
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"TTS failed: {e}"}, status_code=500)


# ─────────────────────────────── voice WebSocket ──────────────────────────
@app.websocket("/voice")
async def voice_ws(ws: WebSocket):
    await ws.accept()
    loop = asyncio.get_running_loop()

    async def _j(obj: dict) -> None:
        try:
            await ws.send_text(json.dumps(obj, ensure_ascii=False))
        except Exception:  # noqa: BLE001
            pass

    call = VoiceCall(
        CallEvents(
            on_user_text=lambda t: loop.create_task(_j({"type": "user_text", "text": t})),
            on_interim=lambda t: loop.create_task(_j({"type": "interim", "text": t})),
            on_agent_text=lambda t: loop.create_task(_j({"type": "agent_text", "text": t})),
            on_tool=lambda ev: loop.create_task(_j({"type": "tool", **ev})),
            on_interrupt=lambda: loop.create_task(_j({"type": "interrupt", "text": "— interrupted —"})),
            on_state=lambda s: loop.create_task(_j({"type": "state", "value": s})),
        )
    )
    try:
        await call.start()
        stt_task = asyncio.create_task(call.run_stt_loop())
        pb_task = asyncio.create_task(call.run_playback_loop(ws.send_bytes))
        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                if msg.get("bytes") is not None:
                    await call.mic_in.put(msg["bytes"])
                elif msg.get("text") is not None:
                    frame = json.loads(msg["text"])
                    if frame.get("type") == "text_input":
                        call.inject_user_text(frame["text"])
                    elif frame.get("type") == "stop":
                        break
        finally:
            await call.stop()
            for t in (stt_task, pb_task):
                t.cancel()
                with contextlib.suppress(asyncio.CancelledError, Exception):
                    await t
    except WebSocketDisconnect:
        await call.stop()
    log.info("voice call ended")

