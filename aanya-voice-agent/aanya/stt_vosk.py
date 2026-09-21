"""Vosk offline STT — free, no API key, works in ANY browser.

Runs locally on the mic PCM the browser already streams to the server, so
no browser SpeechRecognition support is needed (works in Electron preview
panes, Firefox, anything that can getUserMedia). Model: small Hindi (0.22)
handles Hindi/Hinglish on a laptop CPU in real time.

One-time setup (~40 MB):
    uv pip install vosk
    # download + unzip into models/vosk-hi:
    https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip

Interface matches DeepgramSTT: send_audio(pcm) / events() / on_interim.
Barge-in via final transcripts (interims are UI-only in vosk mode to avoid
echo-triggered false interrupts).
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from pathlib import Path
from typing import AsyncIterator, Callable

from .config import config

log = logging.getLogger("aanya.stt.vosk")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "vosk-hi"


def vosk_available() -> bool:
    return MODEL_DIR.is_dir() and any(MODEL_DIR.iterdir())


class VoskSTT:
    """Offline streaming recognizer: mic PCM in → transcript events out.

    ECHO FILTERING: Vosk outputs Devanagari. Aanya's TTS also speaks Hindi, so
    speaker echo would come back as a transcript and self-trigger a turn.
    Instead of pausing recognition (which DISCARDS the guest's speech — the
    pause approach caused dropped user turns), we compare each final
    transcript against what Aanya recently said (transliterated to
    Devanagari) and drop it if it's mostly a match. Guest speech never
    matches, so it always passes through, even mid-Aanya-sentence (barge-in
    works properly).
    """

    ECHO_DROP_THRESHOLD = 0.55   # word-overlap fraction that means "echo"
    ECHO_SIM_THRESHOLD = 0.62    # fuzzy similarity that means "echo"
    ECHO_WINDOW_S = 12.0        # how far back Aanya's sentences count

    def __init__(self, on_interim: Callable[[str], None] | None = None):
        self.on_interim = on_interim
        self.out: asyncio.Queue[dict] = asyncio.Queue()
        self._recognizer = None
        self._model = None
        self._recent_agent: list[tuple[float, str]] = []  # (time, devanagari)
        self._recent_agent_latin: list[tuple[float, str]] = []
        self._echo_lock = asyncio.Lock()

    @classmethod
    def available(cls) -> bool:
        return vosk_available()

    async def connect(self) -> None:
        if not vosk_available():
            raise RuntimeError(
                f"Vosk Hindi model not found at {MODEL_DIR}. "
                "Download vosk-model-small-hi-0.22.zip and unzip to models/vosk-hi"
            )
        import vosk

        # vosk loading is CPU-bound → thread, to keep the event loop live
        self._model = await asyncio.to_thread(vosk.Model, str(MODEL_DIR))

        def _make_recognizer():
            r = vosk.KaldiRecognizer(self._model, config.audio_sample_rate)
            r.SetWords(False)
            return r

        self._recognizer = await asyncio.to_thread(_make_recognizer)
        log.info("STT: Vosk offline Hindi recognizer ready")

    async def close(self) -> None:
        pass  # GC handles the native objects

    def pause(self, flag: bool) -> None:
        """Kept for interface compat — echo filtering replaced pausing
        (pausing discarded guest speech mid-Aanya-sentence). No-op now."""
        pass

    def note_agent_speech(self, text: str) -> None:
        """Orchestrator tells us what Aanya is about to say. We store the
        raw Roman text AND a Devanagari transliteration; matching is FUZZY
        (character similarity) so spelling variants still match."""
        try:
            from indic_transliteration import sanscript

            deva = sanscript.transliterate(text, sanscript.HK, sanscript.DEVANAGARI)
        except Exception:  # noqa: BLE001
            deva = text
        now = time.monotonic()
        self._recent_agent.append((now, text))          # roman as-said
        self._recent_agent_latin.append((now, deva))   # devanagari version

    def _is_echo(self, transcript: str) -> bool:
        """True if `transcript` (Devanagari from Vosk) is fuzzy-similar to
        something Aanya recently said — i.e. speaker echo, not the guest."""
        from difflib import SequenceMatcher as _SM

        now = time.monotonic()
        self._recent_agent = [
            (t, s) for t, s in self._recent_agent if now - t < self.ECHO_WINDOW_S
        ]
        self._recent_agent_latin = [
            (t, s) for t, s in self._recent_agent_latin if now - t < self.ECHO_WINDOW_S
        ]
        # normalize: strip spaces/punct for character-level similarity
        def norm(s: str) -> str:
            return "".join(c for c in s.lower() if c.isalnum())

        t_norm = norm(transcript)
        if not t_norm:
            return False
        for _, said in self._recent_agent + self._recent_agent_latin:
            s_norm = norm(said)
            if len(s_norm) < 6:
                continue
            # quick length pre-filter
            if abs(len(s_norm) - len(t_norm)) > max(len(s_norm), len(t_norm)) * 0.6:
                # length differs wildly — check subsequence (echo can be partial)
                if t_norm not in s_norm and s_norm not in t_norm:
                    continue
            if _SM(None, t_norm, s_norm).ratio() >= self.ECHO_SIM_THRESHOLD:
                return True
        return False

    async def send_audio(self, pcm: bytes) -> None:
        if self._recognizer is None or not pcm:
            return
        # AcceptWaveform is CPU-bound → thread; keep WS I/O responsive
        finished = await asyncio.to_thread(self._recognizer.AcceptWaveform, pcm)
        if finished:
            raw = await asyncio.to_thread(self._recognizer.Result)
            with contextlib.suppress(json.JSONDecodeError):
                text = json.loads(raw).get("text", "").strip()
                if text and not self._is_echo(text):
                    await self.out.put(
                        {"type": "transcript", "text": text, "is_final": True}
                    )
        else:
            raw = await asyncio.to_thread(self._recognizer.PartialResult)
            with contextlib.suppress(json.JSONDecodeError):
                partial = json.loads(raw).get("partial", "").strip()
                if partial and self.on_interim:
                    with contextlib.suppress(Exception):
                        self.on_interim(partial)

    async def send_text(self, text: str) -> None:
        """Typed-text path (works in all modes)."""
        await self.out.put({"type": "transcript", "text": text, "is_final": True})

    async def events(self) -> AsyncIterator[dict]:
        while True:
            ev = await self.out.get()
            yield ev
