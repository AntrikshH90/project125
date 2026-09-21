// sources/papers.ts — arXiv + Crossref + OpenAlex: search papers, download PDFs, emit CSV + BibTeX.

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store.js";

const UA = "instant-scraper/1.0 (research dataset tool; mailto:antrikshyadav97@gmail.com)";

export interface PaperRec {
  title: string;
  authors: string;
  year: string;
  venue: string;
  abstract: string;
  pdfUrl: string;
  landingUrl: string;
  doi: string;
  source: "arxiv" | "crossref" | "openalex" | "s2";
  id: string;
}

async function jget(url: string, headers: Record<string, string> = {}, timeoutMs = 20000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 80)}`);
    return await r.json() as any;
  } finally { clearTimeout(t); }
}

export async function searchArxiv(query: string, limit: number): Promise<PaperRec[]> {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(`all:${query}`)}&start=0&max_results=${Math.min(limit, 200)}&sortBy=relevance`;
  let xml = "";
  // arXiv export API frequently 503s or stalls under load — timeout + retry with backoff
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ctl = new AbortController();
    const killer = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: ctl.signal });
      if (r.ok) { xml = await r.text(); break; }
      if (attempt === 4) throw new Error(`arxiv API ${r.status}`);
    } catch (e: any) {
      if (attempt === 4) throw new Error(`arxiv API unreachable: ${e?.message ?? e}`);
    } finally {
      clearTimeout(killer);
    }
    await new Promise((res) => setTimeout(res, attempt * 3000));
  }
  const recs: PaperRec[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries) {
    const pick = (tag: string) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").trim();
    const pdfUrl = (e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)?.[1] ?? "").trim();
    const landing = pick("id");
    const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]).join("; ");
    const id = landing.replace("http://", "https://").split("/abs/")[1] ?? landing;
    recs.push({
      title: pick("title").replace(/\s+/g, " "),
      authors,
      year: (pick("published").match(/\d{4}/) ?? [""])[0],
      venue: "arXiv",
      abstract: pick("summary").replace(/\s+/g, " ").slice(0, 1500),
      pdfUrl: pdfUrl || (id ? `https://arxiv.org/pdf/${id}` : ""),
      landingUrl: landing,
      doi: "",
      source: "arxiv",
      id: id || landing,
    });
  }
  return recs;
}

export async function searchOpenAlex(query: string, limit: number): Promise<PaperRec[]> {
  const out: PaperRec[] = [];
  let cursor = "*";
  const perPage = Math.min(limit, 200);
  while (out.length < limit) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}&cursor=${cursor}&mailto=antrikshyadav97@gmail.com`;
    const j = await jget(url);
    for (const w of j.results ?? []) {
      out.push({
        title: w.title ?? "",
        authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean).join("; "),
        year: String(w.publication_year ?? ""),
        venue: (w.primary_location?.source?.display_name ?? "").slice(0, 120),
        abstract: "",
        pdfUrl: w.open_access?.oa_url ?? w.best_oa_location?.pdf_url ?? "",
        landingUrl: w.doi ? `https://doi.org/${w.doi}` : (w.primary_location?.landing_page_url ?? ""),
        doi: w.doi ?? "",
        source: "openalex",
        id: w.id ?? "",
      } as any);
    }
    cursor = j.meta?.next_cursor;
    if (!cursor) break;
  }
  return out.slice(0, limit);
}

export async function searchSemanticScholar(query: string, limit: number): Promise<PaperRec[]> {
  const fields = "title,authors,year,venue,abstract,externalIds,openAccessPdf,url";
  let all: PaperRec[] = [];
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=${Math.min(limit, 100)}`;
    const j = await jget(url, {}, 25000);
    for (const w of j.data ?? []) {
      const doi = w.externalIds?.DOI ?? "";
      const arxivId = w.externalIds?.ArXiv ?? "";
      all.push({
        title: w.title ?? "",
        authors: (w.authors ?? []).map((a: any) => a.name).join("; "),
        year: String(w.year ?? ""),
        venue: (w.venue ?? "").slice(0, 120),
        abstract: (w.abstract ?? "").slice(0, 1500),
        pdfUrl: w.openAccessPdf?.url ?? "",
        landingUrl: w.url ?? (doi ? `https://doi.org/${doi}` : arxivId ? `https://arxiv.org/abs/${arxivId}` : ""),
        doi,
        source: "s2",
        id: arxivId || doi || (w.paperId ?? ""),
      });
    }
  } catch { /* S2 rate-limits keyless use; it's a bonus source */ }
  return all;
}

