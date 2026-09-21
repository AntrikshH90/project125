"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "@/lib/api";

interface JobFile { name: string; sizeBytes: number; kind: string }
interface Job {
  id: string; status: string; ask: string; plan: string; kind: string;
  progress: number; stage: string; itemsDone: number; itemsTotal: number;
  files: JobFile[]; preview: any[]; error?: string; logs: string[];
}

const EXAMPLES = [
  "20 papers on diffusion models with pdfs",
  "100000 rows of amazon product reviews",
  "github repos for web scraping, 15",
  "30 images of neural network art",
  "scrape https://en.wikipedia.org/wiki/Web_scraping",
];

interface HistoryItem {
  id: string; ask: string; status: string; kind: string;
  createdAt: number; itemsDone: number; itemsTotal: number;
  files: number; totalBytes: number;
}

function fmtSize(n: number): string {
  if (n > 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n > 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n > 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

function kindColor(k: string): string {
  switch (k) {
    case "pdf": return "text-red-400";
    case "csv": return "text-emerald-400";
    case "json": case "jsonl": return "text-amber-400";
    case "md": return "text-sky-400";
    case "zip": return "text-fuchsia-400";
    case "bib": return "text-violet-400";
    default: return "text-zinc-400";
  }
}

export default function InstantPage() {
  const [ask, setAsk] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/instant/history`, { credentials: "include" });
      if (r.ok) setHistory(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const reopen = async (id: string) => {
    try {
      const r = await fetch(`${API_URL}/api/instant/ask/${id}`, { credentials: "include" });
      if (!r.ok) return;
      const j: Job = await r.json();
      setJob(j);
      setAsk(j.ask);
    } catch { /* ignore */ }
  };

  const poll = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/instant/ask/${id}`, { credentials: "include" });
        if (!r.ok) throw new Error("gone");
        const j: Job = await r.json();
        setJob(j);
        if (j.status === "done" || j.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          setBusy(false);
          loadHistory();
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        setBusy(false);
      }
    }, 900);
  }, []);

  const go = async (text?: string) => {
    const q = (text ?? ask).trim();
    if (!q || busy) return;
    setBusy(true);
    setJob(null);
    try {
      const r = await fetch(`${API_URL}/api/instant/ask`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ask: q }),
      });
      const j = await r.json();
      if (j.error) { setBusy(false); return; }
      setJob({ id: j.jobId, status: "queued", ask: q, plan: j.plan, kind: j.intent.kind, progress: 0, stage: "queued", itemsDone: 0, itemsTotal: 0, files: [], preview: [], logs: [] });
      poll(j.jobId);
    } catch {
      setBusy(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const running = busy || (job && ["queued", "running"].includes(job.status));
  const done = job?.status === "done";
  const pct = job ? Math.round(job.progress) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instant ⚡</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Type what you want — papers as PDFs, 100k+ row datasets, GitHub repos, images, or any webpage. Files come back, no setup.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder='e.g. "25 papers on vision transformers with pdfs" · "50000 rows of movie reviews" · "scrape https://…"'
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={!!running}
        />
        <button
          onClick={() => go()}
          disabled={!!running || !ask.trim()}
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 whitespace-nowrap"
        >
          {running ? "Working…" : "Get it →"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setAsk(ex); go(ex); }}
            disabled={!!running}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">history</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => reopen(h.id)}
                className={`max-w-56 shrink-0 rounded-lg border px-3 py-2 text-left transition hover:border-primary/50 ${job?.id === h.id ? "border-primary/60 bg-primary/5" : "border-border bg-card/40"}`}
              >
                <div className="truncate text-xs">{h.ask}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className={h.status === "done" ? "text-emerald-500" : h.status === "error" ? "text-destructive" : "text-amber-500"}>{h.status}</span>
                  <span>·</span>
                  <span>{h.files} files</span>
                  <span>·</span>
                  <span>{fmtSize(h.totalBytes)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {job && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">
                  {job.kind} · {job.status}
                </div>
                <div className="text-sm text-muted-foreground">{job.plan}</div>
              </div>
              <div className="text-2xl font-bold tabular-nums">{pct}%</div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${job.status === "error" ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${job.status === "done" ? 100 : pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{job.stage}</span>
              {job.itemsTotal > 0 && (
                <span className="tabular-nums">{job.itemsDone.toLocaleString()} / {job.itemsTotal.toLocaleString()}</span>
              )}
            </div>
            {job.error && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{job.error}</div>
            )}
          </div>

          {job.files.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {job.files.length} files · {fmtSize(job.files.reduce((a, f) => a + f.sizeBytes, 0))}
                </span>
                {done && (
                  <a
                    href={`${API_URL}/api/instant/zip/${job.id}`}
                    className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary"
                  >
                    ↓ Download all (zip)
                  </a>
                )}
              </div>
              <div className="max-h-64 divide-y divide-border overflow-auto">
                {job.files.map((f) => (
                  <a
                    key={f.name}
                    href={`${API_URL}/api/instant/file/${job.id}/${encodeURIComponent(f.name)}`}
                    className="flex items-center justify-between rounded-sm px-2 py-2 hover:bg-muted/50"
                  >
                    <span className={`truncate font-mono text-xs ${kindColor(f.kind)}`}>{f.name}</span>
                    <span className="ml-4 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{fmtSize(f.sizeBytes)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {job.preview && job.preview.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">preview</div>
              <pre className="max-h-56 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
                {JSON.stringify(job.preview, null, 2).slice(0, 3000)}
              </pre>
            </div>
          )}

          {job.logs && job.logs.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">log</div>
              <div className="max-h-48 space-y-1 overflow-auto font-mono text-xs text-muted-foreground/70">
                {job.logs.map((l, i) => (
                  <div key={i} className={l.includes("ERROR") || l.includes("failed") ? "text-destructive" : l.includes("done") ? "text-emerald-500" : ""}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
