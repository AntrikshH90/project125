import type { SchemaFieldLike } from "../types.js";

const GH_API = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "DataHarvest/1.0",
    Accept: "application/vnd.github+json"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

export async function scrapeGithub(
  targetUrl: string,
  _fields: SchemaFieldLike[],
  limit: number
): Promise<{ pages: Array<{ records: Array<Record<string, unknown>> }>; errors: string[] }> {
  const errors: string[] = [];
  const pages: Array<{ records: Array<Record<string, unknown>> }> = [];

  try {
    const parsed = parseRepo(targetUrl);
    if (!parsed) throw new Error("URL is not a GitHub repository path (expected github.com/{owner}/{repo})");
    const { owner, repo } = parsed;

    const repoRes = await fetch(`${GH_API}/repos/${owner}/${repo}`, { headers: ghHeaders() });
    if (!repoRes.ok) throw new Error(`GitHub API responded ${repoRes.status} for repo metadata`);
    const repoData = (await repoRes.json()) as Record<string, unknown>;

    const repoRecord: Record<string, unknown> = {
      kind: "repository",
      repo_name: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      open_issues: repoData.open_issues_count,
      language: repoData.language,
      topics: repoData.topics ?? [],
      license: (repoData.license as Record<string, unknown> | null)?.spdx_id ?? null,
      created: repoData.created_at,
      updated: repoData.pushed_at,
      url: repoData.html_url,
      _source: "github"
    };
    pages.push({ records: [repoRecord] });

    const issuesRes = await fetch(`${GH_API}/repos/${owner}/${repo}/issues?state=all&per_page=${Math.min(Math.max(limit - 1, 1), 100)}`, { headers: ghHeaders() });
    if (issuesRes.ok) {
      const issues = (await issuesRes.json()) as Array<Record<string, unknown>>;
      const issueRecords = issues
        .filter((i) => !i.pull_request)
        .map((i) => ({
          kind: "issue",
          repo_name: repoData.full_name,
          number: i.number,
          title: i.title,
          state: i.state,
          author: (i.user as Record<string, unknown> | null)?.login ?? null,
          labels: (i.labels as Array<Record<string, unknown>>)?.map((l) => l.name) ?? [],
          comments: i.comments,
          created: i.created_at,
          url: i.html_url,
          _source: "github"
        }));
      if (issueRecords.length > 0) pages.push({ records: issueRecords });
    } else {
      errors.push(`github issues: HTTP ${issuesRes.status}`);
    }

    const releasesRes = await fetch(`${GH_API}/repos/${owner}/${repo}/releases?per_page=10`, { headers: ghHeaders() });
    if (releasesRes.ok) {
      const releases = (await releasesRes.json()) as Array<Record<string, unknown>>;
      const releaseRecords = releases.map((r) => ({
        kind: "release",
        repo_name: repoData.full_name,
        tag: r.tag_name,
        name: r.name ?? r.tag_name,
        published: r.published_at,
        prerelease: r.prerelease,
        url: r.html_url,
        _source: "github"
      }));
      if (releaseRecords.length > 0) pages.push({ records: releaseRecords });
    }

    return { pages, errors };
  } catch (err) {
    errors.push(`github: ${(err as Error).message}`);
    return { pages, errors };
  }
}

function parseRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}
