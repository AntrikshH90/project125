"""Measure LLM latency: baseline vs reasoning-disabled variants + streaming TTFB."""
import json, os, time, urllib.request

URL = "https://api.tokenrouter.com/v1/chat/completions"
KEY = os.environ["HERMES_CUSTOM_TOKENROUTER_API_KEY"]
MODEL = "z-ai/glm-5.3-free"

BASE = [
    {"role": "system", "content": "You are Aanya, hotel receptionist. Reply in 1-2 short Hinglish sentences."},
    {"role": "user", "content": "15 september se teen raat ke liye deluxe room ka rate batao"},
]

def call(payload, label, timeout=90):
    t0 = time.time()
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=timeout))
        dt = time.time() - t0
        msg = r["choices"][0]["message"]
        content = msg.get("content") or ""
        reason_len = len(msg.get("reasoning_content") or "")
        print(f"{label:28s} {dt:6.1f}s  content={len(content):4d} chars  reasoning={reason_len:5d} chars")
        return dt
    except Exception as e:
        print(f"{label:28s} FAILED: {str(e)[:120]}")

def stream_ttfb(payload, label, timeout=90):
    """SSE streaming: time-to-first-content-delta and to first full sentence."""
    t0 = time.time()
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    first_delta = None; first_sentence = None; buf = ""
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw in resp:
                line = raw.decode().strip()
                if not line.startswith("data:"): continue
                data = line[5:].strip()
                if data == "[DONE]": break
                try: j = json.loads(data)
                except: continue
                d = j.get("choices", [{}])[0].get("delta", {})
                c = d.get("content") or ""
                if c and first_delta is None:
                    first_delta = time.time() - t0
                buf += c
                if first_sentence is None and any(x in buf for x in [".", "!", "?", "।"]):
                    first_sentence = time.time() - t0
        print(f"{label:28s} first_delta={first_delta and round(first_delta,1)}s  first_sentence={first_sentence and round(first_sentence,1)}s  total={round(time.time()-t0,1)}s")
    except Exception as e:
        print(f"{label:28s} STREAM FAILED: {str(e)[:120]}")

print(f"model: {MODEL}\n")
p = {"model": MODEL, "messages": BASE, "max_tokens": 1500, "temperature": 0.6}
call(p, "baseline (current)")
stream_ttfb({**p}, "streaming")

for label, extra in [
    ("reasoning_effort=low", {"reasoning_effort": "low"}),
    ("reasoning_effort=none", {"reasoning_effort": "none"}),
    ("thinking disabled", {"thinking": {"type": "disabled"}}),
    ("reasoning enabled=false", {"reasoning": {"enabled": False}}),
]:
    call({**p, **extra}, label)
