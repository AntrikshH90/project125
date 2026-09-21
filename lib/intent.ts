// intent.ts — classify a free-text "I want X" into a plan without any LLM key.
// Pure heuristics: keywords, number extraction, domain detection. Zero dependencies.

export type Intent =
  | { kind: "papers"; topic: string; limit: number; wantPdfs: boolean }
  | { kind: "dataset"; query: string; rows: number }
  | { kind: "github"; query: string; limit: number }
  | { kind: "images"; query: string; limit: number }
  | { kind: "web"; query: string; url?: string; limit: number }
  | { kind: "edu"; topic: string; limit: number }
  | { kind: "models"; query: string; limit: number }
  | { kind: "generic"; query: string; limit: number }
  | { kind: "jobs"; query: string; limit: number }
  | { kind: "data_index"; query: string; limit: number }
  | { kind: "hr"; query: string; company?: string; limit: number }
  | { kind: "interview"; query: string; company?: string; limit: number }
  | { kind: "universal"; query: string; limit: number }
  | { kind: "unknown"; reason: string };

const NUM_RE = /(\d[\d,._]*\s*(?:k\b|lakh\b|million\b)?)/gi;

// LLM classification is used only when heuristics return "unknown",
async function llmFallback(rawInput: string): Promise<Intent | null> {
  try {
    const { classifyWithLLM, llmAvailable } = await import("./llm");
    if (!llmAvailable()) return null;
    const r = await classifyWithLLM(rawInput);
    if (!r || !r.query) return null;
    const kk = (r as any).kind as string;
    switch (kk) {
      case "papers": return { kind: "papers", topic: r.query, limit: clamp((r as any).count || 20, 1, 200), wantPdfs: true };
      case "dataset": return { kind: "dataset", query: r.query, rows: clamp((r as any).count || 5000, 100, 500000) };
      case "github": return { kind: "github", query: r.query, limit: clamp((r as any).count || 10, 1, 100) };
      case "images": return { kind: "images", query: r.query, limit: clamp((r as any).count || 30, 1, 200) };
      case "web": return { kind: "web", query: r.query, url: (r as any).url, limit: clamp((r as any).count || 5, 1, 8) };
      case "edu": return { kind: "edu", topic: r.query, limit: clamp((r as any).count || 10, 3, 60) };
      case "models": return { kind: "models", query: r.query, limit: clamp((r as any).count || 10, 3, 50) };
      case "generic": return { kind: "generic", query: r.query, limit: clamp((r as any).count || 6, 1, 20) };
      case "jobs": return { kind: "jobs", query: r.query, limit: clamp((r as any).count || 10, 5, 50) };
      case "data_index": return { kind: "data_index", query: r.query, limit: clamp((r as any).count || 15, 5, 80) };
      case "hr": return { kind: "hr", query: r.query, limit: clamp((r as any).count || 20, 5, 50) };
      case "interview": return { kind: "interview", query: r.query, limit: clamp((r as any).count || 30, 10, 100) };
      case "universal": return { kind: "universal", query: r.query, limit: clamp((r as any).count || 15, 5, 50) };
    }
  } catch { return null; }
  return null;
}

export async function classifySmart(rawInput: string): Promise<Intent> {
  const llm = await llmFallback(rawInput);
  if (llm) {
    if (llm.kind === "web" && !llm.url) {
      const direct = classify(rawInput);
      if (direct.kind === "web") (llm as any).url = (direct as any).url;
    }
    return llm;
  }
  return classify(rawInput);
}

function parseCount(text: string): number | null {
  const m = text.match(NUM_RE);
  if (!m) return null;
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
  if (/\b(com|org|net|io|dev|ai)\b$/i.test(u.replace(/\W+$/, ""))) return undefined;
  return u;
}

