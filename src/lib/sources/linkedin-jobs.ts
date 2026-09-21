// sources/linkedin-jobs.ts — Direct LinkedIn search + HR email extraction.

import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { log, update, jobDir } from '../store';
import { scrapePage, duckSearch, SearchResult } from './web';
import { writeCsv } from './fetchers';

export interface LinkedInJobRec {
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  email?: string;
  source: string;
  posted: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const HR_EXTRACT_RE = /(?:hr[.-]?email|contact[.-]?hr|talent[.-]?acquisition|recruiting|careers|apply\?email=|@linkedin\.com|@indeed\.com|@gmail\.com|@yahoo\.com|@company\.com)/i;

async function scrapeLinkedInJobPage(url: string, html: string): Promise<LinkedInJobRec | null> {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || 'N/A';
  const company = $('h4').first().text().trim() || 'Unknown';
  const locationDiv = $('.job-text__summary').first() || $('h4').first();
  let location: string = 'Remote';
  if (locationDiv.length) location = locationDiv.text().trim();
  const postedDiv = $('.job-text__posted-date').first() || $('time').first();
  const posted = postedDiv.text().trim() || new Date().toISOString().split('T')[0];
  const emails = html.match(EMAIL_RE) || [];
  const hrEmails = emails.filter(e => HR_EXTRACT_RE.test(e));
  return { title, company, location, salary: '', url, email: hrEmails.length ? hrEmails[0] : emails[0] || undefined, source: 'linkedin.com', posted };
}

async function runLinkedInJobSearch(jobId: string, query: string, limit: number): Promise<{ jobs: number; emails: number; sources: number }> {
  const dir = jobDir(jobId);
  log(jobId, `LinkedIn job search — "${query}"`);
  const seenUrls = new Set<string>();
  const jobs: LinkedInJobRec[] = [];
  const emailSet = new Set<string>();
  let searchResults: SearchResult[] = [];
  const queries = [query, `${query} hiring`, `${query} careers`, `${query} remote`, `${query} hr contact`];

  for (let qIndex = 0; qIndex < queries.length; qIndex++) {
    const q = queries[qIndex];
    let results: SearchResult[] = [];
    try {
      results = await duckSearch(q);
      searchResults.push(...results);
    } catch (e: any) {
      log(jobId, `search failed: ${e.message}`);
    }
    for (let j = 0; j < Math.min(results.length, 12); j++) {
      const r = results[j];
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      try {
        if (r.url.includes('linkedin.com/jobs/view')) {
          try {
            const rec = await scrapePage(r.url, 30000);
            const job = await scrapeLinkedInJobPage(r.url, rec.markdown);
            if (job && job.email) emailSet.add(job.email);
            if (job) jobs.push(job);
          } catch (e: any) { log(jobId, `failed to scrape LinkedIn job page: ${e.message}`); }
        } else if (r.url.includes('linkedin.com')) {
          const rec = await scrapePage(r.url, 30000);
          if (rec.textChars > 500) {
            jobs.push({ title: rec.title, company: rec.title.split('-')[0].trim(), location: 'LinkedIn', salary: '', url: r.url, source: 'linkedin.com', posted: new Date().toISOString().split('T')[0] });
          }
        }
      } catch (e: any) { log(jobId, `failed ${r.url}: ${e.message}`); }
      if (jobs.length >= limit) break;
    }
    if (jobs.length >= limit) break;
  }

  const jobRows = jobs.map(j => [j.title, j.company, j.location, j.salary || '', j.email || '', j.url, j.posted]);
  writeCsv(path.join(dir, 'linkedin-jobs.csv'), ['title', 'company', 'location', 'salary', 'email', 'url', 'posted'], jobRows);
  if (emailSet.size) {
    const emailRows = [...emailSet].map(e => [e, 'HR/Recruiting Email']);
    writeCsv(path.join(dir, 'linkedin-emails.csv'), ['email', 'type'], emailRows);
  }
  const linksHtml = searchResults.slice(0, 50).map(r => `<li><a href="${r.url}">${escapeHtml(r.title)}</a></li>`).join('\n');
  fs.writeFileSync(path.join(dir, 'linkedin-sources.html'), `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn Jobs — ${escapeHtml(query)}</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5}li{margin:8px 0}</style></head><body><h1>LinkedIn Jobs for "${escapeHtml(query)}"</h1><p>${jobs.length} postings found${emailSet.size ? `, ${emailSet.size} HR emails extracted` : ''}.</p><h2>Jobs</h2><p><a href="linkedin-jobs.csv">Download CSV</a> | <a href="linkedin-emails.csv">HR Emails CSV</a></p><h2>Source pages</h2><ul>${linksHtml || '<li>—</li>'}</ul></body></html>`);
  update(jobId, { preview: [{ jobsFound: jobs.length, emailsFound: emailSet.size, sourcePages: searchResults.length }], itemsDone: jobs.length + emailSet.size });
  return { jobs: jobs.length, emails: emailSet.size, sources: searchResults.length };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { runLinkedInJobSearch };
