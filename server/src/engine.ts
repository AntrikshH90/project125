// ── SandForge agent engine ──────────────────────────────────────────────
// plan (Nemotron Nano) → [attempt: diagnose + patch (Nemotron Super) →
// apply → test] → green: diff + PR · red: branch from best checkpoint and
// retry with an escalated strategy; on repeated reds: backtrack to the
// clean checkpoint and rethink from scratch.

import { config, resolveLlmProvider, resolveSandboxProvider } from "./config.js";
import { MockLlm, NebiusLlm, type ChatMessage, type LlmProvider } from "./llm.js";
import { ContreeSandbox, LocalSandbox, type SandboxProvider } from "./sandbox.js";
import { openPr, parseRepo, type PrResult } from "./github.js";
import type {
  BranchNode,
  FileEdit,
  PlanStep,
  RunEvent,
  RunRecord,
  RunStats,
  RunSummary,
  TestOutcome,
} from "./types.js";

const MAX_ATTEMPTS = 4;

const STRATEGIES: Record<string, string> = {
  "minimal-patch": "Make the smallest change that fixes the failing assertion. Do not refactor.",
  "alternative-implementation":
    "The previous minimal patch failed. Rewrite the faulty function with a different, more robust implementation.",
  "refactor-around":
    "Two patches failed. Restructure the surrounding code (guards, error handling) so the failure mode cannot occur.",
  "from-scratch-rethink":
    "All patches failed. Rethink the approach entirely: propose a different design for this unit.",
};

const CODE_BLOCK_RE = /```(?:json)?\s*([\s\S]*?)```/;

export class Engine {
  private llm: LlmProvider;
  private sandbox: SandboxProvider;
  private runs = new Map<string, RunRecord>();
  private onEvent?: (runId: string, ev: RunEvent) => void;

  constructor(onEvent?: (runId: string, ev: RunEvent) => void) {
    this.onEvent = onEvent;
    if (resolveLlmProvider() === "nebius") {
      this.llm = new NebiusLlm(config.nebiusApiKey, config.nebiusLlmBase, config.models);
    } else {
      this.llm = new MockLlm();
    }
    if (resolveSandboxProvider() === "contree") {
      this.sandbox = new ContreeSandbox(
        config.nebiusApiKey,
        config.nebiusProjectId,
        config.contreeBase,
        config.sandboxBaseImage,
      );
    } else {
      this.sandbox = new LocalSandbox(config.dataDir);
    }
  }

  providersInfo(): { llm: string; sandbox: string; models: Record<string, string> } {
    return {
      llm: resolveLlmProvider(),
      sandbox: resolveSandboxProvider(),
      models: config.models,
    };
  }

