// sources/jobs.ts — Job search + HR email discovery via DuckDuckGo + targeted site scraping.
// Also surfaces LinkedIn/Indeed style postings with company, role, location, salary info.

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { log, update, jobDir } from "../store";
import { scrapePage, duckSearch, SearchResult } from "./web";
import { writeCsv, slug, sanitizeName } from "./fetchers";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface JobRec {
  title: string;
  company: string;
  location: string;
  salary: string;
  link: string;
  email?: string;
  source: string;
  posted: string;
}

const HR_EXTRACT_RE = /(?:hr[.-]?email|contact[.-]?hr|talent[.-]?acquisition|recruiting|careers|apply\?email=|@linkedin\.com|@indeed\.com|@gmail\.com|@yahoo\.com|@company\.com)/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

async function extractHRInfo(html: string, url: string): Promise<{ email?: string; company?: string }> {
  const $ = cheerio.load(html);
  // Try common HR/apply patterns
  const emailMatch = html.match(EMAIL_RE);
  const allEmails = emailMatch || [];
  
  // Prioritize HR emails
  const hrEmails = allEmails.filter(e => HR_EXTRACT_RE.test(e));
  const hrEmail = hrEmails[0] || allEmails[0];
  
  // Also try to find emails in common HR sections
  const contactEmails: string[] = [];
  
  // Footer emails
  $('footer').find('a').each((_, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href') || '';
    if (text.includes('email') || text.includes('contact') || href.includes('mailto')) {
      const match = href.match(/mailto:([^?]+)/);
      if (match) contactEmails.push(match[1]);
    }
  });
  
  // Contact section
  $('.contact, .contact-us, .contact-info, .get-in-touch').find('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('mailto')) {
      const match = href.match(/mailto:([^?]+)/);
      if (match) contactEmails.push(match[1]);
    }
  });
  
  // Form emails
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const match = action.match(/mailto:([^?]+)/);
    if (match) contactEmails.push(match[1]);
  });
  
  // Try to extract company name
  const title = $('title').text().trim();
  const h1 = $('h1').first().text().trim();
  const company = title || h1 || url;
  
  // Return first valid email (HR email if found, else contact email, else any email)
  return { 
    email: hrEmail || contactEmails[0] || allEmails[0], 
    company 
  };
}

async function scrapeJobPage(url: string): Promise<JobRec | null> {
  try {
    const rec = await scrapePage(url, 35000);
    if (rec.textChars < 500) return null;
    
    // Extract structured job info from markdown/text
    const lines = rec.markdown.split('\n');
    const title = lines[0]?.trim() || rec.title || 'Unknown Job';
    
    // Try to find company name (often in first few lines after title)
    const company = lines.slice(1, 5).find(l => /company|employer|posted by/i.test(l))?.split(':').pop()?.trim() || 'Unknown';
    
    const location = rec.markdown.match(/(?:location|office|remote|hybrid)[:\s]+([^\n]+)/i)?.[1]?.trim() || '';
    const salary = rec.markdown.match(/(?:salary|pay|compensation|rate)[:\s]+([^\n]+)/i)?.[1]?.trim() || '';
    const posted = rec.markdown.match(/(?:posted|updated|posted on|posted at)[:\s]+([^\n]+)/i)?.[1]?.trim() || new Date().toISOString().split('T')[0];
    
    const { email } = await extractHRInfo(rec.markdown, url);
    
    return {
      title,
      company,
      location,
      salary,
      link: url,
      email,
      source: 'scraped',
      posted
    };
  } catch {
    return null;
  }
}

export async function runJobJob(jobId: string, query: string, limit: number): Promise<{ jobs: number; emails: number; sources: number }> {
  const dir = jobDir(jobId);
  log(jobId, `job search mode — "${query}"`);
  update(jobId, { stage: "searching job boards", progress: 10, itemsTotal: limit });

  const seen = new Set<string>();
  const jobs: JobRec[] = [];
  const emailSet = new Set<string>();
  const searchResults: SearchResult[] = [];
  
  const queries = [
    query,
    `${query} jobs`,
    `${query} hiring`,
    `${query} careers`,
    `${query} remote`,
    `${query} hr contact`,
  ];

  for (const q of queries) {
    let results: SearchResult[] = [];
    try { results = await duckSearch(q); } catch (e: any) { log(jobId, `search failed: ${e.message}`); continue; }
    
    for (const r of results.slice(0, 10)) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      
      try {
        const job = await scrapeJobPage(r.url);
        if (job) {
          jobs.push(job);
          if (job.email) emailSet.add(job.email);
        } else if (r.url.includes('linkedin.com') || r.url.includes('indeed.com') || r.url.includes('glassdoor')) {
          searchResults.push(r);
        }
      } catch (e: any) {
        if (r.url.includes('linkedin') || r.url.includes('indeed')) {
          searchResults.push(r);
        }
      }
      
      if (jobs.length >= limit) break;
    }
    
    if (jobs.length >= limit) break;
  }

  // Also extract HR emails from career pages
  const careerPages = jobs.filter(j => j.company.toLowerCase().includes('career') || j.title.toLowerCase().includes('contact'));
  for (const c of careerPages) {
    if (c.email) {
      emailSet.add(c.email);
    }
  }

  // Write outputs
  const jobRows = jobs.map(j => [j.title, j.company, j.location, j.salary, j.email || "", j.link, j.posted]);
  writeCsv(path.join(dir, "jobs.csv"), ["title", "company", "location", "salary", "email", "link", "posted"], jobRows);
  
  if (emailSet.size) {
    const emailRows = [...emailSet].map(e => [e, "HR/Recruiting Email"]);
    writeCsv(path.join(dir, "hr-emails.csv"), ["email", "type"], emailRows);
  }

  // Sources HTML
  const linksHtml = searchResults.slice(0, 50).map((r) =>
    `<li><a href="${r.url}">${escapeHtml(r.title)}</a></li>`
  ).join("\n");
  
  fs.writeFileSync(path.join(dir, "sources.html"), `<!doctype html>
<html><head><meta charset="utf-8"><title>Jobs — ${escapeHtml(query)}</title><style>
body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5}
li{margin:8px 0}small{color:#666}
</style></head><body>
<h1>Jobs for "${escapeHtml(query)}"</h1>
<p>${jobs.length} postings found${emailSet.size ? `, ${emailSet.size} HR emails extracted` : ''}.</p>
<h2>Jobs</h2>
<p><a href="jobs.csv">Download CSV</a> | <a href="hr-emails.csv">HR Emails CSV</a></p>
<h2>Source pages</h2>
<ul>${linksHtml || "<li>—</li>"}</ul>
</body></html>`);

  update(jobId, { 
    preview: [{ 
      jobsFound: jobs.length, 
      emailsFound: emailSet.size, 
      sourcePages: searchResults.length 
    }],
    itemsDone: jobs.length + emailSet.size
  });
  
  return { jobs: jobs.length, emails: emailSet.size, sources: searchResults.length };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
