// sources/edu.ts — exam-prep mode: "give me TCS NQT papers" → PYQs, sample papers,
// syllabus, answer keys, cutoff lists. Site-agnostic: search real sources (DuckDuckGo),
// harvest direct PDF/doc links from the promising hits, download them, scrape
// question-listing pages to markdown, and always write a curated sources.html +
// master CSV so the user gets usable output even when prep sites block bots.

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { log, update, jobDir } from "../store";
import { scrapePage, duckSearch, SearchResult } from "./web";
import { fetchAndSaveBinary, writeCsv, downloadConcurrent, slug, sanitizeName } from "./fetchers";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface EduPack {
  saved: number;       // pdf/doc files downloaded
  pages: number;       // pages scraped to markdown
  sources: number;     // total usable source links in sources.html
}

// Known exam families → trusted hosts (rank boost + fallback scraping targets)
const EXAM_HOSTS: Record<string, string[]> = {
  "tcs nqt": ["tcs.com", "learning.tcsionhub.in", "prepinsta.com", "prepfully.com", "prefreshers.in"],
  "nqt": ["tcs.com", "learning.tcsionhub.in", "prepinsta.com"],
  "infosys": ["infosys.com", "prepinsta.com"],
  "wipro": ["wipro.com", "prepinsta.com"],
  "accenture": ["accenture.com", "prepinsta.com"],
  "amcat": ["myamcat.com", "prepinsta.com"],
  "gate": ["gate.iitk.ac.in", "iitg.ac.in", "prepinsta.com", "madeeasy.in"],
  "jee": ["jeemain.nta.nic.in", "nta.ac.in", "allen.ac.in"],
  "neet": ["neet.nta.nic.in", "nta.ac.in"],
  "cat": ["iimcat.ac.in", "prepinsta.com"],
  "ssc": ["ssc.nic.in", "prepinsta.com"],
  "upsc": ["upsc.gov.in", "prepinsta.com"],
  "ibps": ["ibps.in"],
  "gate cse": ["gate.iitk.ac.in", "prepinsta.com"],
  "placement": ["prepinsta.com", "indiaexam.in"],
};

function hostsFor(topic: string): { label: string; hosts: string[] } {
  const t = topic.toLowerCase();
  for (const key of Object.keys(EXAM_HOSTS)) {
    if (t.includes(key)) return { label: key.toUpperCase(), hosts: EXAM_HOSTS[key] };
  }
  return { label: topic, hosts: [] };
}

function buildQueries(topic: string): string[] {
  const t = topic.replace(/\b(papers?|pdfs?|pyq|pyqs|questions?|download|previous|year|latest|with|and|give|me|get|find)\b/gi, " ").replace(/\s+/g, " ").trim();
  const base = t || topic;
  return [
    `${base} previous year question papers pdf`,
    `${base} sample papers pdf download`,
    `${base} syllabus pdf`,
    `${base} question paper with solutions pdf`,
    `${base} exam pattern and syllabus`,
  ];
}

/** Collect PDF/doc links + internal pages from a results/hub page. */
async function harvestLinks(url: string): Promise<{ pdfs: string[]; pages: { title: string; url: string }[] }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  let html: string;
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } finally { clearTimeout(t); }
  const $ = cheerio.load(html);
  const pdfs: string[] = [];
  const pages: { title: string; url: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = ($(el).text() || "").trim().slice(0, 140);
    let abs: string;
    try { abs = new URL(href, url).href; } catch { return; }
    if (!/^https?:/i.test(abs) || abs.includes("javascript:")) return;
    if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)(\?|#|$)/i.test(abs)) pdfs.push(abs);
    else if (text.length > 3) pages.push({ title: text, url: abs });
  });
  return { pdfs: [...new Set(pdfs)].slice(0, 50), pages: pages.slice(0, 40) };
}

