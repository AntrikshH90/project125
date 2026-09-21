"""End-to-end smoke test: DB tools + brain tool-loop + TTS + orchestrator.

Run:  .venv/Scripts/python scripts/smoke_test.py
Uses whatever keys are in .env (falls back to mocks where absent).
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import aanya.db as db
from aanya.brain import AanyaBrain, chunk_sentences
from aanya.tts_elevenlabs import ElevenLabsTTS


def test_db() -> None:
    db.init_db()
    print("── DB tools ──────────────────────────────")
    r = db.check_room_availability("deluxe", "2026-09-15", "2026-09-18", 2)
    print("availability:", r)
    assert r["available"] and r["tariff"] == 10500.00, r
    r2 = db.create_hotel_booking(
        room_type="deluxe", check_in="2026-09-15", check_out="2026-09-18",
        guest_name="Rahul Verma", phone="9876543210", guests=2,
    )
    print("booking:", r2)
    assert "booking_id" in r2, r2
    assert r2["total_payable"] == round(10500 * 1.12, 2)
    r3 = db.create_hotel_booking(
        room_type="executive", check_in="2026-09-20", check_out="2026-09-21",
        guest_name="Test", phone="12345",   # bad phone → error dict
    )
    assert "error" in r3, r3
    print("bad-phone guard OK:", r3["error"])
    print("DB ✔\n")


async def test_brain() -> None:
    print("── LLM brain (live Hinglish conversation) ──")
    brain = AanyaBrain()
    convo = [
        "Haan, ek room chahiye 15 September se, 3 raat ke liye. Deluxe mein kya rate hai?",
        "Achha, book kar dijiye. Naam Rahul Verma hai, number 9876543210.",
    ]
    full = []
    for utt in convo:
        print(f"\nGUEST: {utt}")
        async for ev in brain.chat(utt):
            if ev["type"] == "tool_start":
                print(f"  🔧 {ev['name']}({ev['args']})")
            elif ev["type"] == "tool_result":
                print(f"  ↩  {ev['result']}")
            elif ev["type"] == "sentence":
                print(f"  AANYA: {ev['text']}")
                full.append(ev["text"])
    await brain.aclose()
    text = " ".join(full)
    assert any("GH" in s for s in full), "expected a booking ID in the reply"
    print("\nBRAIN ✔\n")


async def test_tts() -> None:
    print("── TTS (mock or live) ─────────────────────")
    tts = ElevenLabsTTS()
    q = asyncio.Queue()
    stop = asyncio.Event()
    await tts.connect()
    frames = 0
    await tts.stream_reply("Namaste! Main Aanya bol rahi hoon.", q, stop)
    while True:
        item = await q.get()
        if item.get("audio"):
            frames += 1
        if item.get("final"):
            break
    await tts.close()
    print(f"audio frames: {frames}")
    assert frames > 0
    print("TTS ✔\n")


def test_chunker() -> None:
    print("── sentence chunker ───────────────────────")
    out = chunk_sentences("Namaste! Main Aanya bol rahi hoon. Room ka rate? Kya aap batayengi. ठीक है।")
    for c in out:
        print("  •", c)
    assert all(len(c) <= 220 for c in out)
    print("CHUNKER ✔\n")


async def main() -> None:
    from aanya.config import config

    print(f"mode: {config.mode_line()}\n")
    test_db()
    test_chunker()
    await test_brain()
    await test_tts()
    print("════ ALL SMOKE TESTS PASSED ════")


if __name__ == "__main__":
    asyncio.run(main())
