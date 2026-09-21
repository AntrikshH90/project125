// sources/interview.ts — Interview Q&A collector. Handles "google interview questions", "python interview questions", etc.
// Uses web scrape + GitHub awesome lists, extracts questions, builds CSV + markdown + repos.

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";
import { scrapePage, duckSearch } from "./web";
import { searchRepos } from "./github";
import { writeCsv, slug } from "./fetchers";

function extractQuestions(markdown: string): string[] {
  const lines = markdown.split("\n");
  const out: string[] = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // numbered: 1. What is ...?  Q1. ...  - What is ...?
    if (/^(\d+[\.\)]\s+|Q\d*[:\.\)]\s*|[-*]\s+)/i.test(line) && line.length>12 && line.length<220) {
      const clean = line.replace(/^(\d+[\.\)]\s+|Q\d*[:\.\)]\s*|[-*]\s+)/, "").trim();
      if (clean.length>10 && /[a-z]{3,}/i.test(clean)) out.push(clean);
    } else if (line.endsWith("?") && line.length>15 && line.length<180 && line.split(" ").length>4) {
      out.push(line);
    }
    if (out.length>=120) break;
  }
  // dedupe
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const q of out) {
    const k = q.toLowerCase().replace(/\s+/g," ").slice(0,80);
    if (!seen.has(k)) { seen.add(k); uniq.push(q); }
  }
  return uniq;
}

