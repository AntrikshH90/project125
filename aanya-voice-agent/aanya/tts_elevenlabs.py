"""ElevenLabs streaming TTS via their WebSocket stream-input protocol.

One persistent WS per call session. Text is streamed sentence-by-sentence as
the LLM produces it; audio frames (16 kHz s16le PCM) are pushed into a queue
that the orchestrator's playback task consumes.

- `stream_reply()` sends the text frames for one sentence chunk, then drains
  audio until isFinal (ElevenLabs signals end-of-sequence per generation).
- Barge-in: the orchestrator sets `stop_event`; streaming returns early and
  the connection is recycled (safest way to abort mid-generation).

Mock mode (no ELEVENLABS_API_KEY): synthesizes a soft chime so the whole
audio/playback/barge-in path still works offline.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import math
from typing import AsyncIterator

import websockets

from .config import config

log = logging.getLogger("aanya.tts")

TTS_URL = "wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input"


class _MockChimeTTS:
    """Offline chime synth (MOCK_TTS=1). Same interface as ElevenLabsTTS."""

    def __init__(self):
        self._ws = None

    async def connect(self) -> None:
        log.info("TTS: mock mode (chime synth)")

    async def close(self) -> None:
        pass

    async def reset(self) -> None:
        pass

    async def stream_reply(
        self, text: str, out: asyncio.Queue, stop_event: asyncio.Event
    ) -> None:
        if not text.strip():
            await out.put({"audio": b"", "final": True})
            return
        dur = min(3.0, 0.055 * max(1, len(text.split())))
        pcm = self._mock_pcm(dur)
        frame_bytes = config.audio_sample_rate * 2 // 10
        for i in range(0, len(pcm), frame_bytes):
            if stop_event.is_set():
                return
            await out.put({"audio": pcm[i : i + frame_bytes], "final": False})
            await asyncio.sleep(0.1)  # simulate real-time arrival
        await out.put({"audio": b"", "final": True})

    def _mock_pcm(self, dur_s: float) -> bytes:
        import math

        rate = config.audio_sample_rate
        n = int(dur_s * rate)
        frames = bytearray()
        freqs = [(440.0, 0.22), (587.3, 0.16), (880.0, 0.10)]
        for i in range(n):
            s = sum(a * math.sin(2 * math.pi * f * i / rate) for f, a in freqs)
            s *= math.exp(-3.0 * i / n) * 0.5
            frames += int(max(-1.0, min(1.0, s)) * 32767).to_bytes(2, "little", signed=True)
        return bytes(frames)


class ElevenLabsTTS:
    def __init__(self):
        self._ws = None

    # ------------------------------------------------------------- lifecycle
    async def connect(self) -> None:
        if config.use_mock_tts:
            log.info("TTS: mock mode (chime synth)")
            return
        if self._ws is not None:
            return
        url = TTS_URL.format(voice_id=config.tts_voice_id) + (
            f"?model_id={config.tts_model}&output_format=pcm_16000"
        )
        self._ws = await websockets.connect(
            url,
            additional_headers={"xi-api-key": config.elevenlabs_api_key},
            max_queue=512,
        )
        # BOS frame: key + voice settings; first text is a single space.
        await self._ws.send(
            json.dumps(
                {
                    "text": " ",
                    "xi_api_key": config.elevenlabs_api_key,
                    "voice_settings": {
                        "stability": config.tts_stability,
                        "similarity_boost": config.tts_similarity_boost,
                        "speed": config.tts_speed,
                    },
                    "generation_config": {"chunk_length_schedule": [50, 90, 120, 500]},
                    "try_trigger_generation": True,
                }
            )
        )
        log.info("TTS: ElevenLabs %s connected (voice %s)", config.tts_model, config.tts_voice_id)

    async def close(self) -> None:
        if self._ws is not None:
            try:
                await self._ws.send(json.dumps({"text": ""}))  # EOS
            except Exception:  # noqa: BLE001
                pass
            try:
                await self._ws.close()
            except Exception:  # noqa: BLE001
                pass
            self._ws = None

    async def reset(self) -> None:
        """Abort in-flight generation (barge-in) and reconnect cleanly."""
        await self.close()
        if not config.use_mock_tts:
            await self.connect()

    # --------------------------------------------------------------- speaking
    async def stream_reply(
        self, text: str, out: asyncio.Queue, stop_event: asyncio.Event
    ) -> None:
        """Synthesize ONE sentence chunk, pushing {"audio":bytes,"final":bool}
        into `out`. Returns early (without pushing final) if stop_event set.

        Ends by putting a final marker on the queue.
        """
        if not text.strip():
            await out.put({"audio": b"", "final": True})
            return
        if config.use_mock_tts:
            await self._mock_stream(text, out, stop_event)
            return

        assert self._ws is not None, "TTS not connected"
        try:
            await self._ws.send(json.dumps({"text": text + " ", "try_trigger_generation": True}))
            # per-chunk EOS: ElevenLabs flushes and marks this generation final
            await self._ws.send(json.dumps({"text": ""}))
            async for raw in self._ws:
                if stop_event.is_set():
                    log.debug("TTS: barge-in, aborting chunk audio")
                    break
                try:
                    data = json.loads(raw)
                except (TypeError, json.JSONDecodeError):
                    continue
                audio_b64 = data.get("audio")
                is_final = bool(data.get("isFinal", False))
                if audio_b64:
                    await out.put({"audio": base64.b64decode(audio_b64), "final": False})
                if is_final:
                    break
        except websockets.ConnectionClosed:
            log.warning("TTS connection closed mid-stream; reconnecting")
            await self.reset()
        await out.put({"audio": b"", "final": True})

    # ------------------------------------------------------------------ mock
    def _mock_pcm(self, dur_s: float) -> bytes:
        """Soft dual-sine chime in 16 kHz s16le mono."""
        rate = config.audio_sample_rate
        n = int(dur_s * rate)
        frames = bytearray()
        freqs = [(440.0, 0.22), (587.3, 0.16), (880.0, 0.10)]
        for i in range(n):
            s = sum(a * math.sin(2 * math.pi * f * i / rate) for f, a in freqs)
            s *= math.exp(-3.0 * i / n) * 0.5
            frames += int(max(-1.0, min(1.0, s)) * 32767).to_bytes(2, "little", signed=True)
        return bytes(frames)

    async def _mock_stream(
        self, text: str, out: asyncio.Queue, stop_event: asyncio.Event
    ) -> None:
        # ~55 ms of chime per word, capped — enough to exercise playback+barge-in
        dur = min(3.0, 0.055 * max(1, len(text.split())))
        pcm = self._mock_pcm(dur)
        frame_bytes = config.audio_sample_rate * 2 // 10  # 100 ms frames
        for i in range(0, len(pcm), frame_bytes):
            if stop_event.is_set():
                return
            await out.put({"audio": pcm[i : i + frame_bytes], "final": False})
            await asyncio.sleep(0.1)  # simulate real-time arrival
        await out.put({"audio": b"", "final": True})


# back-compat aliases
ElevenTTS = ElevenLabsTTS
