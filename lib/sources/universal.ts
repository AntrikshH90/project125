// sources/universal.ts — Universal harvester: ensures ANY query returns files.
// Runs web search + github + papers in parallel, bundles into one pack.
// This is the fallback for queries like "google interview questions" before, now "universal".

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";
import { duckSearch, scrapePage } from "./web";
import { searchRepos } from "./github";
import { writeCsv, slug } from "./fetchers";

export async function runUniversalJob(jobId: string, query: string, limit: number): Promise<void> {
  const dir = jobDir(jobId);
  log(jobId, `universal harvest — "${query}"`);
  update(jobId, { stage: "universal: web + github + papers", progress: 6, itemsTotal: limit });

  let webRecs: any[] = [];
  let ghRepos: any[] = [];
  let scrapedPages: any[] = [];
  let searchHits: any[] = [];

  // Parallelize web + github
  const webP = (async () => {
    try {
      const hits = await duckSearch(query);
      searchHits = hits.slice(0, 8);
      log(jobId, `web search: ${hits.length} hits`);
      const targets = hits.slice(0, Math.min(6, limit));
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        try {
          const rec = await scrapePage(t.url, 25000);
          if (rec.textChars < 400) continue;
          const safe = `${String(i+1).padStart(2,"0")}-${slug(t.title).slice(0,40)}.md`;
          fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${t.url}\n\n${rec.markdown.slice(0,10000)}`);
          webRecs.push({ title: rec.title, url: t.url, chars: rec.textChars });
          update(jobId, { itemsDone: webRecs.length, progress: 20 + webRecs.length*4 });
        } catch (e:any){ log(jobId, `scrape fail ${t.url}: ${String(e.message).slice(0,50)}`); }
      }
    } catch (e:any){ log(jobId, `web search failed: ${e.message}`); }
  })();

  const ghP = (async () => {
    try {
      ghRepos = await searchRepos(query, Math.min(limit, 10));
      log(jobId, `github: ${ghRepos.length} repos`);
      if (ghRepos.length) {
        writeCsv(path.join(dir, "github-repos.csv"), ["repo","url","stars","language","description"], ghRepos.map((r:any)=> [r.full_name, r.url, r.stars, r.language, (r.description||"").slice(0,120)]));
      }
    } catch (e:any){ log(jobId, `github search failed: ${String(e.message).slice(0,50)}`); }
  })();

  await Promise.allSettled([webP, ghP]);

  // If web gave nothing, try alternative queries
  if (webRecs.length===0) {
    const alts = [`${query} guide`, `${query} tutorial`, `${query} pdf`];
    for (const q of alts) {
      try {
        const hits = await duckSearch(q);
        for (const t of hits.slice(0,3)) {
          try {
            const rec = await scrapePage(t.url, 20000);
            if (rec.textChars>400) {
              const safe = `${String(webRecs.length+1).padStart(2,"0")}-${slug(t.title).slice(0,40)}.md`;
              fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${t.url}\n\n${rec.markdown.slice(0,8000)}`);
              webRecs.push({title: rec.title, url: t.url, chars: rec.textChars});
            }
          } catch{}
        }
        if (webRecs.length>=3) break;
      } catch{}
    }
  }

  // Ensure at least something exists: create a summary file
  const summary = `# Universal Harvest — "${query}"\n\n- Web pages scraped: ${webRecs.length}\n- GitHub repos: ${ghRepos.length}\n- Search hits: ${searchHits.length}\n\n## Web Results\n${webRecs.map(r=> `- [${r.title}](${r.url}) — ${r.chars} chars`).join("\n") || "- (none)"}\n\n## GitHub Repos\n${ghRepos.slice(0,5).map((r:any)=> `- [${r.full_name}](${r.url}) — ${r.stars}★ ${r.language}`).join("\n") || "- (none)"}\n`;
  fs.writeFileSync(path.join(dir, "README.md"), summary);
  writeCsv(path.join(dir, "web-pages.csv"), ["title","url","chars"], webRecs.map(r=> [r.title, r.url, r.chars]));
  if (searchHits.length) {
    const esc = (v:any)=> { const s=String(v??""); return /[",\n]/.test(s)? `"${s.replace(/"/g,'""')}"`:s; };
    const csv = ["title,url,snippet", ...searchHits.map((s:any)=> [s.title,s.url,s.snippet].map(esc).join(","))].join("\n");
    fs.writeFileSync(path.join(dir, "search-hits.csv"), csv);
  }

  // sources.html bundle
  const webLinks = webRecs.map(r=> `<li><a href="${r.url}">${r.title}</a> <small>(${r.chars} chars)</small></li>`).join("\n") || "<li>—</li>";
  const ghLinks = ghRepos.slice(0,8).map((r:any)=> `<li><a href="${r.url}">${r.full_name}</a> — ${r.stars}★ ${r.language} — ${r.description||""}</li>`).join("\n") || "<li>—</li>";
  fs.writeFileSync(path.join(dir, "universal-report.html"), `<!doctype html><html><head><meta charset="utf-8"><title>Universal — ${query}</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:24px auto;padding:0 16px;line-height:1.6}li{margin:6px 0}code{background:#f5f5f5;padding:2px 4px}</style></head><body><h1>Universal Harvest — "${query}"</h1><p>Got <b>${webRecs.length} pages</b> + <b>${ghRepos.length} repos</b> from <b>${searchHits.length} search hits</b>.</p><h2>Web Pages (markdown)</h2><ul>${webLinks}</ul><h2>GitHub Repos</h2><ul>${ghLinks}</ul><p><a href="web-pages.csv">web-pages.csv</a> • <a href="github-repos.csv">github-repos.csv</a> • <a href="search-hits.csv">search-hits.csv</a> • <a href="README.md">README.md</a></p></body></html>`);

  // Fallback: if both zero, try broader github search and ensure at least README exists
  if (webRecs.length===0 && ghRepos.length===0) {
    log(jobId, `no direct hits — trying broader fallback`);
    try {
      const broad = query.split(/\s+/).slice(0,2).join(" ");
      const altRepos = await searchRepos(broad || "awesome", 5).catch(()=>[]);
      for (const r of altRepos) if (!ghRepos.find((x:any)=> x.full_name===r.full_name)) ghRepos.push(r);
      if (ghRepos.length) {
        writeCsv(path.join(dir, "github-repos.csv"), ["repo","url","stars","language","description"], ghRepos.map((r:any)=> [r.full_name, r.url, r.stars, r.language, (r.description||"").slice(0,120)]));
        log(jobId, `fallback github: ${ghRepos.length} repos`);
      }
    } catch {}
    // ensure at least one file explains the situation
    if (webRecs.length===0 && ghRepos.length===0) {
      fs.writeFileSync(path.join(dir, "TRY-AGAIN.md"), `# No direct hits for "${query}"\n\nWe tried DuckDuckGo + GitHub but got 0 results — likely rate-limited or query too niche.\n\n**Try:**\n- \`${query} tutorial\`\n- \`${query} pdf\`\n- \`${query} github\`\n\n**Raw sources attempted:**\n- DuckDuckGo HTML search\n- GitHub API search\n\nAll logs are in job.json — retry in a minute or add a keyword.\n`);
      writeCsv(path.join(dir, "fallback.csv"), ["query","note"], [[query, "no hits — see TRY-AGAIN.md"]]);
    }
  }

  update(jobId, {
    preview: [
      { type:"web_pages", count: webRecs.length, sample: webRecs[0]?.title?.slice(0,60) || "—" },
      { type:"github_repos", count: ghRepos.length, sample: ghRepos[0]?.full_name || "—" }
    ],
    itemsDone: Math.max(1, webRecs.length + ghRepos.length),
    stage: webRecs.length+ghRepos.length ? `harvested ${webRecs.length} pages + ${ghRepos.length} repos` : "fallback ready — see TRY-AGAIN.md"
  });
  log(jobId, `universal done — ${webRecs.length} pages, ${ghRepos.length} repos`);
}
