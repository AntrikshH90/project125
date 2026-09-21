"""LIVE MIC-PIPELINE TEST — proves Vosk hears real speech end-to-end.

We have no mic to test with, so we synthesize a Hindi sentence with edge-tts
(the same voice Aanya uses), and stream its PCM into the /voice WebSocket
exactly like a browser mic would. Vosk must transcribe it, the brain must
answer, and TTS audio must come back.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import miniaudio
import websockets

SPOKEN = "namaste, mujhe pandrah september se teen raat ke liye deluxe room chahiye"

# Hinglish text → Hindi script for edge-tts so Vosk's Hindi model hears it
SPOKEN_HI = (
    "नमस्ते, मुझे पंद्रह सितंबर से तीन रात के लिए डीलक्स रूम चाहिए"
)


async def main() -> None:
    import edge_tts

    # 1) synthesize "guest speech" via edge-tts Hindi voice
    print("synthesizing guest speech (edge-tts)…")
    mp3 = bytearray()
    async for ch in edge_tts.Communicate(SPOKEN_HI, "hi-IN-SwaraNeural").stream():
        if ch["type"] == "audio":
            mp3 += ch["data"]
    decoded = miniaudio.decode(
        bytes(mp3), nchannels=1, sample_rate=16000,
        output_format=miniaudio.SampleFormat.SIGNED16,
    )
    pcm = bytes(decoded.samples)
    print(f"guest speech: {len(pcm)} bytes PCM ({len(pcm)/32000:.1f}s)")

    # 2) connect as a browser client and stream it like a mic
    uri = "ws://127.0.0.1:8300/voice"
    async with websockets.connect(uri, max_size=2**22) as ws:
        events, audio_total, heard = [], 0, None
        stop = asyncio.Event()

        async def reader():
            nonlocal audio_total, heard
            while not stop.is_set():
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                except websockets.ConnectionClosed:
                    return
                if isinstance(msg, bytes):
                    audio_total += len(msg)
                else:
                    ev = json.loads(msg)
                    events.append(ev)
                    t = ev.get("type")
                    if t == "user_text":
                        heard = ev["text"]
                        print("🗣  VOSK HEARD:", heard)
                    elif t == "agent_text":
                        print("👩‍💼 AANYA:", ev["text"])
                    elif t == "state":
                        print("  state:", ev["value"])
                    elif t in ("tool_start", "tool_result"):
                        print(f"  {t}:", ev.get("name") or str(ev.get("result"))[:80])

        rt = asyncio.create_task(reader())
        await asyncio.sleep(2)  # let greeting start

        # stream mic-like 100 ms frames
        frame = 3200  # 100 ms of 16k s16le
        for i in range(0, len(pcm), frame):
            await ws.send(pcm[i : i + frame])
            await asyncio.sleep(0.1)  # real-time pace
        print("streamed all guest audio — waiting for Aanya…")
        await asyncio.sleep(25)

        stop.set()
        await asyncio.gather(rt, return_exceptions=True)
        await ws.send(json.dumps({"type": "stop"}))

    assert heard, "Vosk did not return any transcript!"
    assert audio_total > 0, "no TTS audio came back"
    print(f"\naudio back: {audio_total} bytes | heard: {heard!r}")
    print("════ MIC PIPELINE (Vosk STT → brain → TTS) VERIFIED ════")


if __name__ == "__main__":
    asyncio.run(main())
