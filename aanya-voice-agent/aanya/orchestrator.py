"""Voice-call orchestrator: mic→STT→LLM→TTS→playback, with barge-in.

Audio format everywhere in the backend is 16 kHz mono s16le PCM.

Per call session (`VoiceCall`):
  mic_in      asyncio.Queue[bytes]  PCM frames from browser/CLI
  playback    asyncio.Queue[dict]   TTS frames {"audio":bytes,"final":bool}
  STT events  DeepgramSTT.events() → final transcripts → brain.chat()
  agent turn  brain yields sentence chunks → TTS stream_reply per chunk
  playback    run_playback_loop() drains playback queue → transport

BARGE-IN (interruption handling):
  While the agent is speaking, STT stays live. When Deepgram reports
  SpeechStarted (guest starts talking over Aanya) OR a final transcript
  arrives mid-speech:
    1. playback stop_event is set → TTS stream aborts, queue flushed
    2. in-flight LLM turn is abandoned (turn_id invalidated, sentences dropped)
    3. the new user turn is processed normally.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Awaitable, Callable

from .brain import AanyaBrain
from .config import config
from .stt_deepgram import DeepgramSTT
from .tts_elevenlabs import ElevenLabsTTS

log = logging.getLogger("aanya.orchestrator")


def _make_tts():
    """Pick TTS adapter: ElevenLabs → Edge (free neural) → chime mock."""
    mode = config.tts_mode()
    if mode == "elevenlabs":
        return ElevenLabsTTS()
    if mode == "edge":
        from .tts_edge import EdgeTTS

        return EdgeTTS()
    from .tts_elevenlabs import _MockChimeTTS

    return _MockChimeTTS()


def _make_stt(on_interim):
    """Pick STT adapter: Deepgram → Vosk (free offline) → mock (typed text)."""
    mode = config.stt_mode()
    if mode == "deepgram":
        return DeepgramSTT(on_interim=on_interim)
    if mode == "vosk":
        from .stt_vosk import VoskSTT

        return VoskSTT(on_interim=on_interim)
    from .stt_deepgram import DeepgramSTT as _DG  # mock instance
    return _DG(on_interim=on_interim)  # no key → mock (typed-text path)


class CallEvents:
    """Callbacks the UI/CLI uses to observe the call. All optional."""

    def __init__(
        self,
        on_user_text: Callable[[str], None] | None = None,
        on_interim: Callable[[str], None] | None = None,
        on_agent_text: Callable[[str], None] | None = None,
        on_tool: Callable[[dict], None] | None = None,
        on_audio: Callable[[bytes], None] | None = None,
        on_interrupt: Callable[[], None] | None = None,
        on_state: Callable[[str], None] | None = None,
    ):
        self.on_user_text = on_user_text
        self.on_interim = on_interim
        self.on_agent_text = on_agent_text
        self.on_tool = on_tool
        self.on_audio = on_audio
        self.on_interrupt = on_interrupt
        self.on_state = on_state


class VoiceCall:
    """One live call. Wire mic_in from transport; subscribe via CallEvents."""

    def __init__(self, events: CallEvents | None = None):
        self.events = events or CallEvents()
        self.mic_in: asyncio.Queue[bytes] = asyncio.Queue(maxsize=1024)
        self.playback: asyncio.Queue[dict] = asyncio.Queue(maxsize=512)
        self.stopped = asyncio.Event()
        self.user_speaking = False
        self.agent_speaking = False
        self._playback_stop = asyncio.Event()
        self._turn_id = 0
        self._last_say_turn = -1
        self._nudged = False

        self.stt = _make_stt(self._on_interim_cb)
        self.tts = _make_tts()
        self.brain = AanyaBrain()

    # ------------------------------------------------------------------ utils
    def _fire(self, cb, *args):
        if cb is not None:
            with contextlib.suppress(Exception):
                cb(*args)

    def _on_interim_cb(self, text: str) -> None:
        # Deepgram interim while agent speaks = early barge-in signal
        if self.agent_speaking and text.strip():
            self._barge_in()
        self._fire(self.events.on_interim, text)

    def _set_state(self, s: str) -> None:
        log.debug("state -> %s", s)
        self._fire(self.events.on_state, s)

    # ---------------------------------------------------------------- control
    async def start(self) -> None:
        await self.stt.connect()
        await self.tts.connect()
        self._set_state("listening")
        asyncio.create_task(
            self._agent_say(
                "Namaste! Main Aanya bol rahi hoon Grand Horizon Hotel se. "
                "Kaise help kar sakti hoon aapki?"
            )
        )

    async def stop(self) -> None:
        self.stopped.set()
        self._playback_stop.set()
        with contextlib.suppress(Exception):
            await self.stt.close()
        with contextlib.suppress(Exception):
            await self.tts.close()
        with contextlib.suppress(Exception):
            await self.brain.aclose()
        self._set_state("closed")

    def inject_user_text(self, text: str) -> None:
        """Mock/test path: user 'spoke' this text (skips STT)."""
        self._handle_user_text(text)

    # --------------------------------------------------------------- barge-in
    def _barge_in(self) -> None:
        log.info("Barge-in: guest interrupted Aanya mid-speech")
        self._playback_stop.set()
        self._turn_id += 1  # invalidate in-flight LLM turn
        self._flush_playback()
        self.agent_speaking = False
        self.user_speaking = False
        if hasattr(self.stt, "pause"):
            self.stt.pause(False)  # user is talking — make sure mic is live
        self._fire(self.events.on_interrupt)
        self._set_state("listening")

    def _flush_playback(self) -> None:
        while True:
            try:
                self.playback.get_nowait()
            except asyncio.QueueEmpty:
                break

    # ------------------------------------------------------------ user turns
    def _handle_user_text(self, text: str) -> None:
        if not text.strip():
            return
        if self.agent_speaking:
            self._barge_in()
        self._fire(self.events.on_user_text, text)
        self.user_speaking = True
        self._set_state("thinking")
        asyncio.create_task(self._agent_turn(text))

    # -------------------------------------------------- thinking filler
    _FILLERS = [
        "Ek second, main check kar rahi hoon.",
        "Zara rukiye, dekh rahi hoon.",
        "Hmm, ek minute...",
    ]

    async def _maybe_filler(self, turn: int) -> None:
        """If the LLM hasn't produced speech within ~1.2 s, say a short
        acknowledgement so the guest isn't left in silence (masks LLM latency)."""
        await asyncio.sleep(1.2)
        if self.stopped.is_set() or turn != self._turn_id:
            return  # interrupted or superseded
        if self._last_say_turn == turn:
            return  # already speaking this turn — no filler needed
        import random

        await self._agent_say(random.choice(self._FILLERS))

    async def _agent_turn(self, user_text: str) -> None:
        turn = self._turn_id
        spoke_any = False
        filler_task = asyncio.create_task(self._maybe_filler(turn))
        try:
            async for ev in self.brain.chat(user_text):
                if self.stopped.is_set() or turn != self._turn_id:
                    return  # interrupted: drop the rest of this turn
                kind = ev["type"]
                if kind == "sentence":
                    spoke_any = True
                    await self._agent_say(ev["text"])
                elif kind in ("tool_start", "tool_result"):
                    self._fire(self.events.on_tool, ev)
                elif kind == "turn_end":
                    if not ev.get("text") and not spoke_any:
                        if not self._nudged:
                            self._nudged = True
                            await self._agent_say(
                                "Maaf kijiye, thoda technical issue. Aap phir se bata sakte hain?"
                            )
                    else:
                        self._set_state("listening")
        except Exception as e:  # noqa: BLE001
            log.exception("agent turn failed")
            self._fire(self.events.on_tool, {"type": "error", "error": str(e)})
            if not self.stopped.is_set():
                try:
                    await self._agent_say(
                        "Sorry, ek technical problem aa gayi. Aap thodi der baad phir try kar sakte hain?"
                    )
                except Exception:  # noqa: BLE001
                    pass
        finally:
            filler_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await filler_task

    async def _agent_say(self, text: str) -> None:
        """Speak one sentence chunk through TTS → playback queue."""
        self.agent_speaking = True
        self._last_say_turn = self._turn_id
        self._set_state("speaking")
        self._fire(self.events.on_agent_text, text)
        # tell the STT echo filter what Aanya is saying (it drops the
        # speaker echo instead of pausing recognition → barge-in stays live)
        if hasattr(self.stt, "note_agent_speech"):
            with contextlib.suppress(Exception):
                self.stt.note_agent_speech(text)
        # echo guard: pause recognition while Aanya's voice plays;
        # unpaused by run_playback_loop when the final audio frame is sent
        # (or by _barge_in on flush).
        if hasattr(self.stt, "pause"):
            self.stt.pause(True)
        if self._playback_stop.is_set():
            self._playback_stop.clear()
        try:
            await self.tts.stream_reply(text, self.playback, self._playback_stop)
        except Exception:  # noqa: BLE001
            log.exception("TTS stream failed")
            await self.playback.put({"audio": b"", "final": True})

    # ------------------------------------------------------------ STT pump/loop
    async def run_stt_loop(self) -> None:
        """Consume mic frames → Deepgram; dispatch transcripts/barge-in."""
        pump = asyncio.create_task(self._pump_mic())
        try:
            async for ev in self.stt.events():
                if self.stopped.is_set():
                    break
                t = ev["type"]
                if t == "transcript" and ev.get("is_final"):
                    self._handle_user_text(ev["text"])
                elif t == "speech_started" and self.agent_speaking:
                    self._barge_in()
        finally:
            pump.cancel()
            with contextlib.suppress(Exception):
                await pump

    async def _pump_mic(self) -> None:
        while not self.stopped.is_set():
            try:
                frame = await asyncio.wait_for(self.mic_in.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            try:
                await self.stt.send_audio(frame)
            except Exception as e:  # noqa: BLE001
                log.warning("STT send failed: %s", e)
                await asyncio.sleep(0.1)

    # -------------------------------------------------------------- playback
    async def run_playback_loop(self, send_audio: Callable[[bytes], Awaitable[None]]) -> None:
        """Transport task: playback queue → caller's send_audio().

        PACING: TTS frames arrive in bursts (whole-sentence decode), but the
        browser plays them in real time through a 2 s ring buffer. If we send
        faster than real time, the ring overflows and audio glitches/pauses.
        So: pace frames at true real-time rate, allowing a bounded lead of
        ~1.5 s over what has actually been *played* (not just sent).
        """
        import time as _time

        lead_limit_s = 1.5          # max seconds ahead of playback we may send
        frame_dur_s = 0.1           # each queued frame is 100 ms of audio
        last_sent = _time.monotonic() - frame_dur_s

        while not self.stopped.is_set():
            try:
                item = await asyncio.wait_for(self.playback.get(), timeout=0.5)
            except asyncio.TimeoutError:
                last_sent = _time.monotonic() - frame_dur_s  # idle → no lead debt
                continue
            if item is None:
                break
            if self._playback_stop.is_set():
                continue  # discard stale frames after barge-in
            audio = item.get("audio")
            if audio:
                # real-time pacing: never send faster than the audio's duration
                now = _time.monotonic()
                wait = last_sent + frame_dur_s - now
                if wait > 0:
                    await asyncio.sleep(wait)
                last_sent = _time.monotonic()
                self._fire(self.events.on_audio, audio)
                try:
                    await send_audio(audio)
                except Exception:  # noqa: BLE001
                    log.exception("transport send failed")
                    return
            if item.get("final"):
                self.agent_speaking = False
                self.user_speaking = False
                # keep mic paused a bit longer: the speaker is still draining
                # Aanya's last ~0.4 s of audio (echo would self-trigger Vosk)
                if hasattr(self.stt, "pause"):
                    async def _delayed_unpause():
                        await asyncio.sleep(0.4)
                        # only unpause if Aanya hasn't started a new sentence
                        if not self.agent_speaking and not self.stopped.is_set():
                            self.stt.pause(False)
                    asyncio.get_running_loop().create_task(_delayed_unpause())
                self._set_state("listening")

    async def wait_closed(self) -> None:
        await self.stopped.wait()
