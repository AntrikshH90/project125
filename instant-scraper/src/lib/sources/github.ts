// sources/github.ts — GitHub repo search + details, README fetch, CSV out. Uses GITHUB_TOKEN if set.

import fs from "node:fs";
import path from "node:path";
import { log, jobDir } from "../store";

const UA = "instant-scraper/1.0";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { "user-agent": UA, accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export interface RepoRec {
  full_name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  url: string;
  pushed_at: string;
  license: string;
  open_issues: number;
  homepage: string;
}

export async function searchRepos(query: string, limit: number): Promise<RepoRec[]> {
  const per = Math.min(limit, 100);
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${per}`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`github search ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.items ?? []).map((it: any): RepoRec => ({
    full_name: it.full_name,
    description: it.description ?? "",
    stars: it.stargazers_count,
    forks: it.forks_count,
    language: it.language ?? "",
    topics: it.topics ?? [],
    url: it.html_url,
    pushed_at: it.pushed_at?.slice(0, 10) ?? "",
    license: it.license?.spdx_id ?? "",
    open_issues: it.open_issues_count,
    homepage: it.homepage ?? "",
  }));
}

export async function downloadReadmes(jobId: string, repos: RepoRec[], max = 50): Promise<number> {
  const dir = jobDir(jobId);
  let ok = 0;
  const CONC = 5;
  let idx = 0;
  const q = repos.slice(0, max);
  async function w() {
    while (idx < q.length) {
      const my = idx++;
      const repo = q[my];
      try {
        const r = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
          headers: { ...ghHeaders(), accept: "application/vnd.github.raw" },
        });
        if (!r.ok) continue;
        const txt = await r.text();
        if (txt.length < 10) continue;
        fs.writeFileSync(path.join(dir, `readme-${repo.full_name.replace("/", "__")}.md`), txt);
        ok++;
        if (ok % 10 === 0) log(jobId, `fetched ${ok} READMEs`);
      } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: CONC }, w));
  return ok;
}

function esc(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reposToCsv(repos: RepoRec[]): string {
  const head = ["full_name", "url", "description", "stars", "forks", "language", "topics", "license", "pushed_at", "open_issues", "homepage"];
  const lines = [head.join(",")];
  for (const r of repos) lines.push([r.full_name, r.url, r.description, r.stars, r.forks, r.language, r.topics.join(" "), r.license, r.pushed_at, r.open_issues, r.homepage].map(esc).join(","));
  return lines.join("\n");
}
