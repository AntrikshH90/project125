"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface JobFile { name: string; sizeBytes: number; kind: string }
interface HistoryItem {
  id: string; ask: string; status: string; kind: string;
  createdAt: number; itemsDone: number; itemsTotal: number;
  files: number; totalBytes: number;
}
interface Job {
  id: string; status: string; ask: string; plan: string; kind: string;
  progress: number; stage: string; itemsDone: number; itemsTotal: number;
  files: JobFile[]; preview: any[]; error?: string; logs: string[];
}

const EXAMPLES = [
  "20 papers on diffusion models with pdfs",
  "200000 rows movie reviews dataset",
  "github repos for llm agents, 15",
  "30 images of neural network art",
  "scrape https://en.wikipedia.org/wiki/Web_scraping",
  "papers about transformers attention, 30 pdfs",
  "TCS NQT previous year question papers",
  "python developer jobs in india",
  "data sources for healthcare datasets",
  "vision transformers model with weights",
];

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

export default function Home() {
  const [ask, setAsk] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/ask/history", { cache: "no-store" });
      if (r.ok) setHistory(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const poll = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/ask/status?id=${id}`, { cache: "no-store" });
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
    setJobId(null);
    try {
      const r = await fetch("/api/ask/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ask: q }),
      });
      const j = await r.json();
      if (j.error) { setBusy(false); return; }
      setJobId(j.jobId);
      setJob({ id: j.jobId, status: "queued", ask: q, plan: j.plan, kind: j.intent.kind, progress: 0, stage: "queued", itemsDone: 0, itemsTotal: 0, files: [], preview: [], logs: [] });
      poll(j.jobId);
    } catch (e: any) {
      setBusy(false);
    }
  };

  const reopen = async (id: string) => {
    try {
      const r = await fetch(`/api/ask/status?id=${id}`, { cache: "no-store" });
      if (!r.ok) return;
      const j: Job = await r.json();
      setJob(j);
      setAsk(j.ask);
    } catch { /* ignore */ }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const running = busy || (job && ["queued", "running"].includes(job.status));
  const done = job?.status === "done";
  const pct = job ? Math.round(job.progress) : 0;

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-200 font-sans">
      <main className="max-w-5xl mx-auto px-6 py-14">
        {/* HERO */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
            ⚡ instant scraper
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Ask for anything. Get the files.
          </h1>
          <p className="text-zinc-400 mt-3 text-sm md:text-base">
            Papers as PDFs · 100k+ row datasets · GitHub repos · Images · Any webpage — one box, zero config.
          </p>
        </div>

        {/* INPUT */}
        <div className="flex gap-3 mb-4">
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder='e.g. "25 papers on vision transformers with pdfs" · "50000 rows of amazon reviews" · "scrape https://…"'
            className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            disabled={!!running}
          />
          <button
            onClick={() => go()}
            disabled={!!running || !ask.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold px-6 py-3.5 rounded-lg text-sm transition-all shadow-lg shadow-amber-500/10 whitespace-nowrap"
          >
            {running ? "Working…" : "Get it →"}
          </button>
        </div>

        {/* EXAMPLES */}
        <div className="flex flex-wrap gap-2 mb-10">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setAsk(ex); go(ex); }}
              disabled={!!running}
              className="text-xs bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:text-amber-400 text-zinc-400 px-3 py-1.5 rounded-full transition disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">history</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => reopen(h.id)}
                  className={`shrink-0 text-left border rounded-lg px-3 py-2 max-w-56 transition hover:border-amber-500/50 ${job?.id === h.id ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/40"}`}
                >
                  <div className="text-xs text-zinc-300 truncate">{h.ask}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 flex gap-1.5 items-center">
                    <span className={
                      h.status === "done" ? "text-emerald-400" : h.status === "error" ? "text-red-400" : "text-amber-400"
                    }>{h.status}</span>
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

        {/* JOB PANEL */}
        {job && (
          <div className="space-y-4">
            {/* plan + progress */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-500 font-semibold mb-1">
                    {job.kind} · {job.status}
                  </div>
                  <div className="text-sm text-zinc-300">{job.plan}</div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{pct}%</div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${job.status === "error" ? "bg-red-500" : "bg-gradient-to-r from-amber-600 to-amber-400"}`}
                  style={{ width: `${job.status === "done" ? 100 : pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>{job.stage}</span>
                {(job.itemsTotal > 0) && (
                  <span className="tabular-nums">{job.itemsDone.toLocaleString()} / {job.itemsTotal.toLocaleString()}</span>
                )}
              </div>
              {job.error && (
                <div className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{job.error}</div>
              )}
            </div>

            {/* files */}
            {job.files.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    {job.files.length} files · {fmtSize(job.files.reduce((a, f) => a + f.sizeBytes, 0))}
                  </span>
                  {done && (
                    <a
                      href={`/api/ask/zip?id=${job.id}`}
                      className="text-xs font-semibold text-amber-500 hover:text-amber-400 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-md transition"
                    >
                      ↓ Download all (zip)
                    </a>
                  )}
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-zinc-800/60">
                  {job.files.map((f) => (
                    <a
                      key={f.name}
                      href={`/api/ask/download/${job.id}/${encodeURIComponent(f.name)}`}
                      className="flex items-center justify-between py-2 px-2 hover:bg-zinc-800/40 rounded-sm group"
                    >
                      <span className={`font-mono text-xs ${kindColor(f.kind)} truncate`}>{f.name}</span>
                      <span className="text-xs text-zinc-500 tabular-nums ml-4 whitespace-nowrap">{fmtSize(f.sizeBytes)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* preview */}
            {job.preview && job.preview.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">preview</div>
                <pre className="text-xs text-zinc-400 overflow-auto max-h-56 font-mono leading-relaxed">
                  {JSON.stringify(job.preview, null, 2).slice(0, 3000)}
                </pre>
              </div>
            )}

            {/* logs */}
            {job.logs && job.logs.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">log</div>
                <div className="text-xs font-mono text-zinc-500 space-y-1 max-h-48 overflow-auto">
                  {job.logs.map((l, i) => (
                    <div key={i} className={l.includes("ERROR") || l.includes("failed") ? "text-red-400" : l.includes("done") ? "text-emerald-400" : ""}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* mode legend */}
        {!job && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { t: "📄 Papers", d: "arXiv + OpenAlex + Crossref → real PDFs + CSV + BibTeX" },
              { t: "📊 Datasets", d: "Hugging Face → stream up to 500k rows → CSV + JSONL" },
              { t: "🐙 GitHub", d: "Repo search → stars/topics CSV + README markdown" },
              { t: "🌐 Web & 🖼 Images", d: "Any URL → markdown · Openverse/Wikimedia image packs" },
            ].map((m) => (
              <div key={m.t} className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-1">{m.t}</div>
                <div className="text-xs text-zinc-500 leading-relaxed">{m.d}</div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-14 text-center text-xs text-zinc-600">
          files land in <code className="text-zinc-500">Downloads/instant-scraper/downloads/&lt;job&gt;/</code> · LLM intent parsing active · arXiv / OpenAlex / Crossref / Semantic Scholar / Unpaywall / HuggingFace / GitHub / Openverse / Wikimedia / DuckDuckGo
        </footer>
      </main>
    </div>
  );
}
