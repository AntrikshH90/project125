"""Which models can this key access + tool calling + speed test."""
import json, os, time, urllib.request

URL = "https://api.tokenrouter.com/v1/chat/completions"
KEY = os.environ["HERMES_CUSTOM_TOKENROUTER_API_KEY"]

TOOLS = [{
    "type": "function",
    "function": {
        "name": "check_room_availability",
        "description": "Check room availability",
        "parameters": {"type": "object", "properties": {
            "room_type": {"type": "string"}, "check_in": {"type": "string"}, "check_out": {"type": "string"}},
            "required": ["room_type", "check_in", "check_out"]}}}
]

MSGS = [
    {"role": "system", "content": "You are Aanya, hotel receptionist at Grand Horizon Hotel. Current date 2026-09-13. Reply in 1-2 short Hinglish sentences. Use tools for availability."},
    {"role": "user", "content": "15 september se teen raat ke liye deluxe room ka rate batao"},
]

def test(model):
    p = {"model": model, "messages": MSGS, "tools": TOOLS, "tool_choice": "auto",
         "max_tokens": 1500, "temperature": 0.6, "reasoning_effort": "none"}
    t0 = time.time()
    req = urllib.request.Request(URL, data=json.dumps(p).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=75))
        dt = time.time() - t0
        m = r["choices"][0]["message"]
        tc = m.get("tool_calls")
        tool = tc[0]["function"]["name"] if tc else "-"
        args = json.loads(tc[0]["function"]["arguments"]) if tc else {}
        print(f"{model:35s} {dt:5.1f}s  tool={tool:25s} args={args}")
        return dt
    except Exception as e:
        print(f"{model:35s} FAIL: {str(e)[:80]}")

for m in ["z-ai/glm-5.3-free", "z-ai/glm-5.3-flash", "qwen/qwen3.8-flash", "stepfun/step-3.5-flash", "nvidia/nemotron-3.5-lightning", "z-ai/glm-5-turbo", "qwen3.6-flash", "deepseek/deepseek-v4.1-flash"]:
    test(m)
