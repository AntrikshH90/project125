"""Deepgram real-time streaming STT over WebSocket.

nova-2 + language=multi handles Hindi↔English code-switching (Hinglish).
We use interim results for barge-in detection and is_final utterances as
complete user turns.

Mock mode (no DEEPGRAM_API_KEY): the connection accepts JSON control frames
{"type":"text_input","text":"..."} as a stand-in for transcribed speech, so
the whole pipeline can be tested by typing.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator, Callable

import websockets

from .config import config

log = logging.getLogger("aanya.stt")

DG_URL = "wss://api.deepgram.com/v1/listen"


class DeepgramSTT:
    def __init__(self, on_interim: Callable[[str], None] | None = None):
        self.on_interim = on_interim
        self._ws = None
        self._recv_task: asyncio.Task | None = None

    # ------------------------------------------------------------- lifecycle
    async def connect(self) -> None:
        if config.use_mock_stt:
            log.info("STT: mock mode (text input frames)")
            self._ws = _MockDeepgramWS()
            return
        params = {
            "model": config.stt_model,
            "language": config.stt_language,   # 'multi' → Hinglish codeswitching
            "encoding": "linear16",
            "sample_rate": config.audio_sample_rate,
            "channels": 1,
            "interim_results": "true",
            "endpointing": str(config.stt_endpointing_ms),
            "utterance_end_ms": str(config.stt_utterance_end_ms),
            "smart_format": "true",
            "vad_events": "true",
            "punctuate": "true",
            "numerals": "true",
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        self._ws = await websockets.connect(
            f"{DG_URL}?{qs}",
            additional_headers={"Authorization": f"Token {config.deepgram_api_key}"},
            max_queue=512,
        )
        log.info("STT: Deepgram %s connected (%s)", config.stt_model, config.stt_language)

    async def close(self) -> None:
        if self._recv_task:
            self._recv_task.cancel()
            await asyncio.gather(self._recv_task, return_exceptions=True)
        if self._ws is not None:
            await self._ws.close()

    # --------------------------------------------------------------- audio in
    async def send_audio(self, pcm: bytes) -> None:
        """Feed 16 kHz mono s16le PCM frames from the mic."""
        if self._ws is None:
            raise RuntimeError("STT not connected")
        if config.use_mock_stt:
            return  # mock mode ignores real audio (typed text path only)
        await self._ws.send(pcm)

    async def send_text(self, text: str) -> None:
        """Mock path: inject a 'transcribed' utterance directly."""
        if not config.use_mock_stt:
            raise RuntimeError("send_text only available in mock STT mode")
        await self._ws.send(json.dumps({"type": "text_input", "text": text}))

    # -------------------------------------------------------------- events out
    async def events(self) -> AsyncIterator[dict]:
        """Yield {"type":"transcript","text":...,"is_final":bool} events."""
        if self._ws is None:
            raise RuntimeError("STT not connected")
        if config.use_mock_stt:
            async for ev in self._ws.events():
                yield ev
            return
        async for raw in self._ws:
            try:
                data = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                continue
            t = data.get("type")
            if t == "Results":
                alt = data["channel"]["alternatives"][0]
                transcript = alt.get("transcript", "").strip()
                if not transcript:
                    continue
                if data.get("is_final"):
                    yield {"type": "transcript", "text": transcript, "is_final": True}
                else:
                    if self.on_interim:
                        try:
                            self.on_interim(transcript)
                        except Exception:  # noqa: BLE001
                            pass
                    yield {"type": "transcript", "text": transcript, "is_final": False}
            elif t == "UtteranceEnd":
                yield {"type": "utterance_end"}
            elif t == "SpeechStarted":
                yield {"type": "speech_started"}

    def stop(self) -> None:
        """Signal end-of-audio (CloseStream). Safe to call multiple times."""
        if self._ws is not None and not config.use_mock_stt:
            try:
                asyncio.get_running_loop().create_task(self._ws.send(json.dumps({"type": "CloseStream"})))
            except RuntimeError:
                pass


class _MockDeepgramWS:
    """Minimal WS-like object: text frames in → transcript events out."""

    def __satchel(self):  # pragma: no cover — placeholder guard
        pass

    def __init__(self):
        self.incoming: asyncio.Queue[dict | None] = asyncio.Queue()
        self.closed = asyncio.Event()

    async def send(self, msg) -> None:
        if isinstance(msg, (str, bytes)) and not isinstance(msg, dict):
            try:
                frame = json.loads(msg)
            except (TypeError, json.JSONDecodeError):
                return  # raw PCM in mock mode is ignored
            if frame.get("type") == "text_input":
                await self.incoming.put(
                    {"type": "transcript", "text": frame["text"], "is_final": True}
                )
        elif isinstance(msg, dict) and msg.get("type") == "text_input":
            await self.incoming.put(
                {"type": "transcript", "text": msg["text"], "is_final": True}
            )

    async def events(self) -> AsyncIterator[dict]:
        while True:
            ev = await self.incoming.get()
            if ev is None:
                return
            yield ev

    async def close(self) -> None:
        await self.incoming.put(None)


# keep the old name working for imports like `from aanya.stt import DeepgramStreamSTT`
DeepgramStreamSTT = DeepgramSTT