export async function runEduJob(jobId: string, topic: string, limit: number): Promise<EduPack> {
  const dir = jobDir(jobId);
  const { label, hosts } = hostsFor(topic);
  log(jobId, `edu mode — "${topic}"${label !== topic ? ` [${label}]` : ""}`);

  const seenUrl = new Set<string>();
  const docUrls = new Map<string, string>(); // url → source title
  const contentPages: { title: string; url: string; known: boolean }[] = [];
  update(jobId, { stage: "searching exam-prep sources", progress: 8, itemsTotal: limit });

  // 1) search + harvest
  for (const q of buildQueries(topic)) {
    let results: SearchResult[] = [];
    try { results = await duckSearch(q); } catch (e: any) { log(jobId, `search failed: ${e.message}`); continue; }
    log(jobId, `"${q}" → ${results.length} hits`);
    for (const r of results.slice(0, 8)) {
      if (seenUrl.has(r.url)) continue;
      seenUrl.add(r.url);
      const known = hosts.some((h) => r.url.includes(h));
      try {
        const { pdfs, pages } = await harvestLinks(r.url);
        for (const p of pdfs) if (!docUrls.has(p)) docUrls.set(p, r.title);
        const looksRelevant = /question|paper|syllabus|pyq|previous|cutoff|mock|pattern|answer/i.test(r.title + " " + r.snippet);
        if (pdfs.length || looksRelevant || known) contentPages.push({ title: r.title, url: r.url, known });
        if (pdfs.length) log(jobId, `${new URL(r.url).hostname}: ${pdfs.length} doc links`);
      } catch (e: any) {
        if (known) contentPages.push({ title: r.title, url: r.url, known });
      }
    }
  }
  log(jobId, `${docUrls.size} doc links, ${contentPages.length} content pages harvested`);

  // 2) download docs concurrently (most valuable first: PDFs from known hosts)
  update(jobId, { stage: "downloading papers & PDFs", progress: 30 });
  const sorted = [...docUrls.entries()].sort((a, b) => {
    const ka = hosts.some((h) => a[0].includes(h)) ? 1 : 0;
    const kb = hosts.some((h) => b[0].includes(h)) ? 1 : 0;
    return kb - ka;
  });
  const docTasks = sorted.slice(0, Math.max(limit * 2, 12)).map(([url, title]) => async () => {
    const res = await fetchAndSaveBinary(jobId, url, sanitizeName(title || label));
    if (res.ok) log(jobId, `saved ${res.file} (${Math.round((res.bytes ?? 0) / 1024)} KB)`);
    else throw new Error(res.reason ?? "failed");
  });
  const dl = await downloadConcurrent(jobId, docTasks, Math.max(3, limit * 2), 5);
  log(jobId, `downloaded ${dl.ok} docs (${dl.failed} failed/skipped)`);

  // 3) scrape content pages that had no PDFs (question lists, syllabus text, cutoffs)
  update(jobId, { stage: "scraping question & syllabus pages", progress: 65 });
  const scrapeTargets = contentPages
    .sort((a, b) => Number(b.known) - Number(a.known))
    .slice(0, Math.max(2, Math.min(limit, 8)));
  let pagesSaved = 0;
  const pageRows: any[][] = [];
  for (const target of scrapeTargets) {
    try {
      const rec = await scrapePage(target.url, 30000);
      if (rec.textChars < 400) throw new Error("thin content");
      const safe = `page-${String(pagesSaved + 1).padStart(2, "0")}-${slug(target.title) || "result"}.md`;
      fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${target.url}\n\n${rec.markdown}`);
      pageRows.push([rec.title, target.url, rec.textChars]);
      pagesSaved++;
      update(jobId, { itemsDone: dl.ok + pagesSaved });
    } catch (e: any) {
      log(jobId, `scrape skip: ${String(e.message).slice(0, 70)}`);
    }
  }

  // 4) ALWAYS write curated sources.html + master CSV — usable even if downloads were blocked
  const allLinks = [
    ...sorted.map(([url, title]) => ({ url, title: title || url, kind: url.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)(\?|$)/i)?.[1] ?? "page" })),
    ...contentPages.filter((p) => !docUrls.has(p.url)).map((p) => ({ url: p.url, title: p.title, kind: "page" })),
  ];
  const li = allLinks.slice(0, 60).map((l) =>
    `<li><span class="k ${l.kind}">${l.kind.toUpperCase()}</span> <a href="${l.url}">${escapeHtml(l.title || l.url)}</a><br><small>${escapeHtml(l.url.slice(0, 100))}</small></li>`
  ).join("\n");
  const examName = escapeHtml(topic);
  fs.writeFileSync(path.join(dir, "sources.html"), `<!doctype html>
<html><head><meta charset="utf-8"><title>${examName} — sources</title><style>
body{font-family:system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;line-height:1.5}
li{margin:10px 0}small{color:#666}.k{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;color:#fff;margin-right:6px}
.k.pdf{background:#c0392b}.k.doc{background:#2980b9}.k.ppt{background:#e67e22}.k.xls{background:#27ae60}.k.zip{background:#8e44ad}.k.page{background:#555}
</style></head><body>
<h1>Exam prep sources — ${examName}</h1>
<p>${allLinks.length} sources found${dl.ok ? `, ${dl.ok} files downloaded into this folder` : " (downloads blocked by sites — open links directly)"}.</p>
<h2>Direct documents</h2>
<ul>
${li}
</ul>
<h2>Pages scraped / worth reading</h2>
<ul>${pageRows.map((r) => `<li><a href="${r[1]}">${escapeHtml(String(r[0]))}</a></li>`).join("\n") || "<li>—</li>"}</ul>
</body></html>`);

  writeCsv(
    path.join(dir, "edu-sources.csv"),
    ["title", "url", "type", "downloaded"],
    allLinks.map((l) => [l.title, l.url, l.kind, "n/a"]) as any[][]
  );

  update(jobId, {
    preview: [
      { files: dl.ok, failedOrBlocked: dl.failed, pagesScraped: pagesSaved, sourcesListed: allLinks.length },
    ],
    itemsDone: dl.ok + pagesSaved,
  });
  return { saved: dl.ok, pages: pagesSaved, sources: allLinks.length };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
