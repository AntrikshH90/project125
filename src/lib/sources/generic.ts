// sources/generic.ts — the catch-all: any ask we can't pin to a specialist mode.
// Strategy: web-search the ask, harvest direct file links (pdf/mp3/mp4/zip/csv/data)
// AND scrape the most relevant pages to markdown. Always ships sources.html + CSV.

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { log, update, jobDir } from "../store";
import { scrapePage, duckSearch, SearchResult } from "./web";
import { fetchAndSaveBinary, writeCsv, downloadConcurrent, slug, sanitizeName } from "./fetchers";
import { UA } from "./fetchers";

export interface GenericPack { files: number; pages: number; sources: number }

const DOC_RE = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|csv|zip|mp3|mp4|wav|txt|json)(\?|#|$)/i;

async function harvest(url: string): Promise<{ files: { url: string; title: string }[]; pages: { title: string; url: string }[] }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  let html: string;
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } finally { clearTimeout(t); }
  const $ = cheerio.load(html);
  const files: { url: string; title: string }[] = [];
  const pages: { title: string; url: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = ($(el).text() || "").trim().slice(0, 140);
    let abs: string;
    try { abs = new URL(href, url).href; } catch { return; }
    if (!/^https?:/i.test(abs) || abs.includes("javascript:")) return;
    if (DOC_RE.test(abs)) files.push({ url: abs, title: text });
    else if (text.length > 3) pages.push({ title: text, url: abs });
  });
  return { files, pages };
}

export async function runGenericJob(jobId: string, ask: string, limit: number): Promise<GenericPack> {
  const dir = jobDir(jobId);
  log(jobId, `generic mode — "${ask}"`);
  update(jobId, { stage: "searching the web", progress: 8, itemsTotal: limit });

  const seen = new Set<string>();
  const fileUrls = new Map<string, string>();
  const pages: { title: string; url: string }[] = [];

  for (const q of [ask, `${ask} download`, `${ask} pdf`]) {
    let results: { title: string; url: string; snippet: string }[] = [];
    try { results = await duckSearch(q); } catch (e: any) { log(jobId, `search failed: ${e.message}`); continue; }
    log(jobId, `"${q}" → ${results.length} hits`);
    for (const r of results.slice(0, 6)) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      if (DOC_RE.test(r.url)) { fileUrls.set(r.url, r.title); continue; }
      try {
        const h = await harvest(r.url);
        for (const f of h.files) if (!fileUrls.has(f.url)) fileUrls.set(f.url, f.title || r.title);
        if (h.files.length || r.snippet) pages.push({ title: r.title, url: r.url });
      } catch { pages.push({ title: r.title, url: r.url }); }
    }
  }
  log(jobId, `${fileUrls.size} file links, ${pages.length} pages`);

  // download the files
  update(jobId, { stage: "downloading files", progress: 35 });
  const tasks = [...fileUrls.entries()].slice(0, Math.max(4, limit)).map(([url, title]) => async () => {
    const res = await fetchAndSaveBinary(jobId, url, sanitizeName(title || "file"));
    if (res.ok) log(jobId, `saved ${res.file}`);
    else throw new Error(res.reason ?? "fail");
  });
  const dl = await downloadConcurrent(jobId, tasks, Math.max(4, limit), 5);

  // scrape pages to markdown
  update(jobId, { stage: "scraping pages", progress: 70 });
  let pagesSaved = 0;
  for (const p of pages.slice(0, Math.max(2, Math.min(limit, 8)))) {
    try {
      const rec = await scrapePage(p.url, 30000);
      if (rec.textChars < 300) throw new Error("thin");
      fs.writeFileSync(path.join(dir, `page-${String(pagesSaved + 1).padStart(2, "0")}-${slug(p.title) || "result"}.md`), `# ${rec.title}\n\n> source: ${p.url}\n\n${rec.markdown}`);
      pagesSaved++;
    } catch (e: any) {
      log(jobId, `scrape skip: ${String(e.message).slice(0, 60)}`);
    }
  }

  // sources.html + CSV always
  const all = [...fileUrls.entries()].map(([url, title]) => ({ url, title, kind: url.match(DOC_RE)?.[1] ?? "page" }));
  const li = all.slice(0, 60).map((l) => `<li><a href="${l.url}">${escapeHtml(l.title || l.url)}</a></li>`).join("\n");
  fs.writeFileSync(path.join(dir, "sources.html"), `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ask)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;line-height:1.5}li{margin:8px 0}small{color:#666}</style>
</head><body><h1>Sources — ${escapeHtml(ask)}</h1>
<p>${dl.ok} files downloaded, ${pagesSaved} pages scraped, ${all.length} source links total.</p>
<h2>Direct files found</h2><ul>${li || "<li>—</li>"}</ul>
<h2>Pages</h2><ul>${pages.slice(0, 40).map((p) => `<li><a href="${p.url}">${escapeHtml(p.title)}</a></li>`).join("\n") || "<li>—</li>"}</ul>
</body></html>`);
  writeCsv(path.join(dir, "sources.csv"), ["title", "url", "type"], all.map((l) => [l.title, l.url, l.kind]));

  update(jobId, { preview: [{ files: dl.ok, pagesScraped: pagesSaved, sources: all.length }], itemsDone: dl.ok + pagesSaved });
  return { files: dl.ok, pages: pagesSaved, sources: all.length };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
