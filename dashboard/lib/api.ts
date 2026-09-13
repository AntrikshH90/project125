// Shared client-side API helpers + types (subset of server types)

export interface RunEventLite {
  type: string;
  ts: string;
  [k: string]: unknown;
}

export interface BranchNodeLite {
  id: string;
  parentId: string | null;
  label: string;
  checkpoint: string | null;
  status: "green" | "red" | "pending";
  attempt: number;
  strategy: string;
  createdAt: string;
}

export interface RunSummaryLite {
  id: string;
  task: string;
  repoUrl: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  createdAt: string;
  attempts: number;
  prUrl?: string;
  llmProvider: string;
  sandboxProvider: string;
}

export interface RunDetailLite {
  id: string;
  task: string;
  repoUrl: string;
  status: RunSummaryLite["status"];
  createdAt: string;
  llmProvider: string;
  sandboxProvider: string;
  branchTree: BranchNodeLite[];
  events: RunEventLite[];
  prUrl?: string;
  diff?: string;
  stats: {
    attempts: number;
    llmCalls: number;
    tokensIn: number;
    tokensOut: number;
    testRuns: number;
    branches: number;
    wallClockMs: number;
  };
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4021";

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`api ${path}: ${res.status}`);
  return res.json();
}

export async function startRun(body: { task: string; repoUrl: string }): Promise<{ id: string; status: string; prUrl?: string }> {
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || "start failed");
  return res.json();
}
