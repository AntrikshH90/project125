"""Console tester — talk to the whole pipeline from the terminal.

Modes:
  python -m aanya.console            live mic → speakers (real devices)
  python -m aanya.console --text     type instead of speak (mock STT path)

Requires `sounddevice` (pip install sounddevice) for live mic/speaker mode.
Ctrl+C to quit.
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from .config import config
from .orchestrator import CallEvents, VoiceCall


async def _run(text_mode: bool) -> None:
    import numpy as np  # noqa: F401  (sounddevice dep check)
    import sounddevice as sd

    out_stream = sd.RawOutputStream(
        samplerate=config.audio_sample_rate, channels=1, dtype="int16", blocksize=4800
    )
    out_stream.start()

    async def send_audio(pcm: bytes) -> None:
        await asyncio.to_thread(out_stream.write, pcm)

    def user_text(t: str) -> None:
        print(f"\n🧑 GUEST: {t}")

    def agent_text(t: str) -> None:
        print(f"👩‍💼 AANYA: {t}")

    def tool_ev(ev: dict) -> None:
        if ev["type"] == "tool_start":
            print(f"   🔧 {ev['name']}({ev['args']})")
        elif ev["type"] == "tool_result":
            print(f"   ↩  {ev['result']}")

    def interrupt() -> None:
        print("\n   ⚡ INTERRUPT — Aanya stops mid-sentence")

    def state(s: str) -> None:
        icons = {"listening": "👂", "thinking": "🧠", "speaking": "🔊", "closed": "⛔"}
        print(f"   {icons.get(s, '•')} [{s}]", flush=True)

    call = VoiceCall(
        CallEvents(
            on_user_text=user_text,
            on_agent_text=agent_text,
            on_tool=tool_ev,
            on_interrupt=interrupt,
            on_state=state,
        )
    )

    loop = asyncio.get_running_loop()
    mic_stream = None
    if not text_mode:
        def _on_mic(indata, frames, time_info, status):  # noqa: ANN001
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
            blocksize=1600,  # 100 ms
            callback=_on_mic,
        )
        mic_stream.start()

    try:
        await call.start()
        stt_task = asyncio.create_task(call.run_stt_loop())
        pb_task = asyncio.create_task(call.run_playback_loop(send_audio))

        if text_mode:
            print("\n=== Aanya console (TEXT mode — type to talk) ===")
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
    parser = argparse.ArgumentParser(description="Aanya voice agent console")
    parser.add_argument("--text", action="store_true", help="type instead of speak")
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s"
    )
    print(f"Aanya console | {config.mode_line()}")
    try:
        asyncio.run(_run(args.text))
    except KeyboardInterrupt:
        print("\n[bye]")


if __name__ == "__main__":
    main()
