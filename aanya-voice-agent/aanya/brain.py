"""LLM brain — OpenAI-compatible chat completions with function calling.

Works with Nous Research inference API (Hermes models) by default, and any
other OpenAI-compatible endpoint (OpenRouter, tokenrouter, local vLLM,
`hermes proxy`, LM Studio…) by changing LLM_BASE_URL/LLM_MODEL in .env.

Loop:
    user utterance ─▶ [LLM] ─▶ tool_calls? ─▶ execute ─▶ [LLM] ─▶ final text
    final text is yielded sentence-by-sentence so TTS can start ASAP.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import AsyncIterator, Callable

import httpx

from .config import config
from . import db

log = logging.getLogger("aanya.brain")

PACKAGE_DIR = Path(__file__).resolve().parent

SYSTEM_PROMPT = (PACKAGE_DIR / "prompts" / "system_prompt.txt").read_text(encoding="utf-8")
TOOLS_SCHEMA = json.loads((PACKAGE_DIR / "tools" / "schema.json").read_text(encoding="utf-8"))

TOOL_EXECUTORS: dict[str, Callable] = {
    "check_room_availability": db.check_room_availability,
    "create_hotel_booking": db.create_hotel_booking,
}

# Sentence splitter: split on danda/devanagari danda/!?/. keeping delimiters;
# chunks ≤ ~220 chars per TTS request.
_SENT_RE = re.compile(r"([^।\|!?\.]+[।\|!?\.]*\s*)")
# Streaming: a sentence is COMPLETE once its terminator token is seen.
_SENT_COMPLETE_RE = re.compile(r"(.{1,300}?(?:[।\|!?\.]+|\n)\s*)")


def _system_messages() -> list[dict]:
    today = date.today().isoformat()
    return [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\nCURRENT_DATE: {today}\nCURRENT_TIME: {datetime.now().strftime('%H:%M')}",
        }
    ]


def _clean_tts_text(text: str) -> str:
    """Strip markdown artifacts the LLM might emit despite instructions."""
    text = text.replace("*", "").replace("`", "").replace("#", "").strip()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_sentences(text: str, max_chars: int = 220) -> list[str]:
    """Split an assistant reply into TTS-sized chunks (1–2 short sentences)."""
    text = _clean_tts_text(text)
    if not text:
        return []
    parts = [p for p in _SENT_RE.split(text) if p and p.strip()]
    if not parts:
        parts = [text]
    # merge fragments into chunks of <= max_chars, ending on sentence ends
    chunks, cur = [], ""
    for p in parts:
        if len(cur) + len(p) <= max_chars:
            cur += p
        else:
            if cur.strip():
                chunks.append(cur.strip())
            cur = p
    if cur.strip():
        chunks.append(cur.strip())
    return chunks


@dataclass
class TurnResult:
    text: str = ""
    tool_calls_made: list[dict] = field(default_factory=list)


class AanyaBrain:
    """Stateful, single-caller conversation brain. NOT thread-safe across
    users — create one per call/session."""

    def __init__(self):
        self.messages: list[dict] = _system_messages()
        self.client = httpx.AsyncClient(
            base_url=config.llm_base_url,
            headers={"Authorization": f"Bearer {config.llm_api_key}"} if config.llm_api_key else {},
            timeout=httpx.Timeout(config.llm_timeout_s, connect=10.0),
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    async def _post_with_retry(self, payload: dict, attempts: int = 4):
        """POST /chat/completions (non-streaming) with retry on transient
        errors: network failures AND HTTP 429/5xx (free-tier rate limits).

        NOTE: non-streaming on purpose — tokenrouter's free GLM ignores
        reasoning_effort=none when streaming (reasoning chunks arrive first
        and add ~45s). Non-stream completes in ~4-5s with effort=none.
        """
        import asyncio as _aio

        last = None
        for i in range(attempts):
            try:
                resp = await self.client.post("/chat/completions", json=payload)
                if resp.status_code == 429 or resp.status_code >= 500:
                    body = resp.text[:200]
                    last = RuntimeError(f"HTTP {resp.status_code}: {body}")
                    wait = 2.0 * (i + 1)  # 2s, 4s, 6s, 8s
                    log.warning("LLM %s, retry %d/%d in %.1fs",
                                last, i + 1, attempts, wait)
                    await _aio.sleep(wait)
                    continue
                return resp
            except Exception as e:  # noqa: BLE001 — httpx transport errors
                last = e
                wait = 1.5 * (i + 1)
                log.warning("LLM call failed (%s), retry %d/%d in %.1fs",
                            e.__class__.__name__, i + 1, attempts, wait)
                await _aio.sleep(wait)
        raise last

    async def chat(self, user_text: str) -> AsyncIterator[dict]:
        """Feed one user utterance; yield events:
        {"type":"tool_start","name":...,"args":{...}}
        {"type":"tool_result","name":...,"result":{...}}
        {"type":"sentence","text":...}       (TTS-ready chunk)
        {"type":"turn_end","text":full_reply}
        """
        self.messages.append({"role": "user", "content": user_text})

        for _hop in range(4):  # allow chained tool calls, bounded
            payload = {
                "model": config.llm_model,
                "messages": self.messages,
                "tools": TOOLS_SCHEMA["tools"],
                "tool_choice": "auto",
                "temperature": config.llm_temperature,
                "max_tokens": config.llm_max_tokens,
            }
            if config.llm_reasoning_effort:
                payload["reasoning_effort"] = config.llm_reasoning_effort

            r = await self._post_with_retry(payload)
            r.raise_for_status()
            data = r.json()
            msg = data["choices"][0]["message"]

            tool_calls = msg.get("tool_calls") or []
            if not tool_calls:
                final = _clean_tts_text(msg.get("content") or "")
                self.messages.append({"role": "assistant", "content": final})
                for chunk in chunk_sentences(final):
                    yield {"type": "sentence", "text": chunk}
                yield {"type": "turn_end", "text": final}
                return

            # model wants tools — record assistant msg with tool_calls, execute
            self.messages.append(
                {
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for tc in tool_calls:
                fn = tc["function"]
                name = fn["name"]
                try:
                    args = json.loads(fn.get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}
                yield {"type": "tool_start", "name": name, "args": args}
                try:
                    if asyncio.iscoroutinefunction(TOOL_EXECUTORS.get(name)):
                        result = await TOOL_EXECUTORS[name](**args)
                    else:
                        result = await asyncio.to_thread(TOOL_EXECUTORS[name], **args)
                except TypeError as e:
                    result = {"error": f"Bad arguments for {name}: {e}"}
                except Exception as e:  # noqa: BLE001
                    result = {"error": f"{name} failed: {e.__class__.__name__}: {e}"}
                yield {"type": "tool_result", "name": name, "result": result}
                self.messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.get("id", "call_0"),
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
        # exhausted hops — force a plain answer
        self.messages.append(
            {"role": "system", "content": "Answer the guest now in one short Hinglish sentence."}
        )
        r = await self._post_with_retry(
            {
                "model": config.llm_model,
                "messages": self.messages,
                "temperature": config.llm_temperature,
                "max_tokens": 400,
            }
        )
        r.raise_for_status()
        final = _clean_tts_text(r.json()["choices"][0]["message"]["content"] or "")
        self.messages.append({"role": "assistant", "content": final})
        for chunk in chunk_sentences(final):
            yield {"type": "sentence", "text": chunk}
        yield {"type": "turn_end", "text": final}