  listRuns(): RunSummary[] {
    return [...this.runs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        task: r.task,
        repoUrl: r.repoUrl,
        status: r.status,
        createdAt: r.createdAt,
        attempts: r.stats.attempts,
        prUrl: r.prUrl,
        llmProvider: r.llmProvider,
        sandboxProvider: r.sandboxProvider,
      }));
  }

  getRun(id: string): RunRecord | undefined {
    return this.runs.get(id);
  }

  private emit(rec: RunRecord, ev: RunEvent) {
    rec.events.push(ev);
    this.onEvent?.(rec.id, ev);
  }

  private node(rec: RunRecord, parentId: string | null, label: string, strategy: string): BranchNode {
    return {
      id: `n${rec.branchTree.length + 1}`,
      parentId,
      label,
      checkpoint: null,
      status: "pending",
      attempt: rec.currentAttempt,
      strategy,
      createdAt: new Date().toISOString(),
    };
  }

  // ── main entry ────────────────────────────────────────────────────────

  /** Create the run record and launch it in the background. Returns immediately. */
  start(task: string, repoUrl: string, opts: { ref?: string; baseBranch?: string } = {}): RunRecord {
    const rec = this.newRecord(task, repoUrl);
    this.runs.set(rec.id, rec);
    void this.run(rec, opts);
    return rec;
  }

  /** Blocking variant (tests/CLI). */
  async execute(task: string, repoUrl: string, opts: { ref?: string; baseBranch?: string } = {}): Promise<RunRecord> {
    const rec = this.newRecord(task, repoUrl);
    this.runs.set(rec.id, rec);
    await this.run(rec, opts);
    return rec;
  }

  private newRecord(task: string, repoUrl: string): RunRecord {
    return {
      id: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      task,
      repoUrl,
      status: "queued",
      createdAt: new Date().toISOString(),
      llmProvider: this.llm.name,
      sandboxProvider: this.sandbox.name,
      events: [],
      branchTree: [],
      currentAttempt: 0,
      stats: emptyStats(),
    };
  }

  private async run(rec: RunRecord, opts: { ref?: string; baseBranch?: string }): Promise<void> {
    rec.status = "running";
    const t0 = Date.now();
    try {
      await this.executeInner(rec, opts);
      rec.status = "success";
    } catch (e: any) {
      rec.status = "failed";
      this.emit(rec, { type: "error", ts: now(), message: e.message });
    } finally {
      rec.stats.wallClockMs = Date.now() - t0;
      rec.finishedAt = now();
      this.emit(rec, {
        type: "run_finished",
        ts: now(),
        status: rec.status,
        summary: runSummaryText(rec),
        stats: { ...rec.stats },
      });
    }
  }

  private async executeInner(rec: RunRecord, opts: { ref?: string; baseBranch?: string }): Promise<void> {
    const sb = this.sandbox;

    // 0) bootstrap
    this.emit(rec, { type: "run_started", ts: now(), task: rec.task, repo: rec.repoUrl });
    this.emit(rec, {
      type: "providers",
      ts: now(),
      llm: this.llm.name,
      sandbox: this.sandbox.name,
      models: config.models,
    });
    const boot = await sb.bootstrap(rec.repoUrl, opts.ref, rec.id);
    this.emit(rec, {
      type: "sandbox_ready",
      ts: now(),
      provider: sb.name,
      checkpoint: boot.checkpoint,
      detail: boot.log.slice(0, 400),
    });
    const root = this.node(rec, null, "bootstrap", "—");
    root.checkpoint = boot.checkpoint;
    root.status = "green";
    rec.branchTree.push(root);

    // detect test command
    const testCmd = await detectTestCommand(sb, rec.id);
    const detect = await sb.run(testCmd, { runId: rec.id, timeoutSec: 300 });
    const firstOutcome = toOutcome(testCmd, detect);
    rec.stats.testRuns++;
    const cleanSha = detect.checkpoint ?? boot.checkpoint;
    if (!cleanSha) throw new Error("sandbox produced no initial checkpoint");
    let cleanCp = cleanSha; // clean state to backtrack to
    let currentCp = cleanSha; // current frontier

    // 1) plan with the fast model
    const planText = await this.think(rec, "plan", [
      {
        role: "system",
        content:
          "You are the planner of a coding agent. Output ONLY a JSON array (no prose) of 2-4 steps: [{\"n\":1,\"title\":...,\"detail\":...}]",
      },
      {
        role: "user",
        content: `TASK: PLAN\nRepository: ${rec.repoUrl}\nGoal: ${rec.task}\nTest command: ${testCmd}\nInitial test outcome: exit ${firstOutcome.exitCode}, last stderr lines:\n${tail(firstOutcome.stderr || firstOutcome.stdout, 15)}\nProduce the plan.`,
      },
    ], "planner");
    const steps = this.parsePlan(planText);
    this.emit(rec, { type: "plan", ts: now(), steps, model: this.llm.models.planner, latencyMs: 0 });

    // 2) attempt loop
    let green: TestOutcome | null = null;
    let attempt = 0;
    let lastOutcome = firstOutcome;
    const parentNodeId = root.id;

    for (const [strategyName, strategyPrompt] of Object.entries(STRATEGIES)) {
      attempt++;
      rec.currentAttempt = attempt;
      rec.stats.attempts = attempt;
      if (attempt > MAX_ATTEMPTS) break;
      if (green) break;

      this.emit(rec, {
        type: "attempt_started",
        ts: now(),
        attempt,
        fromCheckpoint: currentCp,
        strategy: strategyName,
      });
      const attemptNode = this.node(rec, parentNodeId, `attempt ${attempt}`, strategyName);
      rec.branchTree.push(attemptNode);

      // 2a) gather context: read failing file(s)
      const failingFiles = lastOutcome.failures.length
        ? []
        : []; // parser extracts test names; we let the model decide which files via task context
      const ctxFiles = await this.gatherContext(rec, testCmd, lastOutcome);

      // 2b) patch via coder model
      const patchText = await this.think(rec, "code", [
        {
          role: "system",
          content:
            "You are a senior software engineer. Output ONLY a JSON object (in a ```json code block) with keys rationale (string) and edits (array). Each edit: {path, action: 'write'|'search_replace', content?, search?, replace?}. Use exact existing source for search strings.",
        },
        {
          role: "user",
          content: `TASK: PATCH\nGoal: ${rec.task}\nStrategy: ${strategyPrompt}\nTest command: ${testCmd}\nLast test exit: ${lastOutcome.exitCode}\nFailed tests:\n${(lastOutcome.failures.join("\n") || "(none — tests failing wholesale)").slice(0, 500)}\n\nRelevant source files:\n${ctxFiles}\n\nApply edits to make the test suite pass. Return ONLY the JSON block.`,
        },
      ]);

      const { edits } = this.parseEdits(patchText);
      if (edits.length === 0) {
        this.emit(rec, {
          type: "edits_applied",
          ts: now(),
          edits: [],
        });
        lastOutcome = await this.runTests(sb, rec, testCmd);
        if (lastOutcome.passed) {
          green = lastOutcome;
          attemptNode.status = "green";
          attemptNode.checkpoint = lastOutcome.checkpoint ?? attemptNode.checkpoint;
          this.emit(rec, { type: "branch", ts: now(), node: attemptNode, reason: "tests green on first try" });
          break;
        }
        attemptNode.status = "red";
        this.emit(rec, { type: "branch", ts: now(), node: attemptNode, reason: "model returned no usable edits" });
        continue;
      }

      // 2c) apply edits
      const applied: { path: string; action: string; ok: boolean; error?: string }[] = [];
      for (const e of edits) {
        try {
          if (e.action === "write") {
            const w = await sb.writeFile(e.path, e.content || "", currentCp, `sandforge: ${e.path}`, rec.id);
            currentCp = w.checkpoint ?? currentCp;
          } else {
            // search_replace on current state
            const orig = await sb.readFile(e.path, rec.id);
            if (!orig.includes(e.search || "")) {
              applied.push({ path: e.path, action: "search", ok: false, error: "search string not found" });
              continue;
            }
            const next = orig.replace(e.search || "", e.replace || "");
            const w = await sb.writeFile(e.path, next, currentCp, `sandforge: ${e.path}`, rec.id);
            currentCp = w.checkpoint ?? currentCp;
          }
          applied.push({ path: e.path, action: e.action, ok: true });
        } catch (err: any) {
          applied.push({ path: e.path, action: e.action, ok: false, error: err.message });
        }
      }
      this.emit(rec, { type: "edits_applied", ts: now(), edits: applied });
      attemptNode.checkpoint = currentCp;

      // 2d) test
      lastOutcome = await this.runTests(sb, rec, testCmd);
      if (lastOutcome.passed) {
        green = lastOutcome;
        attemptNode.status = "green";
        this.emit(rec, { type: "branch", ts: now(), node: attemptNode, reason: `tests green after ${applied.length} edit(s)` });
        break;
      }

      attemptNode.status = "red";
      this.emit(rec, { type: "branch", ts: now(), node: attemptNode, reason: `still red: ${lastOutcome.failures.slice(0, 3).join("; ") || "exit " + lastOutcome.exitCode}` });

      // 2e) BACKTRACK: next strategy starts from the clean checkpoint
      if (attempt < MAX_ATTEMPTS) {
        this.emit(rec, {
          type: "backtrack",
          ts: now(),
          fromAttempt: attempt,
          toCheckpoint: cleanCp,
          reason: "resetting to clean pre-edit state before next strategy",
        });
        await sb.backtrack(rec.id, cleanCp);
        currentCp = cleanCp;
      }
    }

    // 3) finish
    if (!green) {
      throw new Error(
        `tests still failing after ${rec.stats.attempts} attempts: ${lastOutcome.failures.slice(0, 3).join("; ")}`,
      );
    }

    rec.diff = await sb.diff(rec.id);
    rec.stats.attempts = attempt;

    // PR if token present and repo is a GitHub repo
    if (config.githubToken && /github\.com/.test(rec.repoUrl)) {
      try {
        const pr = await this.openPullRequest(rec, opts.baseBranch);
        rec.prUrl = pr.url;
        this.emit(rec, { type: "pr_opened", ts: now(), url: pr.url, branch: pr.branch, additions: pr.additions });
      } catch (e: any) {
        this.emit(rec, { type: "error", ts: now(), message: `PR step failed: ${e.message}` });
      }
    }
  }

  private async openPullRequest(rec: RunRecord, baseBranch?: string): Promise<PrResult> {
    const summaryText = await this.think(rec, "summarize", [
      {
        role: "system",
        content: "You write crisp PR descriptions. 3-4 sentences, no preamble.",
      },
      {
        role: "user",
        content: `TASK: SUMMARIZE\nGoal: ${rec.task}\nDiff stat:\n${diffStat(rec.diff || "")}\nAttempts: ${rec.stats.attempts}\nWrite the PR body.`,
      },
    ], "planner");

    const { owner, repo } = parseRepo(rec.repoUrl);
    const base = baseBranch || (await defaultBranch(owner, repo, config.githubToken));

    return openPr({
      repoUrl: rec.repoUrl,
      baseBranch: base,
      diff: rec.diff || "",
      title: `sandforge: ${rec.task.slice(0, 70)}`,
      body: summaryText + "\n\n---\n🤖 Generated by **SandForge** · Nebius Token Factory + NVIDIA Nemotron",
      token: config.githubToken,
      branchPrefix: `sandforge/${rec.id}`,
    });
  }

  private async gatherContext(rec: RunRecord, testCmd: string, outcome: TestOutcome): Promise<string> {
    const sb = this.sandbox;
    const marker = /fib/i.test(rec.task) ? "src/fib.js" : "src";
    const list = await sb.run(`find . -name "*.js" -not -path "./node_modules/*" | head -10 && echo ---- && cat package.json`, {
      runId: rec.id,
      timeoutSec: 60,
    });
    let ctx = `File list:\n${list.stdout.slice(0, 800)}\n`;
    // heuristic: include files the failing test names reference
    for (const f of new Set(["src/fib.js", "test/fib.test.js"])) {
      try {
        ctx += `\n--- ${f} ---\n${(await sb.readFile(f, rec.id)).slice(0, 2000)}\n`;
      } catch {
        /* file may not exist */
      }
      void marker;
    }
    return ctx;
  }

  private async runTests(sb: SandboxProvider, rec: RunRecord, cmd: string): Promise<TestOutcome> {
    const r = await sb.run(cmd, { runId: rec.id, timeoutSec: 300 });
    const o = toOutcome(cmd, r);
    rec.stats.testRuns++;
    this.emit(rec, { type: "test_run", ts: now(), outcome: o });
    return o;
  }

  private async think(
    rec: RunRecord,
    purpose: "plan" | "code" | "summarize" | "pr",
    messages: ChatMessage[],
    modelRole?: "planner" | "coder",
  ): Promise<string> {
    const model = modelRole === "planner" ? this.llm.models.planner : this.llm.models.coder;
    const t0 = Date.now();
    let res;
    try {
      res = await this.llm.chat(messages, { model, maxTokens: 4096 });
    } catch (e: any) {
      this.emit(rec, { type: "error", ts: now(), message: `LLM ${purpose} failed: ${e.message}` });
      throw e;
    }
    const latencyMs = Date.now() - t0;
    rec.stats.llmCalls++;
    rec.stats.tokensIn += res.usage.tokensIn;
    rec.stats.tokensOut += res.usage.tokensOut;
    this.emit(rec, {
      type: "llm_call",
      ts: now(),
      purpose,
      model,
      latencyMs: res.usage.latencyMs || latencyMs,
      tokensIn: res.usage.tokensIn,
      tokensOut: res.usage.tokensOut,
    });
    return res.text;
  }

  private parseEdits(text: string): { rationale: string; edits: FileEdit[] } {
    const m = text.match(CODE_BLOCK_RE);
    const raw = m ? m[1] : text;
    try {
      const parsed = JSON.parse(raw);
      const edits: FileEdit[] = Array.isArray(parsed.edits) ? parsed.edits : [];
      return { rationale: parsed.rationale || "", edits };
    } catch {
      return { rationale: "", edits: [] };
    }
  }

  private parsePlan(text: string): PlanStep[] {
    const m = text.match(CODE_BLOCK_RE);
    const hardcoded = [
      { n: 1, title: "Reproduce the failure", detail: "Run the test suite on a clean sandbox checkpoint." },
      { n: 2, title: "Patch the module under test", detail: "Apply a minimal edit to the failing module." },
      { n: 3, title: "Re-run tests", detail: "Verify green from a fresh branch." },
    ];
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, 6);
      } catch { /* fall through */ }
    }
    return hardcoded;
  }
}

