// intent.ts — classify a free-text "I want X" into a plan without any LLM key.
// Pure heuristics: keywords, number extraction, domain detection. Zero dependencies.

export type Intent =
  | { kind: "papers"; topic: string; limit: number; wantPdfs: boolean }
  | { kind: "dataset"; query: string; rows: number }
  | { kind: "github"; query: string; limit: number }
  | { kind: "images"; query: string; limit: number }
  | { kind: "web"; query: string; url?: string; limit: number }
  | { kind: "unknown"; reason: string };

const NUM_RE = /(\d[\d,._]*\s*(?:k\b|lakh\b|million\b)?)/gi;

// LLM classification is used only when heuristics return "unknown",
// so the app remains fully keyless-capable.
async function llmFallback(rawInput: string): Promise<Intent | null> {
  try {
    const { classifyWithLLM, llmAvailable } = await import("./llm.js");
    if (!llmAvailable()) return null;
    const r = await classifyWithLLM(rawInput);
    if (!r || !r.query) return null;
    switch (r.kind) {
      case "papers": return { kind: "papers", topic: r.query, limit: clamp(r.count || 20, 1, 200), wantPdfs: true };
      case "dataset": return { kind: "dataset", query: r.query, rows: clamp(r.count || 5000, 100, 500000) };
      case "github": return { kind: "github", query: r.query, limit: clamp(r.count || 10, 1, 100) };
      case "images": return { kind: "images", query: r.query, limit: clamp(r.count || 30, 1, 200) };
      case "web": return { kind: "web", query: r.query, url: r.url, limit: clamp(r.count || 5, 1, 8) };
    }
  } catch { return null; }
  return null;
}

export async function classifySmart(rawInput: string): Promise<Intent> {
  // LLM leads when configured (better query cleaning, e.g. Hinglish/fuzzy asks);
  // heuristics are the keyless fallback and safety net.
  const llm = await llmFallback(rawInput);
  if (llm) {
    // keep URL detection from heuristics for web mode if LLM missed it
    if (llm.kind === "web" && !llm.url) {
      const direct = classify(rawInput);
      if (direct.kind === "web") llm.url = direct.url;
    }
    return llm;
  }
  return classify(rawInput);
}

function parseCount(text: string): number | null {
  const m = text.match(NUM_RE);
  if (!m) return null;
  // take the last number-ish token (usually the count: "200000 rows", "50 pdfs")
  const raw = m[m.length - 1].trim().toLowerCase().replace(/[, _]/g, "");
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  if (raw.endsWith("k")) return n * 1000;
  if (raw.endsWith("lakh")) return n * 100000;
  if (raw.endsWith("million")) return n * 1000000;
  return n;
}

const URL_RE = /(https?:\/\/[^\s"'<>]+|www\.[^\s"'<>]+|\b[a-z0-9-]+\.(com|org|net|io|edu|gov|ai|dev|co|app|in)\b(\/[^\s"'<>]*)?)/i;

function detectUrl(text: string): string | undefined {
  const m = text.match(URL_RE);
  if (!m) return undefined;
  let u = m[0];
  if (!/^https?:\/\//.test(u)) u = "https://" + u;
  // skip obvious non-pages
  if (/\b(com|org|net|io|dev|ai)\b$/i.test(u.replace(/\W+$/, ""))) return undefined;
  return u;
}

const PAPER_HINTS = [
  "paper", "papers", "research paper", "research papers", "arxiv", "pdf", "pdfs",
  "publication", "publications", "journal", "article", "articles", "study",
  "thesis", "literature", "survey paper", "preprint", "citation",
];
const DATASET_HINTS = [
  "dataset", "datasets", "data set", "data rows", "rows", "training data",
  "train a model", "training a model", "csv", "jsonl", "parquet", "records",
  "tabular data", "scrape data", "data for ml", "machine learning data",
];
const GITHUB_HINTS = ["github", "repo", "repos", "repository", "code", "open source", "source code", "clone"];
const IMAGE_HINTS = ["image", "images", "photo", "photos", "picture", "pictures", "pic", "wallpaper", "poster"];
const WEB_HINTS = ["scrape", "extract from", "content from", "text from", "markdown", "crawl", "website", "page", "site"];

function hits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) if (text.includes(w)) n += w.length > 6 ? 2 : 1;
  return n;
}

