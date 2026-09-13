// ── Shared types for the SandForge engine ──────────────────────────────

export type RunStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface FileEdit {
  path: string; // repo-relative
  action: "write" | "search_replace";
  content?: string; // for write
  search?: string; // for search_replace
  replace?: string; // for search_replace
}

export interface PlanStep {
  n: number;
  title: string;
  detail: string;
}

export interface TestOutcome {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  passed: boolean;
  durationMs: number;
  /** checkpoint after this test run, when the provider returns one */
  checkpoint?: string | null;
  /** extracted failing test names, best-effort */
  failures: string[];
}

export interface BranchNode {
  id: string;
  parentId: string | null;
  label: string;
  /** contree image uuid (checkpoint) or local snapshot id */
  checkpoint: string | null;
  status: "green" | "red" | "pending";
  attempt: number;
  strategy: string;
  createdAt: string;
}

export type RunEvent =
  | { type: "run_started"; ts: string; task: string; repo: string }
  | { type: "providers"; ts: string; llm: string; sandbox: string; models?: Record<string, string> }
  | { type: "sandbox_ready"; ts: string; provider: string; checkpoint: string | null; detail: string }
  | { type: "plan"; ts: string; steps: PlanStep[]; model: string; latencyMs: number; tokensIn?: number; tokensOut?: number }
  | { type: "attempt_started"; ts: string; attempt: number; fromCheckpoint: string | null; strategy: string }
  | { type: "llm_call"; ts: string; purpose: "plan" | "code" | "summarize" | "pr"; model: string; latencyMs: number; tokensIn?: number; tokensOut?: number }
  | { type: "edits_applied"; ts: string; edits: { path: string; action: string; ok: boolean; error?: string }[] }
  | { type: "test_run"; ts: string; outcome: TestOutcome }
  | { type: "branch"; ts: string; node: BranchNode; reason: string }
  | { type: "backtrack"; ts: string; fromAttempt: number; toCheckpoint: string; reason: string }
  | { type: "pr_opened"; ts: string; url: string; branch: string; additions: number }
  | { type: "run_finished"; ts: string; status: RunStatus; summary: string; stats: RunStats }
  | { type: "error"; ts: string; message: string };

export interface RunStats {
  attempts: number;
  llmCalls: number;
  tokensIn: number;
  tokensOut: number;
  testRuns: number;
  branches: number;
  wallClockMs: number;
}

export interface RunRecord {
  id: string;
  task: string;
  repoUrl: string;
  repoRef?: string;
  status: RunStatus;
  createdAt: string;
  finishedAt?: string;
  llmProvider: string;
  sandboxProvider: string;
  events: RunEvent[];
  branchTree: BranchNode[];
  currentAttempt: number;
  prUrl?: string;
  diff?: string;
  stats: RunStats;
}

export interface RunSummary {
  id: string;
  task: string;
  repoUrl: string;
  status: RunStatus;
  createdAt: string;
  attempts: number;
  prUrl?: string;
  llmProvider: string;
  sandboxProvider: string;
}