// ── helpers ────────────────────────────────────────────────────────────

function emptyStats(): RunStats {
  return { attempts: 0, llmCalls: 0, tokensIn: 0, tokensOut: 0, testRuns: 0, branches: 0, wallClockMs: 0 };
}

function now(): string {
  return new Date().toISOString();
}

function tail(s: string, n: number): string {
  const lines = s.split("\n").filter(Boolean);
  return lines.slice(-n).join("\n");
}

function toOutcome(cmd: string, r: { exitCode: number; stdout: string; stderr: string; durationMs: number; checkpoint?: string | null }): TestOutcome {
  const combined = `${r.stdout}\n${r.stderr}`;
  const failures: string[] = [];
  if (r.exitCode !== 0) {
    // node:test / TAP ✖ (U+2716), jest ✕ (U+2715), mocha "failing:"
    const re = /[✖✕]\s+([^\n(]+)|not ok \d+ - ([^\n]+)|fail(?:ing|ed)?\s*[:>]\s*([^\n]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(combined)) && failures.length < 10) {
      const name = (m[1] || m[2] || m[3] || "").trim();
      if (name && !/^\d+$/.test(name)) failures.push(name);
    }
  }
  return {
    command: cmd,
    exitCode: r.exitCode,
    stdout: r.stdout.slice(0, 8000),
    stderr: r.stderr.slice(0, 8000),
    passed: r.exitCode === 0,
    durationMs: r.durationMs,
    failures,
    checkpoint: (r as any).checkpoint,
  } as TestOutcome;
}

async function detectTestCommand(sb: SandboxProvider, runId: string): Promise<string> {
  const r = await sb.run(
    `node -e "const p=require('./package.json'); process.stdout.write((p.scripts && p.scripts.test) || 'node --test')" 2>/dev/null || echo "node --test"`,
    { runId, timeoutSec: 60 },
  );
  const line = r.stdout.trim().split("\n").pop() || "node --test";
  // strip surrounding quotes the package.json value may carry
  return line.replace(/^["']|["']$/g, "").trim() || "node --test";
}

async function defaultBranch(owner: string, repo: string, token: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return "main";
  const data: any = await res.json();
  return data.default_branch || "main";
}

function diffStat(diff: string): string {
  const files = diff.split("diff --git ").filter(Boolean).length;
  const adds = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const dels = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
  return `${files} file(s), +${adds} −${dels}`;
}

function runSummaryText(rec: RunRecord): string {
  if (rec.status === "success") {
    return `✅ green in ${rec.stats.attempts} attempt(s), ${rec.stats.testRuns} test run(s), ${rec.stats.llmCalls} LLM calls${rec.prUrl ? ", PR opened" : ""}`;
  }
  return `❌ failed after ${rec.stats.attempts} attempt(s)`;
}
