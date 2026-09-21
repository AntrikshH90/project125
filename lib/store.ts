// store.ts — file-backed job store. Every mutation persists to downloads/<id>/job.json
// so state is shared across route bundles (Turbopack dev gives each route its own module
// instance — in-memory Maps don't survive that; the filesystem always does) and survives
// server restarts.

import fs from "node:fs";
import path from "node:path";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobFile {
  name: string;
  sizeBytes: number;
  kind: "pdf" | "csv" | "json" | "jsonl" | "txt" | "md" | "zip" | "bib" | "other";
}

export interface Job {
  id: string;
  createdAt: number;
  status: JobStatus;
  ask: string;
  plan: string;
  kind: string;
  intent: any;
  progress: number;
  stage: string;
  itemsDone: number;
  itemsTotal: number;
  files: JobFile[];
  preview: any[];
  error?: string;
  finishedAt?: number;
  logs: string[];
}

const MAX_LOGS = 200;

export const ROOT = path.join(process.cwd(), "downloads");

export function jobDir(id: string): string {
  const d = path.join(ROOT, id);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function jobFile(id: string): string {
  return path.join(ROOT, id, "job.json");
}

export function fileKind(name: string): JobFile["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "csv", "json", "jsonl", "txt", "md", "zip", "bib"].includes(ext)) return ext as JobFile["kind"];
  return "other";
}

export function createJob(ask: string, plan: string, kind: string, intent: any): Job {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const job: Job = {
    id, createdAt: Date.now(), status: "queued", ask, plan, kind, intent,
    progress: 0, stage: "starting", itemsDone: 0, itemsTotal: 0,
    files: [], preview: [], logs: [],
  };
  jobDir(id);
  persist(job);
  return job;
}

// Always read from disk — the writing bundle and reading bundle may be different module instances.
export function getJob(id: string): Job | undefined {
  if (!/^[\w-]+$/.test(id)) return undefined;
  const fp = jobFile(id);
  if (!fs.existsSync(fp)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8")) as Job;
  } catch {
    return undefined;
  }
}

function persist(j: Job) {
  try {
    fs.writeFileSync(jobFile(j.id), JSON.stringify(j));
  } catch { /* best-effort */ }
}

// Serialize read-modify-write per job id (PDF workers update concurrently).
const locks = new Map<string, Promise<void>>();

function withLock<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = async () => fn();
  const next = prev.then(run, run);
  locks.set(id, next.then(() => undefined, () => undefined));
  return next;
}

export function update(id: string, patch: Partial<Job>) {
  return withLock(id, () => {
    const j = getJob(id);
    if (!j) return;
    Object.assign(j, patch);
    persist(j);
  });
}

export function log(id: string, msg: string) {
  return withLock(id, () => {
    const j = getJob(id);
    if (!j) return;
    j.logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    if (j.logs.length > MAX_LOGS) j.logs.splice(0, j.logs.length - MAX_LOGS);
    persist(j);
  });
}

export function addFiles(id: string, dir: string) {
  return withLock(id, () => {
    const j = getJob(id);
    if (!j) return;
    j.files = fs.readdirSync(dir)
      .filter((n) => n !== "job.json")
      .map((name) => {
        const st = fs.statSync(path.join(dir, name));
        return { name, sizeBytes: st.size, kind: fileKind(name) };
      })
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
    persist(j);
  });
}

export function fileList(id: string): JobFile[] {
  const d = path.join(ROOT, id);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d)
    .filter((n) => n !== "job.json")
    .map((name) => {
      const st = fs.statSync(path.join(d, name));
      return { name, sizeBytes: st.size, kind: fileKind(name) };
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
}

export function publicJob(j: Job) {
  return { ...j, logs: j.logs.slice(-40) };
}

export interface JobSummary {
  id: string;
  ask: string;
  status: JobStatus;
  kind: string;
  createdAt: number;
  finishedAt?: number;
  itemsDone: number;
  itemsTotal: number;
  files: number;
  totalBytes: number;
}

// Scan downloads/ for job.json files — survives restarts, powers the history UI.
export function listJobs(limit = 30): JobSummary[] {
  if (!fs.existsSync(ROOT)) return [];
  const out: JobSummary[] = [];
  for (const id of fs.readdirSync(ROOT)) {
    if (!/^[\w-]+$/.test(id)) continue;
    const fp = path.join(ROOT, id, "job.json");
    if (!fs.existsSync(fp)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(fp, "utf8")) as Job;
      const files = j.files ?? [];
      out.push({
        id: j.id, ask: j.ask, status: j.status, kind: j.kind,
        createdAt: j.createdAt, finishedAt: j.finishedAt,
        itemsDone: j.itemsDone, itemsTotal: j.itemsTotal,
        files: files.length,
        totalBytes: files.reduce((a, f) => a + f.sizeBytes, 0),
      });
    } catch { /* skip corrupt */ }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
