"""Live server test: REST + full /voice WebSocket session (mock STT/TTS path).

The WS test simulates a guest typing instead of speaking (mock STT) while
mock TTS plays chimes, so the whole orchestrator (barge-in, playback, state)
is exercised end-to-end over the real server transport.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import websockets

BASE = "http://127.0.0.1:8300"


async def rest_tests() -> None:
    import httpx

    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        h = await c.get("/api/health")
        print("health:", h.json())
        assert h.status_code == 200

        a = await c.post(
            "/api/availability",
            json={"room_type": "executive", "check_in": "2026-09-20", "check_out": "2026-09-22"},
        )
        print("availability:", a.json())
        assert a.json()["tariff"] == 12000.0

        b = await c.post(
            "/api/bookings",
            json={
                "room_type": "executive", "check_in": "2026-09-20", "check_out": "2026-09-22",
                "guest_name": "Priya Sharma", "phone": "9812345678", "guests": 2,
            },
        )
        print("booking:", b.json())
        assert "booking_id" in b.json()

        ch = await c.post(
            "/api/agent/chat", json={"message": "Executive room ka rate kya hai?", "session": "resttest"}
        )
        r = ch.json()
        print("agent chat reply:", r["reply"])
        print("tool events:", [(e["type"], e.get("name")) for e in r.get("tool_events", [])])
        assert ch.status_code == 200 and r.get("reply")

        lst = await c.get("/api/bookings")
        print("bookings list:", len(lst.json()["bookings"]), "entries")
        assert len(lst.json()["bookings"]) >= 1
    print("REST ✔\n")


async def voice_ws_test() -> None:
    print("── /voice WebSocket session (mock STT path) ──")
    uri = "ws://127.0.0.1:8300/voice"
    async with websockets.connect(uri, max_size=2**22) as ws:
        events = []
        audio_bytes = 0
        greeting_seen = False

        async def reader():
            nonlocal audio_bytes, greeting_seen
            while True:
                try:
                    msg = await ws.recv()
                except websockets.ConnectionClosed:
                    return
                if isinstance(msg, bytes):
                    audio_bytes += len(msg)
                else:
                    ev = json.loads(msg)
                    events.append(ev)
                    t = ev.get("type")
                    if t == "state":
                        print("  state:", ev["value"])
                    elif t == "agent_text":
                        print("  AANYA:", ev["text"])
                        greeting_seen = greeting_seen or "Namaste" in ev["text"]
                    elif t == "user_text":
                        print("  GUEST:", ev["text"])
                    elif t in ("tool_start", "tool_result"):
                        print(f"  {t}:", ev.get("name") or str(ev.get("result"))[:80])

        reader_task = asyncio.create_task(reader())
        # wait for greeting to start playing
        await asyncio.sleep(4)

        # user turn 1: availability question
        await ws.send(json.dumps({"type": "text_input", "text": "20 September se do raat ke liye executive room milega?"}))
        await asyncio.sleep(12)

        # user turn 2: booking
        await ws.send(json.dumps({"type": "text_input", "text": "Haan book kar dijiye. Naam Priya Sharma, phone 9812345678."}))
        await asyncio.sleep(15)

        await ws.send(json.dumps({"type": "stop"}))
        try:
            await asyncio.wait_for(reader_task, timeout=10)
        except asyncio.TimeoutError:
            reader_task.cancel()
        print(f"\naudio received: {audio_bytes} bytes")
        print("REST session audio OK" if audio_bytes > 0 else "NO AUDIO")
        assert audio_bytes > 0, "expected TTS audio frames"
        assert greeting_seen, "greeting not received"
        tool_events = [e for e in events if e["type"] in ("tool_start", "tool_result")]
        assert len(tool_events) >= 2, "expected tool calls over WS"
        print("VOICE WS ✔\n")


async def main() -> None:
    await rest_tests()
    await voice_ws_test()
    print("════ SERVER E2E TESTS PASSED ════")


if __name__ == "__main__":
    asyncio.run(main())
