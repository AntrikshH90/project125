"""
Central configuration for the Aanya voice agent.

Everything is read from environment variables / the project .env file.
Defaults target the official stack:
    LLM   : Nous Research inference API (OpenAI-compatible) — Hermes models
    STT   : Deepgram nova-2, language=multi (handles Hinglish code-switching)
    TTS   : ElevenLabs (eleven_flash_v2_5 for latency, multilingual_v2 for quality)

If an API key is missing, the component silently falls back to a MOCK
implementation so the full pipeline can be developed/tested offline:
    STT mock : accepts {"type":"text_input","text":...} control frames as
               utterances (a "type instead of speak" path in the UI).
    TTS mock : synthesizes a short chime so the audio path is still exercised.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Project root = parent of this package directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def _flag(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Config:
    # ------------------------------------------------------------------ LLM
    # Any OpenAI-compatible /chat/completions endpoint works.
    # Default: Nous Research inference API (Hermes-4-405B).
    llm_base_url: str = os.getenv(
        "LLM_BASE_URL", "https://inference-api.nousresearch.com/v1"
    )
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "Hermes-4-405B")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.6"))
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "1200"))
    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "45"))
    # 'none' skips hidden reasoning tokens → much faster first reply on
    # reasoning models (GLM-5.3-free: ~10.7s → ~4.4s measured). '' = omit.
    llm_reasoning_effort: str = os.getenv("LLM_REASONING_EFFORT", "none")

    # ------------------------------------------------------------------ STT
    deepgram_api_key: str = os.getenv("DEEPGRAM_API_KEY", "")
    stt_model: str = os.getenv("DEEPGRAM_MODEL", "nova-2")
    stt_language: str = os.getenv("DEEPGRAM_LANGUAGE", "multi")  # multi = codeswitching
    stt_endpointing_ms: int = int(os.getenv("DEEPGRAM_ENDPOINTING_MS", "250"))
    stt_utterance_end_ms: int = int(os.getenv("DEEPGRAM_UTTERANCE_END_MS", "1000"))
    # audio we feed the STT (browser worklet + scripts all produce this)
    audio_sample_rate: int = 16_000

    # ------------------------------------------------------------------ TTS
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    tts_voice_id: str = os.getenv(
        "ELEVENLABS_VOICE_ID", "9BWtsMINqrJLrRacOk9x"  # "Aria" — female, multilingual
    )
    tts_model: str = os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5")
    tts_stability: float = float(os.getenv("ELEVENLABS_STABILITY", "0.5"))
    tts_similarity_boost: float = float(os.getenv("ELEVENLABS_SIMILARITY", "0.75"))
    tts_speed: float = float(os.getenv("ELEVENLABS_SPEED", "0.97"))
    # zero-key fallback voice: Microsoft Edge neural TTS (edge-tts package)
    edge_tts_voice: str = os.getenv("EDGE_TTS_VOICE", "hi-IN-SwaraNeural")

    # ------------------------------------------------------------------ HTTP
    host: str = os.getenv("AANYA_HOST", "127.0.0.1")
    port: int = int(os.getenv("AANYA_PORT", "8300"))

    # ------------------------------------------------------------------ Data
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{(PROJECT_ROOT / 'data' / 'aanya.db').as_posix()}"
    )
    hotel_timezone: str = os.getenv("HOTEL_TIMEZONE", "Asia/Kolkata")

    # -------------------------------------------------------------- Mock mode
    # MOCK_STT=1 / MOCK_TTS=1 force the offline implementations even if keys
    # exist. Without the flag, mocks are used automatically when key is absent.
    force_mock_stt: bool = field(default_factory=lambda: _flag("MOCK_STT"))
    force_mock_tts: bool = field(default_factory=lambda: _flag("MOCK_TTS"))

    @property
    def use_mock_stt(self) -> bool:
        return self.force_mock_stt or not self.deepgram_api_key

    @property
    def use_mock_tts(self) -> bool:
        return self.force_mock_tts or not self.elevenlabs_api_key

    def tts_mode(self) -> str:
        """'elevenlabs' | 'edge' (free neural fallback) | 'mock' (chime)."""
        if self.elevenlabs_api_key:
            return "elevenlabs"
        if self.force_mock_tts:
            return "mock"
        return "edge"

    def stt_mode(self) -> str:
        """'deepgram' | 'vosk' (free offline) | 'browser' (Chrome SR fallback)."""
        if self.deepgram_api_key:
            return "deepgram"
        models_dir = PROJECT_ROOT / "models" / "vosk-hi"
        if models_dir.is_dir() and any(models_dir.iterdir()):
            return "vosk"
        return "browser"

    def mode_line(self) -> str:
        return (
            f"llm={self.llm_model} stt={self.stt_mode()} tts={self.tts_mode()} "
            f"db={self.database_url.split('://')[0]}"
        )


config = Config()
