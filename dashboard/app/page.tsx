"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, startRun, type RunSummaryLite } from "@/lib/api";

export default function Home() {
  const [runs, setRuns] = useState<RunSummaryLite[]>([]);
  const [task, setTask] = useState("Fix the fibonacci function so all tests pass");
  const [repoUrl, setRepoUrl] = useState("https://github.com/AntrikshH90/sandforge-demo");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [health, setHealth] = useState<{ providers?: { llm: string; sandbox: string; models?: Record<string, string> }; github?: boolean; nebius?: boolean } | null>(null);

  const load = () => api<RunSummaryLite[]>("/api/runs").then(setRuns).catch(() => {});
  useEffect(() => {
    load();
    api<{ providers: { llm: string; sandbox: string; models?: Record<string, string> }; github: boolean; nebius: boolean }>("/api/health").then(setHealth).catch(() => {});
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await startRun({ task, repoUrl });
      window.location.href = `/runs/${r.id}`;
    } catch (ex: any) {
      setErr(ex.message || "failed to start");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Sand<span className="text-neon">Forge</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            autonomous PR agent · plan → patch → test → branch/backtrack
          </p>
        </div>
        <div className="text-right text-xs text-white/50">
          <div>
            LLM <span className={health?.providers?.llm === "nebius" ? "text-mint" : "text-amber"}>{health?.providers?.llm || "…"}</span>
            {" · "}Sandbox <span className={health?.providers?.sandbox === "contree" ? "text-mint" : "text-amber"}>{health?.providers?.sandbox || "…"}</span>
          </div>
          <div className="mt-1">
            {health?.nebius ? "Nemotron: Super + Nano" : "mock mode (set NEBIUS_API_KEY)"}
            {health?.github ? " · GitHub linked" : ""}
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="mb-10 rounded-xl border border-edge bg-panel p-5">
        <div className="grid gap-4 md:grid-cols-[2fr_3fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Task</label>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon"
              placeholder="What should the agent do?"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">GitHub repo</label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-neon"
              placeholder="https://github.com/owner/repo"
            />
          </div>
          <button
            disabled={busy}
            className="mt-6 h-10 rounded-lg bg-neon px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Forging…" : "Forge PR"}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-rose">{err}</p>}
      </form>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Runs</h2>
      <div className="overflow-hidden rounded-xl border border-edge">
        {runs.length === 0 && (
          <div className="bg-panel px-5 py-10 text-center text-sm text-white/40">
            No runs yet — forge your first PR above.
          </div>
        )}
        {runs.map((r) => (
          <Link
            key={r.id}
            href={`/runs/${r.id}`}
            className="flex items-center gap-4 border-b border-edge bg-panel px-5 py-3.5 last:border-0 hover:bg-edge/40"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                r.status === "success" ? "bg-mint glow-mint" : r.status === "failed" ? "bg-rose glow-rose" : "bg-amber pulse-dot"
              }`}
            />
            <span className={`min-w-0 flex-1 truncate text-sm ${r.status === "running" ? "text-white" : "text-white/70"}`}>
              {r.task}
            </span>
            <span className="hidden font-mono text-xs text-white/35 md:block">{r.repoUrl.replace("https://github.com/", "")}</span>
            <span className="w-14 text-right font-mono text-xs text-white/40">{r.attempts}×att</span>
            <span
              className={`w-20 text-right text-xs font-semibold ${
                r.status === "success" ? "text-mint" : r.status === "failed" ? "text-rose" : "text-amber"
              }`}
            >
              {r.status}
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-10 text-center text-xs text-white/30">
        Built for the Nebius × NVIDIA Global AI Hackathon · NVIDIA Nemotron on Nebius Token Factory
      </footer>
    </main>
  );
}
