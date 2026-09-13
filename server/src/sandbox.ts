// ── Sandbox providers: Nebius Contree (Token Factory Sandboxes) or local git ──
//
// Contree = "Git for container execution": each non-disposable run produces a
// checkpoint image (result_image_uuid); spawning from that image = branching;
// spawning from an earlier checkpoint = backtracking.
//
// Local provider mirrors the same primitives with real git:
//   bootstrap = clone, writeFile = commit (new sha), backtrack = checkout -f.

import { exec as nodeExec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(nodeExec);

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  /** contree image uuid or local git sha — pass to run()/writeFile() to branch from it */
  checkpoint: string | null;
}

export interface SandboxProvider {
  readonly name: string;
  readonly baseImage: string;
  bootstrap(
    repoUrl: string,
    ref: string | undefined,
    runId: string,
  ): Promise<{ checkpoint: string | null; log: string }>;
  run(
    cmd: string,
    opts: {
      runId: string;
      checkpoint?: string | null;
      cwd?: string;
      timeoutSec?: number;
    },
  ): Promise<RunResult>;
  readFile(p: string, runId: string): Promise<string>;
  writeFile(
    p: string,
    content: string,
    checkpoint: string | null,
    msg: string,
    runId: string,
  ): Promise<{ checkpoint: string | null }>;
  backtrack(runId: string, checkpoint: string): Promise<void>;
  diff(runId: string): Promise<string>;
  cleanup(): Promise<void>;
}

// ── Local (git-backed, host OS) ─────────────────────────────────────────

export class LocalSandbox implements SandboxProvider {
  readonly name = "local";
  readonly baseImage = "host";
  private dirs = new Map<string, string>();

  constructor(private dataDir: string) {}

  dir(runId: string): string {
    let d = this.dirs.get(runId);
    if (!d) {
      d = path.join(this.dataDir, "work", runId, "repo");
      fs.mkdirSync(path.dirname(d), { recursive: true });
      this.dirs.set(runId, d);
    }
    return d;
  }