const PAPER_HINTS = [
  "paper", "papers", "research paper", "research papers", "arxiv", "publication", "publications", "journal", "citation",
];
const DATASET_HINTS = [
  "dataset", "datasets", "data set", "data rows", "rows", "training data",
  "train a model", "training a model", "csv", "jsonl", "parquet", "records",
  "tabular data", "scrape data", "data for ml", "machine learning data",
];
const GITHUB_HINTS = ["github", "repo", "repos", "repository", "code", "open source", "source code", "clone"];
const IMAGE_HINTS = ["image", "images", "photo", "photos", "picture", "pictures", "pic", "wallpaper", "poster"];
const WEB_HINTS = ["scrape", "extract from", "content from", "text from", "markdown", "crawl", "website", "page", "site"];
const EXAM_HINTS = ["exam", "question paper", "pyq", "previous year", "sample paper", "worksheet", "admit card", "syllabus", "cut-off", "entrance", "nqt", "gate", "jee", "neet", "cat", "ssc", "upsc", "ibps"];
const JOB_HINTS = ["job", "jobs", "hiring", "career", "careers", "position", "opening", "hire", "recruiting", "employment", "work"];
const DATA_INDEX_HINTS = ["data sources", "data directory", "data catalog"];
const HR_HINTS = [
  "hr mail","hr mails","hr email","hr emails","hr contact","hr contacts",
  "recruiter email","recruiter emails","recruiter contact","recruiter mails",
  "hiring manager","hiring manager email","talent acquisition","human resource",
  "human resources","careers email","jobs email","hr@","recruiter@"
];
const INTERVIEW_HINTS = [
  "interview question","interview questions","interview prep","coding interview","dsa question","dsa questions",
  "leetcode","interview experience","interview experiences","google interview","amazon interview","microsoft interview",
  "meta interview","faang interview","system design interview","behavioral interview","hr interview","technical interview",
  "interview q&a","questions and answers","q&a","mcq questions","quiz questions"
];

function hits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) if (text.includes(w)) n += w.length > 6 ? 2 : 1;
  return n;
}

function extractCompany(text: string): string | undefined {
  const companies = ["google","amazon","microsoft","meta","facebook","apple","netflix","uber","airbnb","flipkart","tcs","infosys","wipro","accenture","ibm","deloitte","capgemini","cognizant","byjus","swiggy","zomato","paytm","ola","linkedin","atlassian","adobe","salesforce","oracle","intel","nvidia","tesla","openai","deepmind"];
  const lower = text.toLowerCase();
  for (const c of companies) if (lower.includes(c)) return c;
  return undefined;
}

