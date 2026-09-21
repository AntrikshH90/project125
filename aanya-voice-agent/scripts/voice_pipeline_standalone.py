#!/usr/bin/env python
"""Standalone voice pipeline — mic → Deepgram → LLM → ElevenLabs → speakers.

Run WITHOUT the FastAPI server (Section 3 deliverable):
    python scripts/voice_pipeline_standalone.py            # live mic mode
    python scripts/voice_pipeline_standalone.py --text     # type-to-talk mode

It uses the same aanya package (brain / orchestrator / adapters), so behavior
is identical to the web path — just a different transport (your sound card
instead of a browser).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# allow running from repo root without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from aanya.config import config  # noqa: E402
from aanya.orchestrator import CallEvents, VoiceCall  # noqa: E402


async def _run(text_mode: bool) -> None:
    import sounddevice as sd

    out_stream = sd.RawOutputStream(
        samplerate=config.audio_sample_rate, channels=1, dtype="int16", blocksize=4800
    )
    out_stream.start()

    async def send_audio(pcm: bytes) -> None:
        await asyncio.to_thread(out_stream.write, pcm)

    def show(kind: str, text: str = "") -> None:
        icons = {"listening": "👂", "thinking": "🧠", "speaking": "🔊", "closed": "⛔"}
        if kind in icons:
            print(f"   {icons[kind]} [{kind}]", flush=True)
        elif kind == "interrupt":
            print("\n   ⚡ INTERRUPT — Aanya stops mid-sentence")

    call = VoiceCall(
        CallEvents(
            on_user_text=lambda t: print(f"\n🧑 GUEST: {t}"),
            on_agent_text=lambda t: print(f"👩‍💼 AANYA: {t}"),
            on_tool=lambda ev: print(
                f"   🔧 {ev.get('name','?')} → {ev.get('result') or ev.get('args')}"
            ),
            on_interrupt=lambda: show("interrupt"),
            on_state=lambda s: show(s),
        )
    )

    loop = asyncio.get_running_loop()
    mic_stream = None
    if not text_mode:
        def _on_mic(indata, frames, t, status):  # noqa: ANN001
            data = bytes(indata)

            def _put():
                try:
                    call.mic_in.put_nowait(data)
                except asyncio.QueueFull:
                    pass

            loop.call_soon_threadsafe(_put)

        mic_stream = sd.RawInputStream(
            samplerate=config.audio_sample_rate,
            channels=1,
            dtype="int16",
            blocksize=1600,
            callback=_on_mic,
        )
        mic_stream.start()
        print("🎙  Live mic ON — bolte rahiye. Ctrl+C to end.")
    else:
        print("⌨️  TEXT mode — type and press Enter. 'quit' to end.")

    try:
        await call.start()
        stt_task = asyncio.create_task(call.run_stt_loop())
        pb_task = asyncio.create_task(call.run_playback_loop(send_audio))

        if text_mode:
            while not call.stopped.is_set():
                user = await asyncio.to_thread(input, "\n🧑 YOU: ")
                if user.strip().lower() in {"quit", "exit", "bye"}:
                    break
                if user.strip():
                    call.inject_user_text(user.strip())

        await asyncio.gather(stt_task, pb_task)
    finally:
        if mic_stream is not None:
            mic_stream.stop()
            mic_stream.close()
        out_stream.stop()
        out_stream.close()
        await call.stop()
        print("\n[call ended]")


def main() -> None:
    p = argparse.ArgumentParser(description="Aanya standalone voice pipeline")
    p.add_argument("--text", action="store_true", help="type instead of speak")
    args = p.parse_args()
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s"
    )
    print(f"Aanya standalone pipeline | {config.mode_line()}")
    try:
        asyncio.run(_run(args.text))
    except KeyboardInterrupt:
        print("\n[bye]")


if __name__ == "__main__":
    main()