  private async git(runId: string, ...args: string[]): Promise<string> {
    const { stdout } = await exec(`git ${args.join(" ")}`, {
      cwd: this.dir(runId),
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.trim();
  }

  async bootstrap(
    repoUrl: string,
    ref: string | undefined,
    runId: string,
  ): Promise<{ checkpoint: string | null; log: string }> {
    const d = this.dir(runId);
    if (fs.existsSync(path.join(d, ".git"))) {
      // stale state from a previous process — wipe and re-clone
      fs.rmSync(path.dirname(d), { recursive: true, force: true });
      fs.mkdirSync(path.dirname(d), { recursive: true });
    }
    {
      const refPart = ref ? `--branch ${ref}` : "";
      // clone into the repo dir (parent exists)
      await exec(`git clone --depth 50 ${refPart} ${JSON.stringify(repoUrl)} repo`, {
        cwd: path.dirname(d),
        maxBuffer: 16 * 1024 * 1024,
      });
      await this.git(runId, "config", "user.email", "sandforge@nebius.dev");
      await this.git(runId, "config", "user.name", "SandForge Agent");
      await this.git(runId, "config", "core.autocrlf", "false");
    }
    const sha = await this.git(runId, "rev-parse", "HEAD");
    return { checkpoint: sha, log: `cloned ${repoUrl} @ ${sha}` };
  }

  async run(
    cmd: string,
    opts: { runId: string; checkpoint?: string | null; cwd?: string; timeoutSec?: number },
  ): Promise<RunResult> {
    const cwdAbs = path.join(this.dir(opts.runId), opts.cwd || "");
    const t0 = Date.now();
    let out: { stdout: string; stderr: string } | null = null;
    let exitCode = 0;
    try {
      out = await exec(cmd, {
        cwd: cwdAbs,
        maxBuffer: 16 * 1024 * 1024,
        timeout: (opts.timeoutSec ?? 120) * 1000,
        windowsHide: true,
      });
    } catch (e: any) {
      out = { stdout: e.stdout || "", stderr: e.stderr || "" };
      exitCode = typeof e.code === "number" ? e.code : 1;
    }
    let cp: string | null = null;
    try {
      cp = await this.git(opts.runId, "rev-parse", "HEAD");
    } catch {
      /* ignore */
    }
    return {
      exitCode,
      stdout: out.stdout || "",
      stderr: out.stderr || "",
      durationMs: Date.now() - t0,
      checkpoint: cp,
    };
  }

  async readFile(p: string, runId: string): Promise<string> {
    const abs = path.join(this.dir(runId), p);
    return fs.readFileSync(abs, "utf-8");
  }

  async writeFile(
    p: string,
    content: string,
    _checkpoint: string | null,
    msg: string,
    runId: string,
  ): Promise<{ checkpoint: string | null }> {
    const abs = path.join(this.dir(runId), p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    await this.git(runId, "add", "-A");
    await exec(`git commit -m ${JSON.stringify(msg)} --allow-empty`, {
      cwd: this.dir(runId),
    });
    return { checkpoint: await this.git(runId, "rev-parse", "HEAD") };
  }

  async backtrack(runId: string, checkpoint: string): Promise<void> {
    await exec(`git checkout -f ${JSON.stringify(checkpoint)}`, {
      cwd: this.dir(runId),
    });
    // detach HEAD so future commits form a new branch implicitly
  }

  async diff(runId: string): Promise<string> {
    try {
      const base = await this.git(runId, "merge-base", "HEAD", "origin/HEAD");
      const { stdout } = await exec(`git diff ${base}..HEAD`, {
        cwd: this.dir(runId),
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout;
    } catch {
      return "";
    }
  }

  async cleanup(): Promise<void> {}
}

// ── Contree (Nebius Token Factory Sandboxes REST) ───────────────────────

export class ContreeSandbox implements SandboxProvider {
  readonly name = "contree";
  readonly baseImage: string;
  private apiKey: string;
  private projectId: string;
  private base: string;
  private active = new Map<string, string | null>(); // runId -> checkpoint

  constructor(apiKey: string, projectId: string, base: string, baseImage: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.base = base.replace(/\/$/, "");
    this.baseImage = baseImage;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      Project: this.projectId,
    };
  }

  private async req(
    method: string,
    urlPath: string,
    body?: unknown,
    timeoutMs = 60_000,
  ): Promise<{ res: Response; data: any }> {
    const res = await fetch(`${this.base}${urlPath}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { res, data };
  }

  async bootstrap(
    repoUrl: string,
    ref: string | undefined,
    runId: string,
  ): Promise<{ checkpoint: string | null; log: string }> {
    const refPart = ref ? `--branch ${ref}` : "";
    const r = await this.spawn(
      `git clone --depth 50 ${refPart} ${repoUrl} repo && cd repo && ls | head -20`,
      { runId, cwd: "/workspace", timeoutSec: 300 },
    );
    if (r.exitCode !== 0)
      throw new Error(`contree bootstrap failed: ${r.stderr || r.stdout}`);
    this.active.set(runId, r.checkpoint);
    return { checkpoint: r.checkpoint, log: `cloned (exit ${r.exitCode})\n${r.stdout.slice(0, 1500)}` };
  }

  async run(
    cmd: string,
    opts: { runId: string; checkpoint?: string | null; cwd?: string; timeoutSec?: number },
  ): Promise<RunResult> {
    return this.spawn(cmd, opts);
  }

  private async spawn(
    cmd: string,
    opts: { runId: string; checkpoint?: string | null; cwd?: string; timeoutSec?: number },
  ): Promise<RunResult> {
    const image = opts.checkpoint || this.active.get(opts.runId) || `tag:${this.baseImage}`;
    const t0 = Date.now();
    const { res, data } = await this.req("POST", "/instances", {
      image,
      command: cmd,
      shell: true,
      cwd: opts.cwd || "",
      timeout: opts.timeoutSec ?? 180,
      disposable: false,
      truncate_output_at: 2_097_152,
      env: {
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        GIT_TERMINAL_PROMPT: "0",
        HOME: "/root",
      },
    });
    if (!res.ok) {
      throw new Error(`contree spawn ${res.status}: ${String(data).slice(0, 300)}`);
    }
    const loc = res.headers.get("location") || "";
    const opId = loc.split("/").filter(Boolean).pop() || data?.uuid;
    if (!opId) throw new Error("contree spawn: no operation id");

    let op: any = null;
    for (let i = 0; i < 600; i++) {
      const { res: r2, data: op2 } = await this.req("GET", `/operations/${opId}`);
      if (!r2.ok) throw new Error(`contree poll ${r2.status}: ${String(op2).slice(0, 200)}`);
      op = op2;
      if (["SUCCESS", "FAILED", "CANCELLED"].includes(op?.status)) break;
      await sleep(2000);
    }
    if (!op) throw new Error("contree: operation never resolved");
    const durMs = Date.now() - t0;
    const exitCode =
      op?.metadata?.result?.state?.exit_code ??
      (op.status === "SUCCESS" ? 0 : 1);
    const stdout = str(op?.metadata?.result?.stdout) ?? "";
    const stderr =
      str(op?.metadata?.result?.stderr) ??
      (op.status === "SUCCESS" ? "" : op?.error || `operation ${op.status}`);
    const checkpoint = op.result_image_uuid ?? null;
    if (checkpoint) this.active.set(opts.runId, checkpoint);
    return { exitCode, stdout, stderr, durationMs: durMs, checkpoint };
  }

  async readFile(p: string, runId: string): Promise<string> {
    // cat the file from the current checkpoint via a tiny run
    const r = await this.spawn(`cat ${JSON.stringify(p)}`, { runId, timeoutSec: 60 });
    if (r.exitCode !== 0) throw new Error(`readFile: ${r.stderr}`);
    return r.stdout;
  }

  async writeFile(
    p: string,
    content: string,
    _checkpoint: string | null,
    msg: string,
    runId: string,
  ): Promise<{ checkpoint: string | null }> {
    const b64 = Buffer.from(content, "utf-8").toString("base64");
    const cmd = `mkdir -p $(dirname ${JSON.stringify(p)}) && printf '%s' '${b64}' | base64 -d > ${JSON.stringify(p)} && cd repo && git add -A && git -c user.email=agent@sandforge.dev -c user.name=SandForge commit -m ${JSON.stringify(msg)} --allow-empty || true`;
    const r = await this.spawn(cmd, { runId, timeoutSec: 120 });
    if (r.exitCode !== 0)
      throw new Error(`contree writeFile: ${r.stderr || r.stdout.slice(0, 300)}`);
    return { checkpoint: r.checkpoint };
  }

  async backtrack(runId: string, checkpoint: string): Promise<void> {
    // branching from an earlier checkpoint = simply spawn from it
    this.active.set(runId, checkpoint);
  }

  async diff(runId: string): Promise<string> {
    const r = await this.spawn("cd /workspace/repo && git diff", { runId, timeoutSec: 60 });
    return r.stdout;
  }

  async cleanup(): Promise<void> {
    /* checkpoint images retained (180-day beta retention) */
  }
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  const o = v as any;
  if (typeof o.repr === "string") return o.repr;
  if (typeof o.text === "string") return o.text;
  if (Array.isArray(o)) return o.join("");
  return JSON.stringify(v);
}

function sleep(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms));
}
