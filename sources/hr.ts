// sources/hr.ts — HR / Recruiter email hunter. Works keyless, robust fallback to pattern generation.
// Covers "hr mails for google", "amazon recruiter contact", etc.

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { log, update, jobDir } from "../store";
import { scrapePage, duckSearch } from "./web";
import { writeCsv, slug } from "./fetchers";
import { searchRepos } from "./github";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const HR_KEYWORDS = /(hr|human resource|recruiter|talent acquisition|hiring manager|careers|jobs|recruiting|people ops)/i;

function domainFor(company?: string): string | undefined {
  if (!company) return undefined;
  const map: Record<string,string> = {
    google:"google.com", amazon:"amazon.com", microsoft:"microsoft.com", meta:"meta.com", facebook:"meta.com",
    apple:"apple.com", netflix:"netflix.com", uber:"uber.com", airbnb:"airbnb.com", flipkart:"flipkart.com",
    tcs:"tcs.com", infosys:"infosys.com", wipro:"wipro.com", accenture:"accenture.com", ibm:"ibm.com",
    deloitte:"deloitte.com", capgemini:"capgemini.com", cognizant:"cognizant.com", byjus:"byjus.com",
    swiggy:"swiggy.com", zomato:"zomato.com", paytm:"paytm.com", ola:"olacabs.com", linkedin:"linkedin.com",
    adobe:"adobe.com", salesforce:"salesforce.com", oracle:"oracle.com", intel:"intel.com", nvidia:"nvidia.com",
    tesla:"tesla.com", openai:"openai.com",
  };
  const c = company.toLowerCase();
  if (map[c]) return map[c];
  // fallback: guess
  if (/^[a-z0-9-]+$/.test(c) && c.length>=2) return `${c}.com`;
  return undefined;
}

function patternEmails(company?: string): string[] {
  const domain = domainFor(company);
  if (!domain) return [];
  const local = ["hr","careers","jobs","recruiting","recruitment","talent","hiring","people","jobs-apply","hr-team","talent-acquisition","recruiter"];
  return local.map(l=> `${l}@${domain}`);
}

function extractEmails(html: string): string[] {
  const found = html.match(EMAIL_RE) || [];
  // dedupe lowercased
  const seen = new Map<string,string>();
  for (const e of found) {
    const lower = e.toLowerCase();
    // filter obvious noise
    if (lower.includes("example.com") || lower.includes("test.com") || lower.includes("email.com") || lower.length>60) continue;
    if (!seen.has(lower)) seen.set(lower, e);
  }
  return [...seen.values()];
}

function scoreEmail(email: string): number {
  const l = email.toLowerCase();
  let s = 0;
  if (/(hr|recruiter|talent|hiring|careers|jobs)/i.test(l)) s+=3;
  if (l.includes("noreply") || l.includes("no-reply") || l.includes("donotreply")) s-=5;
  if (l.endsWith(".in") || l.endsWith(".com")) s+=0.5;
  return s;
}

