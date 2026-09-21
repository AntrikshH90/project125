// llm.ts — OpenAI-compatible chat calls (tokenrouter / glm-5.3-free).
// Used ONLY when the heuristic classifier is unsure, so the app still works keyless.

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BASE = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const KEY = process.env.OPENAI_API_KEY;

export function llmAvailable(): boolean {
  return Boolean(KEY);
}

interface ChatMsg { role: "system" | "user" | "assistant"; content: string }

export async function chat(messages: ChatMsg[], jsonMode = false, timeoutMs = 30000): Promise<string> {
  if (!KEY) throw new Error("no OPENAI_API_KEY configured");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const body: Record<string, any> = { model: MODEL, messages, temperature: 0.2, max_tokens: 500 };
    if (jsonMode) body.response_format = { type: "json_object" };
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`LLM ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(t);
  }
}

// ---- smart intent classification (fallback when heuristics fail) ----

export interface LlmIntent {
  kind: "papers" | "dataset" | "github" | "images" | "web" | "edu" | "models" | "generic" | "jobs" | "data_index";
  query: string;     // the core thing, cleaned of filler
  count?: number;    // how many / how many rows
  url?: string;      // for web mode
}

export async function classifyWithLLM(ask: string): Promise<LlmIntent | null> {
  const system = `You classify "I want X" requests for a data-fetching tool. Respond ONLY with JSON:
  {"kind":"papers|dataset|github|images|web|edu|models|generic|jobs|data_index","query":"core topic stripped of filler words","count":<number or null>,"url":"<only if the user gave a specific URL, else null>"}

Rules:
- "papers" = research papers/publications/academic PDFs. count = number of papers (default 20).
- "dataset" = tabular data / rows for training or analysis. count = rows wanted (default 5000).
- "github" = repositories/source code in general. count = repos (default 10).
- "models" = the user wants a ready-built AI/ML MODEL (e.g. "a model that detects faces", "voice cloning model", "image generation model") — repos shipping weights. count = models (default 10).
- "edu" = exam prep / education: question papers, PYQs, sample papers, syllabus, admit cards, cut-offs, worksheets, sample questions for an exam or test (e.g. "TCS NQT papers", "JEE previous year papers", "class 10 maths worksheets"). count = files wanted (default 10).
- "jobs" = job postings, hiring, career opportunities, HR contact emails. count = job listings (default 10).
- "data_index" = comprehensive dataset directories, catalogues, sources with format/size/license info (e.g. "data sources for healthcare", "dataset directories"). count = sources (default 15).
- "images" = pictures/photos. count = images (default 30).
- "web" = scrape a specific site OR gather general info/pages about a topic. count = pages (default 5).
- "generic" = anything else concrete the user wants files of (songs, videos, books, software, icons, fonts, templates, apk, data dumps). count = items (default 6).
- query: strip "get me", "give me", "I want", counts, units, "for training", etc. Keep the noun phrase.`;
  try {
    const raw = await chat([
      { role: "system", content: system },
      { role: "user", content: ask },
    ], true);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as LlmIntent;
    if (!["papers", "dataset", "github", "images", "web", "edu", "models", "generic", "jobs", "data_index"].includes(parsed.kind)) return null;
    return parsed;
  } catch {
    return null;
  }
}