export function classify(rawInput: string): Intent {
  const text = " " + rawInput.toLowerCase().replace(/\s+/g, " ").trim() + " ";
  const count = parseCount(rawInput);

  const scores = {
    papers: hits(text, PAPER_HINTS),
    dataset: hits(text, DATASET_HINTS),
    github: hits(text, GITHUB_HINTS),
    images: hits(text, IMAGE_HINTS),
    web: hits(text, WEB_HINTS),
  };

  // strip hint words + count words to get the core "thing" name
  const strip = (s: string) =>
    s
      .toLowerCase()
      .replace(/(?:please|kindly|can you|could you|i want|i need|give me|get me|find me|fetch me|download|scrape|collect|pull)\b/g, " ")
      .replace(/\b(?:all|the|some|any|of|for|about|on|related|top|latest|recent|best|new|free|me|related)\b/g, " ")
      .replace(NUM_RE, " ")
      .replace(/\b(k|lakh|million|rows?|pdfs?|papers?|images?|photos?|pictures?|pics?|repos?|repositories|dataset|datasets|pages?|items?|records?|files?|links?|with|give|want|need|find|fetch|top|about)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // GitHub can also be a URL — handle repo URL as github intent
  const url = detectUrl(rawInput);
  if (url && /github\.com\//i.test(url)) {
    const query = strip(rawInput) || url.split("github.com/")[1] || "scraping";
    return { kind: "github", query, limit: Math.min(count || 10, 100) };
  }

  const top = (Object.entries(scores) as [keyof typeof scores, number][]).sort((a, b) => b[1] - a[1]);
  if (top[0][1] === 0) {
    // no hints at all — if there's a URL, treat as web scrape
    if (url) return { kind: "web", query: strip(rawInput) || url, url, limit: 1 };
    // otherwise guess papers by default? no — unknown
    return { kind: "unknown", reason: "Tell me what you want: papers (with PDFs), dataset rows, GitHub repos, images, or a website URL to scrape." };
  }

  switch (top[0][0]) {
    case "papers": {
      const topic = strip(rawInput) || rawInput;
      return { kind: "papers", topic, limit: clamp(count || 20, 1, 200), wantPdfs: true };
    }
    case "dataset": {
      const query = strip(rawInput) || rawInput;
      return { kind: "dataset", query, rows: clamp(count || 1000, 100, 500000) };
    }
    case "github": {
      const query = strip(rawInput) || rawInput;
      return { kind: "github", query, limit: clamp(count || 10, 1, 100) };
    }
    case "images": {
      const query = strip(rawInput) || rawInput;
      return { kind: "images", query, limit: clamp(count || 30, 1, 200) };
    }
    case "web": {
      const query = strip(rawInput) || url || rawInput;
      return { kind: "web", query, url, limit: Math.max(count || 1, 1) };
    }
  }
  return { kind: "unknown", reason: "Could not classify. Try: '50 papers on transformers with PDFs', '200000 rows movie reviews dataset', 'github repos for web scraping'." };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// What the UI shows the user about how we interpreted their ask.
export function describePlan(i: Intent): string {
  switch (i.kind) {
    case "papers": return `Searching arXiv, Crossref & OpenAlex for up to ${i.limit} papers on "${i.topic}", downloading PDFs where available + metadata CSV/BibTeX.`;
    case "dataset": return `Finding a public dataset matching "${i.query}" and pulling ~${i.rows.toLocaleString()} rows to CSV/JSONL/Parquet.`;
    case "github": return `Searching GitHub for ${i.limit} repos matching "${i.query}" + metadata CSV, with optional ZIP of READMEs.`;
    case "images": return `Searching Openverse/Wikimedia for ${i.limit} images of "${i.query}" (keyless, CC-licensed) + URLs CSV.`;
    case "web": return i.url ? `Scraping ${i.url} (single page → markdown + JSON).` : `Searching the web for "${i.query}" (DuckDuckGo HTML + top results scraped to markdown).`;
    case "unknown": return i.reason;
  }
}
