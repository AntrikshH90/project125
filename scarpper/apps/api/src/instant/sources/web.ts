// sources/web.ts — generic web scraping: URL → clean markdown + JSON, or topic search via DuckDuckGo HTML.

import fs from "node:fs";
import path from "node:path";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import { log, jobDir, update } from "../store.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

export interface WebRec {
  title: string;
  url: string;
  markdown: string;
  textChars: number;
  links: number;
  tables: number;
}

export async function scrapePage(url: string, timeoutMs = 45000): Promise<WebRec> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let html: string;
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: ctl.signal,
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } finally { clearTimeout(t); }

  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, footer, header, aside, form").remove();
  const title = $("title").text().trim() || url;
  const bodyHtml = $("article").first().html() || $("main").first().html() || $("body").html() || html;
  let markdown: string;
  try {
    markdown = td.turndown(bodyHtml ?? "");
  } catch {
    markdown = $("body").text().replace(/\n{3,}/g, "\n\n");
  }
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
  const linksBefore = ($("a").length);
  return {
    title,
    url,
    markdown,
    textChars: markdown.length,
    links: linksBefore,
    tables: html.match(/<table[\s>]/gi)?.length ?? 0,
  };
}

export interface SearchResult { title: string; url: string; snippet: string }

export async function duckSearch(query: string): Promise<SearchResult[]> {
  const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "user-agent": UA },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  const out: SearchResult[] = [];
  $("div.result, div.web-result").each((_, el) => {
    const a = $(el).find("a.result__a").first();
    const sn = $(el).find(".result__snippet").first().text().trim();
    let href = a.attr("href") ?? "";
    if (href.startsWith("//duckduckgo.com/l/?uddg=")) {
      href = decodeURIComponent(href.split("uddg=")[1]?.split("&")[0] ?? href);
    }
    if (a.text().trim() && href.startsWith("http")) {
      out.push({ title: a.text().trim(), url: href, snippet: sn });
    }
  });
  return out.slice(0, 12);
}

export async function runWebJob(jobId: string, query: string, url: string | undefined, limit: number): Promise<{ recs: WebRec[]; searchResults: SearchResult[]; note: string }> {
  const dir = jobDir(jobId);
  const recs: WebRec[] = [];
  const searchResults: SearchResult[] = [];

  if (url) {
    // single-page scrape
    log(jobId, `scraping ${url}`);
    const rec = await scrapePage(url);
    recs.push(rec);
    const safeName = new URL(url).hostname.replace(/^www\./, "") + ".md";
    fs.writeFileSync(path.join(dir, safeName), `# ${rec.title}\n\n> source: ${url}\n\n${rec.markdown}`);
  } else {
    // topic search → scrape top N results
    log(jobId, `searching the web for "${query}"`);
    searchResults.push(...(await duckSearch(query)));
    if (searchResults.length === 0) throw new Error("search returned no results — try rephrasing");
    const targets = searchResults.slice(0, Math.min(limit, 8));
    log(jobId, `scraping top ${targets.length} results`);
    let i = 0;
    for (const t of targets) {
      i++;
      try {
        const rec = await scrapePage(t.url);
        recs.push(rec);
        const safe = `${String(i).padStart(2, "0")}-${t.title.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50)}.md`;
        fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${t.url}\n\n${rec.markdown}`);
        update(jobId, { itemsDone: i, itemsTotal: targets.length });
      } catch (e: any) {
        log(jobId, `failed ${t.url}: ${e.message}`);
      }
    }
  }

  // combined search-results CSV
  if (searchResults.length) {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = ["title,url,snippet", ...searchResults.map((s) => [s.title, s.url, s.snippet].map(esc).join(","))].join("\n");
    fs.writeFileSync(path.join(dir, "search-results.csv"), csv);
  }
  return { recs, searchResults, note: url ? `scraped 1 page` : `scraped ${recs.length}/${targetsCount(searchResults, limit)} pages from search` };
}

function targetsCount(sr: SearchResult[], limit: number): number {
  return Math.min(sr.length, Math.min(limit, 8));
}