export async function searchCrossref(query: string, limit: number): Promise<PaperRec[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${Math.min(limit, 100)}&select=title,author,issued,container-title,DOI,URL&mailto=antrikshyadav97@gmail.com`;
  const j = await jget(url);
  return (j.message?.items ?? []).map((it: any): PaperRec => ({
    title: (it.title ?? [""])[0] ?? "",
    authors: (it.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).join("; "),
    year: String(it.issued?.["date-parts"]?.[0]?.[0] ?? ""),
    venue: (it["container-title"] ?? [""])[0] ?? "",
    abstract: "",
    pdfUrl: "",
    landingUrl: `https://doi.org/${it.DOI}`,
    doi: it.DOI ?? "",
    source: "crossref",
    id: it.DOI ?? "",
  }));
}

// Merge + dedupe by normalized title.
export function mergePapers(...lists: PaperRec[][]): PaperRec[] {
  const seen = new Set<string>();
  const out: PaperRec[] = [];
  for (const list of lists) for (const p of list) {
    const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function downloadPdfs(jobId: string, papers: PaperRec[], want: number): Promise<number> {
  const dir = jobDir(jobId);
  let got = 0;
  const CONC = 5;
  const queue = papers.filter((p) => p.pdfUrl).slice(0, want);
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const my = idx++;
      const p = queue[my];
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 60000);
        const r = await fetch(p.pdfUrl, { headers: { "user-agent": UA }, signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(String(r.status));
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 5000) throw new Error("too small");
        // %PDF header can sit a bit into the file (leading junk/redirect stubs)
        if (!buf.subarray(0, 1024).includes(Buffer.from("%PDF"))) throw new Error("not a pdf");
        const safe = p.id.replace(/[^a-zA-Z0-9._-]/g, "_") || `paper-${my}`;
        fs.writeFileSync(path.join(dir, `${safe}.pdf`), buf);
        got++;
        update(jobId, { itemsDone: got });
        if (got % 10 === 0) log(jobId, `downloaded ${got} PDFs`);
      } catch (e: any) {
        // skip quietly, count as attempted
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  return got;
}

// -------- PDF URL resolution via Unpaywall (keyless, needs email param) --------

export async function resolvePdfUrls(jobId: string, papers: PaperRec[], max = 40): Promise<void> {
  const targets = papers.filter((p) => p.doi && !p.pdfUrl).slice(0, max);
  if (targets.length === 0) return;
  log(jobId, `resolving OA PDF links for ${targets.length} papers via Unpaywall`);
  const CONC = 6;
  let idx = 0;
  let found = 0;
  async function w() {
    while (idx < targets.length) {
      const p = targets[idx++];
      try {
        const j = await jget(`https://api.unpaywall.org/v2/${encodeURIComponent(p.doi)}?email=antrikshyadav97@gmail.com`, {}, 15000);
        const loc = j.best_oa_location;
        if (loc?.url_for_pdf) { p.pdfUrl = loc.url_for_pdf; found++; }
        else if (loc?.url && /\.pdf(\?|$)/i.test(loc.url)) { p.pdfUrl = loc.url; found++; }
      } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: CONC }, w));
  log(jobId, `unpaywall: found ${found} direct PDF links`);
}

// -------- serialization helpers --------

function csvEscape(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function papersToCsv(papers: PaperRec[]): string {
  const head = ["title", "authors", "year", "venue", "doi", "pdfUrl", "landingUrl", "abstract", "source", "id"];
  const lines = [head.join(",")];
  for (const p of papers) lines.push([p.title, p.authors, p.year, p.venue, p.doi, p.pdfUrl, p.landingUrl, p.abstract, p.source, p.id].map(csvEscape).join(","));
  return lines.join("\n");
}

function bibtexType(p: PaperRec): string {
  return p.source === "arxiv" ? "@misc" : "@article";
}

export function papersToBibtex(papers: PaperRec[]): string {
  const out: string[] = [];
  const used = new Set<string>();
  for (const p of papers) {
    if (!p.title) continue;
    let key = (p.authors.split(";")[0]?.split(" ").pop() || "anon").replace(/\W/g, "") + (p.year || "nd");
    while (used.has(key)) key += "x";
    used.add(key);
    out.push(
      `${bibtexType(p)}{${key},\n  title = {${p.title}},\n  author = {${p.authors.replace(/; /g, " and ")}},\n  year = {${p.year}},\n  journal = {${p.venue}},\n  doi = {${p.doi}},\n  url = {${p.landingUrl}},\n}`
    );
  }
  return out.join("\n\n");
}