export function classify(rawInput: string): Intent {
  const text = " " + rawInput.toLowerCase().replace(/\s+/g, " ").trim() + " ";
  const count = parseCount(rawInput);
  const lower = rawInput.toLowerCase();

  // PRIORITY 1: HR — explicit
  for (const h of HR_HINTS) if (lower.includes(h)) {
    const company = extractCompany(lower);
    const strip = rawInput.toLowerCase().replace(/hr mails?|hr emails?|hr contacts?|recruiter.*|hiring manager.*/gi," ").replace(/\s+/g," ").trim();
    const q = strip || company || rawInput;
    return { kind: "hr", query: q || rawInput, company, limit: clamp(count || 20, 5, 50) };
  }
  // PRIORITY 2: Interview — explicit
  for (const h of INTERVIEW_HINTS) if (lower.includes(h)) {
    const company = extractCompany(lower);
    // keep the full query for interview search
    return { kind: "interview", query: rawInput, company, limit: clamp(count || 30, 10, 100) };
  }

  const scores = {
    papers: hits(text, PAPER_HINTS),
    dataset: hits(text, DATASET_HINTS),
    github: hits(text, GITHUB_HINTS),
    images: hits(text, IMAGE_HINTS) * 2,
    web: hits(text, WEB_HINTS),
    edu: hits(text, EXAM_HINTS) * 2,
    models: hits(text, ["model","models","ai model","ml model","llm","pretrained","foundation","generative"]) * 2,
    jobs: hits(text, JOB_HINTS),
    data_index: hits(text, DATA_INDEX_HINTS),
    hr: hits(text, HR_HINTS) * 3,
    interview: hits(text, INTERVIEW_HINTS) * 3,
  };

  const strip = (s: string) =>
    s.toLowerCase()
      .replace(/(?:please|kindly|can you|could you|i want|i need|give me|get me|find me|fetch me|download|scrape|collect|pull)\b/g, " ")
      .replace(/\b(?:all|the|some|any|of|for|about|on|related|top|latest|recent|best|new|free|me|related)\b/g, " ")
      .replace(NUM_RE, " ")
      .replace(/\b(k|lakh|million|rows?|pdfs?|papers?|images?|photos?|pictures?|pics?|repos?|repositories|dataset|datasets|pages?|items?|records?|files?|links?|with|give|want|need|find|fetch|top|about)\b/g, " ")
      .replace(/\s+/g, " ").trim();

  const url = detectUrl(rawInput);
  if (url && /github\.com\//i.test(url)) {
    const query = strip(rawInput) || url.split("github.com/")[1] || "scraping";
    return { kind: "github", query, limit: Math.min(count || 10, 100) };
  }

  const examPattern = /previous year|pyq|question paper|sample paper|nqt|gate|jee|neet|entrance exam|class\s+\d+\s+exam/i.test(rawInput);
  if (examPattern) return { kind: "edu", topic: strip(rawInput) || rawInput, limit: clamp(count || 10, 3, 60) };

  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  entries.sort((a,b)=> b[1]-a[1]);
  const topKind = entries[0][0];
  const topScore = entries[0][1];

  // if HR or Interview top, route there
  if (topKind==="hr" && topScore>0) {
    const company = extractCompany(lower);
    return { kind: "hr", query: strip(rawInput) || rawInput, company, limit: clamp(count || 20, 5, 50) };
  }
  if (topKind==="interview" && topScore>0) {
    const company = extractCompany(lower);
    return { kind: "interview", query: rawInput, company, limit: clamp(count || 30, 10, 100) };
  }

  if (topScore === 0) {
    if (url) return { kind: "web", query: strip(rawInput) || url, url, limit: 1 };
    // UNIVERSAL FALLBACK — never unknown for non-empty queries
    if (rawInput.trim().length >= 3) {
      return { kind: "universal", query: rawInput, limit: clamp(count || 15, 5, 50) };
    }
    return { kind: "unknown", reason: "Tell me what you want: e.g. 'google interview questions', 'hr mails for amazon', '20 papers on diffusion models'" };
  }

  switch (topKind) {
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
    case "edu": {
      const topic = strip(rawInput) || rawInput;
      return { kind: "edu", topic, limit: clamp(count || 10, 3, 60) };
    }
    case "models": {
      const query = strip(rawInput) || rawInput;
      return { kind: "models", query, limit: clamp(count || 10, 3, 50) };
    }
    case "jobs": {
      const query = strip(rawInput) || rawInput;
      return { kind: "jobs", query, limit: clamp(count || 10, 5, 50) };
    }
    case "data_index": {
      const query = strip(rawInput) || rawInput;
      return { kind: "data_index", query, limit: clamp(count || 15, 5, 80) };
    }
    case "hr": {
      const company = extractCompany(lower);
      return { kind: "hr", query: strip(rawInput) || rawInput, company, limit: clamp(count || 20, 5, 50) };
    }
    case "interview": {
      const company = extractCompany(lower);
      return { kind: "interview", query: rawInput, company, limit: clamp(count || 30, 10, 100) };
    }
    default: {
      // universal fallback
      return { kind: "universal", query: rawInput, limit: clamp(count || 15, 5, 50) };
    }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function describePlan(i: Intent): string {
  switch (i.kind) {
    case "papers": return `Searching arXiv, Crossref & OpenAlex for up to ${i.limit} papers on "${i.topic}", downloading PDFs where available + metadata CSV/BibTeX.`;
    case "dataset": return `Finding a public dataset matching "${i.query}" and pulling ~${i.rows.toLocaleString()} rows to CSV/JSONL/Parquet.`;
    case "github": return `Searching GitHub for ${i.limit} repos matching "${i.query}" + metadata CSV, with READMEs.`;
    case "images": return `Searching Openverse/Wikimedia for ${i.limit} images of "${i.query}" + URLs CSV.`;
    case "web": return i.url ? `Scraping ${i.url} → markdown.` : `Searching the web for "${i.query}" → top results scraped to markdown.`;
    case "edu": return `Finding exam-prep papers, syllabi, and PYQs for ${i.topic} → PDFs + markdown + sources list.`;
    case "models": return `Searching GitHub for ready-built AI/ML models matching "${i.query}" + CSV/HTML comparison.`;
    case "generic": return `Searching the web for files about "${i.query}" + scraped pages.`;
    case "jobs": return `Searching job boards for "${i.query}" — postings with company, location, salary, and HR emails.`;
    case "data_index": return `Dataset discovery for "${i.query}" — formats, sizes, licenses from HF/Kaggle.`;
    case "hr": return `Hunting HR/recruiter emails for "${i.company || i.query}" — scraping career pages, extracting emails, generating patterns + verified sources.`;
    case "interview": return `Collecting interview Q&A for "${i.query}"${i.company?` @ ${i.company}`:""} — web scrape + GitHub awesome lists + PDFs → CSV + markdown + repos.`;
    case "universal": return `Universal harvest for "${i.query}" — web search + GitHub + papers + datasets bundled (always returns files).`;
    case "unknown": return i.reason;
  }
}