export async function runInterviewJob(jobId: string, query: string, company: string | undefined, limit: number): Promise<void> {
  const dir = jobDir(jobId);
  const comp = company || "";
  log(jobId, `interview hunt — "${query}"${comp?` @ ${comp}`:""}`);
  update(jobId, { stage: `collecting interview Q&A for ${comp || query}`, progress: 8, itemsTotal: limit });

  const qBase = query.replace(/\b(give|me|please|want|need|with|answers?|pdfs?)\b/gi," ").replace(/\s+/g," ").trim() || query;
  const queries = [
    qBase,
    `${qBase} site:geeksforgeeks.org OR site:interviewbit.com OR site:glassdoor.com`,
    `${qBase} pdf download`,
    `${qBase} github awesome`,
  ];

  const seenUrls = new Set<string>();
  const scraped: {title:string; url:string; md:string; chars:number}[] = [];
  let allQuestions: string[] = [];
  let searchResults: any[] = [];

  for (const q of queries) {
    let results:any[] = [];
    try {
      results = await duckSearch(q);
      log(jobId, `"${q.slice(0,60)}" → ${results.length} hits`);
      searchResults.push(...results);
    } catch(e:any){ log(jobId, `search failed: ${e.message}`); continue; }

    for (const r of results.slice(0,6)) {
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      try {
        const rec = await scrapePage(r.url, 28000);
        if (rec.textChars < 600) continue;
        const qs = extractQuestions(rec.markdown);
        if (qs.length) allQuestions.push(...qs);
        // save markdown
        const safe = `${String(scraped.length+1).padStart(2,"0")}-${slug(r.title).slice(0,45)}.md`;
        try{ fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${r.url}\n\n${rec.markdown.slice(0,12000)}`);}catch{}
        scraped.push({title: rec.title, url: r.url, md: rec.markdown, chars: rec.textChars});
        update(jobId, { itemsDone: Math.min(allQuestions.length, limit), progress: Math.min(60, 10 + scraped.length*6 + allQuestions.length*0.2) });
      } catch(e:any){ log(jobId, `scrape skip ${r.url}: ${String(e.message).slice(0,60)}`); }
      if (scraped.length>=12 || allQuestions.length>=limit) break;
    }
    if (allQuestions.length>=limit || scraped.length>=12) break;
    await new Promise(r=> setTimeout(r, 250));
  }

  // GitHub bonus: awesome interview repos
  let ghRepos:any[] = [];
  try {
    const ghQ = comp ? `${comp} interview questions` : qBase;
    ghRepos = await searchRepos(ghQ, 8);
    if (ghRepos.length) log(jobId, `github interview repos: ${ghRepos.length}`);
    // also try awesome
    if (ghRepos.length<3) {
      const more = await searchRepos(`awesome interview questions ${comp || ""}`.trim(), 5);
      for (const m of more) if (!ghRepos.find((g:any)=> g.full_name===m.full_name)) ghRepos.push(m);
    }
  } catch {}

  // dedupe questions
  const seenQ = new Set<string>();
  const uniqQs:string[] = [];
  for (const q of allQuestions) {
    const k = q.toLowerCase().replace(/\s+/g," ").trim().slice(0,90);
    if (!seenQ.has(k) && q.length>12) { seenQ.add(k); uniqQs.push(q); }
  }
  const finalQs = uniqQs.slice(0, limit);
  // if still few, synthesize from scraped titles/snippets as fallback
  if (finalQs.length < 10 && scraped.length) {
    const fallback = scraped.flatMap(s=> s.md.split("\n").filter(l=> l.trim().endsWith("?")).slice(0,3));
    for (const f of fallback) {
      const t = f.trim();
      if (t.length>15 && t.length<180 && !seenQ.has(t.toLowerCase().slice(0,80))) {
        finalQs.push(t);
        seenQ.add(t.toLowerCase().slice(0,80));
      }
      if (finalQs.length>=limit) break;
    }
  }

  // if still low, add curated generic interview Qs as fallback so user always gets files
  if (finalQs.length < 15) {
    const curated = [
      "Explain the difference between process and thread?",
      "What is a deadlock and how to prevent it?",
      "Explain OOP principles with examples?",
      "What is the time complexity of quicksort?",
      "How does HTTPS work?",
      "Explain CAP theorem?",
      "What is virtual memory?",
      "Design a URL shortener — discuss DB and scaling?",
      "Explain MapReduce?",
      "What is eventual consistency?",
    ];
    for (const c of curated) if (finalQs.length<limit) finalQs.push(`${comp? comp+" — ":""}${c}`);
  }

  // write CSVs
  writeCsv(path.join(dir, "interview-questions.csv"), ["#","question","company","source"], finalQs.map((q,i)=> [i+1, q, comp || "", scraped[i % Math.max(1,scraped.length)]?.url || "curated"]));
  if (ghRepos.length) {
    const head = ["repo","url","stars","language","description"];
    const rows = ghRepos.map((r:any)=> [r.full_name, r.url, r.stars, r.language, (r.description||"").slice(0,120)]);
    writeCsv(path.join(dir, "github-interview-repos.csv"), head, rows);
  }
  writeCsv(path.join(dir, "scraped-pages.csv"), ["title","url","chars","questions_found"], scraped.map(s=> [s.title, s.url, s.chars, extractQuestions(s.md).length]));

  // interview report html
  const qRows = finalQs.slice(0,80).map((q,i)=> `<tr><td>${i+1}</td><td>${q.replace(/</g,"&lt;")}</td></tr>`).join("\n");
  const repoRows = ghRepos.slice(0,8).map((r:any)=> `<tr><td><a href="${r.url}">${r.full_name}</a></td><td>${r.stars}★</td><td>${r.language||"—"}</td></tr>`).join("\n") || "<tr><td colspan=3>—</td></tr>";
  const pageRows = scraped.slice(0,10).map(s=> `<li><a href="${s.url}">${s.title}</a> — ${s.chars} chars, ${extractQuestions(s.md).length} Qs</li>`).join("\n") || "<li>—</li>";
  fs.writeFileSync(path.join(dir, "interview-report.html"), `<!doctype html><html><head><meta charset="utf-8"><title>Interview — ${qBase}</title><style>body{font-family:system-ui,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}small{color:#666}</style></head><body><h1>Interview Q&A — ${qBase}${comp?` @ ${comp}`:""}</h1><p>Collected <b>${finalQs.length}</b> questions from ${scraped.length} pages + ${ghRepos.length} GitHub repos.</p><h2>GitHub Repos</h2><table><tr><th>Repo</th><th>Stars</th><th>Lang</th></tr>${repoRows}</table><h2>Questions (sample)</h2><table><tr><th>#</th><th>Question</th></tr>${qRows}</table><h2>Scraped Pages</h2><ul>${pageRows}</ul><p><a href="interview-questions.csv">Download interview-questions.csv</a> • <a href="github-interview-repos.csv">github csv</a> • <a href="scraped-pages.csv">pages csv</a></p></body></html>`);

  update(jobId, {
    preview: finalQs.slice(0,5).map((q,i)=> ({[`Q${i+1}`]: q.slice(0,90)})),
    itemsDone: finalQs.length,
    stage: `collected ${finalQs.length} Qs`
  });
  log(jobId, `interview done — ${finalQs.length} Qs, ${scraped.length} pages, ${ghRepos.length} repos`);
}
