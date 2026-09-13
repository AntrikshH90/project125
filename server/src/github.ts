// ── GitHub integration: branch + PR from the winning diff ───────────────

export interface PrResult {
  url: string;
  branch: string;
  additions: number;
}

export function parseRepo(repoUrl: string): { owner: string; repo: string; httpsUrl: string } {
  const m = repoUrl.match(/github\.com[/:]([^/]+)\/([^/#?]+)/);
  if (!m) throw new Error(`not a github repo url: ${repoUrl}`);
  return { owner: m[1], repo: m[2].replace(/\.git$/, ""), httpsUrl: `https://github.com/${m[1]}/${m[2].replace(/\.git$/, "")}` };
}

export async function ghApi(method: string, path: string, token: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "sandforge",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Open a PR: apply diff to a temp ref via the API and create the pull request. */
export async function openPr(opts: {
  repoUrl: string;
  baseBranch: string;
  diff: string;
  title: string;
  body: string;
  token: string;
  branchPrefix: string;
}): Promise<PrResult> {
  const { owner, repo } = parseRepo(opts.repoUrl);
  const branch = `${opts.branchPrefix}-${Date.now().toString(36)}`;

  // 1) get base branch head sha
  const base = await ghApi("GET", `/repos/${owner}/${repo}/branches/${encodeURIComponent(opts.baseBranch)}`, opts.token);
  const headSha = base.commit.sha;

  // 2) create branch ref
  await ghApi("POST", `/repos/${owner}/${repo}/git/refs`, opts.token, {
    ref: `refs/heads/${branch}`,
    sha: headSha,
  });

  // 3) apply diff file-by-file via contents API (parse unified diff with 2-file context)
  const files = parseUnifiedDiff(opts.diff);
  if (files.length === 0) throw new Error("diff produced no file changes");
  for (const f of files) {
    const meta = await ghApi("GET", `/repos/${owner}/${repo}/contents/${encodePath(f.path)}?ref=${branch}`, opts.token).catch(() => null);
    const sha = meta && !meta.message ? meta.sha : null;
    await ghApi("PUT", `/repos/${owner}/${repo}/contents/${encodePath(f.path)}`, opts.token, {
      message: `sandforge: ${f.action} ${f.path}`,
      content: Buffer.from(f.newContent, "utf-8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    });
  }

  // 4) open PR
  const pr = await ghApi("POST", `/repos/${owner}/${repo}/pulls`, opts.token, {
    title: opts.title,
    head: branch,
    base: opts.baseBranch,
    body: opts.body,
  });
  return { url: pr.html_url, branch, additions: files.reduce((a, f) => a + countAdditions(f.newContent), 0) };
}

function encodePath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

function countAdditions(s: string): number {
  return s.split("\n").length;
}

// ── minimal unified-diff parser (single-hunk-per-file is fine for our edits) ──
// We regenerate full new file content from old blob + diff hunks when possible;
// for write-action edits the engine records full file content, so diffs are whole-file.
interface DiffFile {
  path: string;
  action: "write" | "edit";
  newContent: string;
}

export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("diff --git ")) {
      const m = line.match(/diff --git a\/(.+) b\/(.+)/);
      const filePath = m ? m[2] : "";
      i++;
      let oldContent: string[] = [];
      let newContent: string[] = [];
      let mode = "";
      // skip headers
      while (i < lines.length && (lines[i].startsWith("---") || lines[i].startsWith("+++") || lines[i].startsWith("index ") || lines[i].startsWith("new file") || lines[i].startsWith("old mode") || lines[i].startsWith("new mode") || lines[i].startsWith("deleted file") || lines[i].startsWith("similarity"))) {
        if (lines[i].startsWith("new file")) mode = "new";
        i++;
      }
      // hunk headers
      while (i < lines.length && !lines[i].startsWith("diff --git ")) {
        const l = lines[i];
        if (l.startsWith("@@")) { i++; continue; }
        if (l.startsWith("+")) newContent.push(l.slice(1));
        else if (l.startsWith("-")) oldContent.push(l.slice(1));
        else if (l.startsWith(" ") || l === "") newContent.push(l.startsWith(" ") ? l.slice(1) : "");
        i++;
      }
      files.push({ path: filePath, action: mode === "new" ? "write" : "edit", newContent: newContent.join("\n") });
    } else {
      i++;
    }
  }
  return files;
}