export async function runHrJob(jobId: string, query: string, company: string | undefined, limit: number): Promise<void> {
  const dir = jobDir(jobId);
  const comp = company || query.split(/\s+/).find(w=> w.length>2) || "company";
  log(jobId, `HR hunt — company: ${company || "auto"} | query: "${query}"`);
  update(jobId, { stage: `hunting HR emails for ${comp}`, progress: 8, itemsTotal: limit });

  const queries = [
    `${comp} hr email`,
    `${comp} recruiter email`,
    `${comp} hr contact`,
    `${comp} careers contact email`,
    `${comp} hiring manager email site:linkedin.com OR site:indeed.com OR site:glassdoor.com`,
  ];
  // if query already contains hr, add raw
  if (!queries[0].toLowerCase().includes(query.toLowerCase().slice(0,12))) queries.unshift(query);
  // also try generic if company unknown
  if (!company) queries.push(`${query} hr email contact`);

  const seenUrls = new Set<string>();
  const scrapedPages: { title:string; url:string; chars:number }[] = [];
  const allEmails = new Map<string,{email:string; source:string}>();
  let searchResults: any[] = [];

  for (const q of queries.slice(0,4)) {
    let results: any[] = [];
    try {
      results = await duckSearch(q);
      log(jobId, `"${q}" → ${results.length} hits`);
      searchResults.push(...results);
    } catch (e:any){ log(jobId, `search failed "${q}": ${e.message}`); continue; }

    for (const r of results.slice(0,6)) {
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      try {
        const rec = await scrapePage(r.url, 25000);
        if (rec.textChars < 400) continue;
        const emails = extractEmails(rec.markdown + " " + rec.title);
        for (const em of emails) {
          const lower = em.toLowerCase();
          if (!allEmails.has(lower)) allEmails.set(lower, {email: em, source: r.url});
          else {
            // keep HR-scored
            if (scoreEmail(em) > scoreEmail(allEmails.get(lower)!.email)) allEmails.set(lower, {email: em, source: r.url});
          }
        }
        // save markdown
        const safe = `${String(scrapedPages.length+1).padStart(2,"0")}-${slug(r.title).slice(0,40)}.md`;
        try{ fs.writeFileSync(path.join(dir, safe), `# ${rec.title}\n\n> source: ${r.url}\n\n${rec.markdown.slice(0,8000)}`);}catch{}
        scrapedPages.push({title: rec.title, url: r.url, chars: rec.textChars});
        update(jobId, { itemsDone: allEmails.size, progress: Math.min(70, 12 + allEmails.size*2) });
      } catch (e:any){ log(jobId, `scrape skip ${r.url}: ${String(e.message).slice(0,60)}`); }
      if (allEmails.size >= limit) break;
    }
    if (allEmails.size >= limit) break;
    await new Promise(r=> setTimeout(r, 300));
  }

  // Fallback: generate pattern emails if none found or too few
  const patterns = patternEmails(company || comp);
  for (const p of patterns) {
    const lower = p.toLowerCase();
    if (!allEmails.has(lower) && allEmails.size < limit) {
      allEmails.set(lower, {email: p, source: `pattern:${domainFor(company||comp)}`});
    }
  }

  // Also search GitHub for HR email lists as bonus
  let ghHits: any[] = [];
  try {
    const repos = await searchRepos(`${comp} hr email recruiter`, 5);
    ghHits = repos;
    if (repos.length) log(jobId, `github HR repos: ${repos.length}`);
  } catch {}

  // sort emails by HR score
  const sorted = [...allEmails.values()].sort((a,b)=> scoreEmail(b.email)-scoreEmail(a.email)).slice(0, limit);
  const hrOnly = sorted.filter(e=> HR_KEYWORDS.test(e.email) || /hr|recruiter|talent|careers|hiring/i.test(e.email));
  const finalList = (hrOnly.length>= Math.min(5, sorted.length) ? hrOnly : sorted).slice(0, limit);

  // write CSVs
  writeCsv(path.join(dir, "hr-emails.csv"), ["email","source","type"], finalList.map(e=> [e.email, e.source, /pattern:/.test(e.source)? "pattern (verify)":"scraped"]));
  if (patterns.length) {
    writeCsv(path.join(dir, "pattern-emails.csv"), ["email","domain","note"], patterns.slice(0,20).map(p=> [p, domainFor(company||comp)||"", "common HR pattern — verify via company site"]));
  }
  writeCsv(path.join(dir, "scraped-pages.csv"), ["title","url","chars"], scrapedPages.map(p=> [p.title, p.url, p.chars]));
  if (ghHits.length) {
    writeCsv(path.join(dir, "github-hr-repos.csv"), ["repo","url","stars","description"], ghHits.map((r:any)=> [r.full_name, r.url, r.stars, r.description]));
  }

  // sources.html
  const emailRows = finalList.map(e=> `<tr><td><b>${e.email}</b></td><td style="font-size:11px; word-break:break-all">${e.source}</td><td>${scoreEmail(e.email)>0? "⭐ HR":"—"}</td></tr>`).join("\n");
  const pageRows = scrapedPages.slice(0,12).map(p=> `<li><a href="${p.url}">${p.title}</a> <small>(${p.chars} chars)</small></li>`).join("\n") || "<li>—</li>";
  const patternRows = patterns.slice(0,8).map(p=> `<li><code>${p}</code></li>`).join("\n");
  fs.writeFileSync(path.join(dir, "hr-report.html"), `<!doctype html><html><head><meta charset="utf-8"><title>HR Contacts — ${comp}</title><style>body{font-family:system-ui,sans-serif;max-width:920px;margin:24px auto;padding:0 16px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}code{background:#f5f5f5;padding:2px 4px;border-radius:3px}</style></head><body><h1>HR / Recruiter Contacts — ${comp}</h1><p>Found <b>${finalList.length}</b> emails (scraped ${allEmails.size}, patterns ${patterns.length}) from ${scrapedPages.length} pages + ${searchResults.length} search hits.</p><h2>✅ Emails (ranked)</h2><table><tr><th>Email</th><th>Source</th><th>HR?</th></tr>${emailRows || '<tr><td colspan=3>—</td></tr>'}</table><h2>Pattern Emails (to verify)</h2><ul>${patternRows}</ul><h2>Scraped Pages</h2><ul>${pageRows}</ul><p><a href="hr-emails.csv">Download hr-emails.csv</a> • <a href="pattern-emails.csv">pattern-emails.csv</a> • <a href="scraped-pages.csv">scraped-pages.csv</a></p></body></html>`);

  update(jobId, {
    preview: finalList.slice(0,5).map(e=> ({email:e.email, source:e.source.slice(0,60)})),
    itemsDone: finalList.length,
    stage: finalList.length? `found ${finalList.length} HR emails` : "no direct HR emails — pattern fallback ready"
  });
  if (finalList.length===0) log(jobId, "no HR emails scraped — pattern CSV is your best next step (verify via company site)");
  else log(jobId, `HR hunt done — ${finalList.length} emails`);
}
