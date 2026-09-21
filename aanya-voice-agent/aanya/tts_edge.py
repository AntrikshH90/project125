"""Free neural TTS fallback — Microsoft Edge neural voices via edge-tts.

No API key needed. Streams mp3 (24 kHz mono) from Microsoft's public
synthesis endpoint and decodes to 16 kHz mono s16le PCM — same
stream_reply() interface as ElevenLabsTTS, so the orchestrator can swap
adapters transparently.

Voice: hi-IN-SwaraNeural (female, natural Hindi/Hinglish delivery).
Override with EDGE_TTS_VOICE in .env (hi-IN-HemaNeural, en-IN-NeerjaNeural…).
"""

from __future__ import annotations

import asyncio
import logging

import miniaudio

from .config import config

log = logging.getLogger("aanya.tts.edge")

FRAME_MS = 100
FRAME_BYTES = config.audio_sample_rate * 2 // (1000 // FRAME_MS)  # 100 ms of s16le


class EdgeTTS:
    """Drop-in for ElevenLabsTTS.stream_reply() using free Edge neural voices."""

    def __init__(self):
        self._voice = config.edge_tts_voice

    async def connect(self) -> None:
        pass  # edge-tts opens one WS per utterance; nothing held open

    async def close(self) -> None:
        pass

    async def reset(self) -> None:
        pass

    async def stream_reply(
        self, text: str, out: asyncio.Queue, stop_event: asyncio.Event
    ) -> None:
        """Synthesize `text`, pushing {"audio": pcm16k, "final": bool} frames."""
        if not text.strip():
            await out.put({"audio": b"", "final": True})
            return
        try:
            import edge_tts

            communicate = edge_tts.Communicate(text, self._voice, rate="+8%")
            mp3 = bytearray()
            async for chunk in communicate.stream():
                if stop_event.is_set():
                    log.debug("edge-tts: barge-in abort")
                    break
                if chunk["type"] == "audio":
                    mp3 += chunk["data"]
            if mp3 and not stop_event.is_set():
                # decode + resample in one shot: 24k mp3 → 16k s16le mono
                decoded = miniaudio.decode(
                    bytes(mp3),
                    nchannels=1,
                    sample_rate=config.audio_sample_rate,
                    output_format=miniaudio.SampleFormat.SIGNED16,
                )
                pcm = bytes(decoded.samples)
                for i in range(0, len(pcm), FRAME_BYTES):
                    await out.put({"audio": pcm[i : i + FRAME_BYTES], "final": False})
        except Exception as e:  # noqa: BLE001
            log.warning("edge-tts failed (%s) — skipping audio for this chunk", e)
        await out.put({"audio": b"", "final": True})
