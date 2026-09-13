"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, startRun, type RunSummaryLite } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  success: "bg-mint/10 text-mint border-mint/30",
  failed: "bg-rose/10 text-rose border-rose/30",
  running: "bg-amber/10 text-amber border-amber/30",
  queued: "bg-white/5 text-white/60 border-white/10",
  cancelled: "bg-white/5 text-white/60 border-white/10",
};

export default function Home() {
  const [runs, setRuns] = useState<RunSummaryLite[]>([]);
  const [task, setTask] = useState("Fix the fibonacci function so all tests pass");
  const [repoUrl, setRepoUrl] = useState("https://github.com/AntrikshH90/sandforge-demo");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [health, setHealth] = useState<{
    providers?: { llm: string; sandbox: string; models?: Record<string, string> };
    github?: boolean;
    nebius?: boolean;
  } | null>(null);

  const load = () => api<RunSummaryLite[]>("/api/runs").then(setRuns).catch(() => {});
  useEffect(() => {
    load();
    api<typeof health>("/api/health").then(setHealth).catch(() => {});
    const t = setInterval(load, 2500);
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
      setBusy(false);
    }
  };

  const llm = health?.providers?.llm;
  const sbx = health?.providers?.sandbox;
  const live = health?.nebius;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-12">
      {/* header */}
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon/40 bg-neon/10 text-xl shadow-[0_0_28px_rgba(124,92,255,0.35)]">
              ⚒
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Sand<span className="text-neon">Forge</span>
            </h1>
          </div>
          <p className="mt-2 font-mono text-xs text-white/45">
            autonomous PR agent · plan → patch → test → <span className="text-amber">backtrack</span> → ship
          </p>
        </div>

        {/* provider status pills */}
        <div className="flex flex-wrap gap-2">
          <Pill label="LLM" value={llm || "…"} good={llm === "nebius"} hint={health?.providers?.models?.coder} />
          <Pill label="Sandbox" value={sbx || "…"} good={sbx === "contree"} hint={sbx === "contree" ? "Token Factory Sandboxes" : "git-backed local"} />
          <Pill label="GitHub" value={health?.github ? "linked" : "off"} good={!!health?.github} />
        </div>
      </header>

      {/* forge form */}
      <form onSubmit={submit} className="relative mb-12 rounded-2xl border border-edge bg-panel/80 p-6 shadow-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden rounded-t-2xl">
          {busy && <div className="live-bar h-px w-full" />}
          {!busy && <div className="h-px w-full bg-gradient-to-r from-transparent via-neon/50 to-transparent" />}
        </div>

        <div className="grid gap-5 lg:grid-cols-[2fr_3fr_auto]">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Task</label>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-neon/60 focus:shadow-[0_0_0_3px_rgba(124,92,255,0.12)]"
              placeholder="What should the agent do?"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">GitHub repo</label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-neon/60 focus:shadow-[0_0_0_3px_rgba(124,92,255,0.12)]"
              placeholder="https://github.com/owner/repo"
            />
          </div>
          <button
            disabled={busy}
            className="mt-[26px] flex h-[42px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-[#9d7cff] px-7 text-sm font-bold text-white shadow-[0_6px_24px_rgba(124,92,255,0.4)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? (
              <>
                <span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />
                Forging…
              </>
            ) : (
              <>⚒ Forge PR</>
            )}
          </button>
        </div>

        {err && <p className="mt-3 text-sm text-rose">{err}</p>}
        {!live && (
          <p className="mt-4 font-mono text-[11px] text-white/30">
            mock mode — full loop runs locally (git checkpoints + deterministic model). set NEBIUS_API_KEY to flip to Nemotron + Token Factory Sandboxes.
          </p>
        )}
      </form>

      {/* runs */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Run history</h2>
        {runs.some((r) => r.status === "running") && (
          <span className="font-mono text-[11px] text-amber">
            <span className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber" />
            {runs.filter((r) => r.status === "running").length} running
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-edge bg-panel/50">
        {runs.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-white/40">No runs yet.</p>
            <p className="mt-1 text-xs text-white/25">Hit Forge PR — the demo repo has a bug waiting.</p>
          </div>
        )}
        {runs.map((r) => (
          <Link
            key={r.id}
            href={`/runs/${r.id}`}
            className="group flex items-center gap-4 border-b border-edge/70 px-5 py-4 last:border-0 transition hover:bg-white/[0.03]"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                r.status === "success"
                  ? "bg-mint glow-mint"
                  : r.status === "failed"
                    ? "bg-rose glow-rose"
                    : "bg-amber glow-amber pulse-dot"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${r.status === "running" ? "text-white" : "text-white/75"}`}>
                {r.task}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-white/30">
                {r.repoUrl.replace("https://github.com/", "")}
                {r.prUrl ? " · PR opened" : ""}
              </p>
            </div>
            <span className="hidden w-24 text-right font-mono text-[11px] text-white/35 md:block">
              {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
            </span>
            <span className="hidden w-32 text-right font-mono text-[11px] text-white/25 lg:block">
              {new Date(r.createdAt).toLocaleTimeString([], { hour12: false })}
            </span>
            <span
              className={`w-[86px] rounded-full border px-2.5 py-1 text-center text-[11px] font-semibold ${STATUS_STYLE[r.status] || STATUS_STYLE.queued}`}
            >
              {r.status}
            </span>
            <span className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/50">→</span>
          </Link>
        ))}
      </div>

      <footer className="mt-12 text-center font-mono text-[11px] leading-relaxed text-white/25">
        built for the Nebius × NVIDIA Global AI Hackathon
        <br />
        <span className="text-white/35">NVIDIA Nemotron 3 · Nebius Token Factory · checkpoint-branching sandboxes</span>
      </footer>
    </main>
  );
}

function Pill({ label, value, good, hint }: { label: string; value: string; good?: boolean; hint?: string }) {
  return (
    <div
      title={hint}
      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] ${
        good ? "border-mint/30 bg-mint/10 text-mint" : "border-amber/25 bg-amber/10 text-amber/90"
      }`}
    >
      <span className="text-white/35">{label}</span> {value}
    </div>
  );
}
