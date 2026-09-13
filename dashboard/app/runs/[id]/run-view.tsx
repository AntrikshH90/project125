"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { API_BASE, api, type BranchNodeLite, type RunDetailLite, type RunEventLite } from "@/lib/api";

type Phase = "clone" | "plan" | "patch" | "test" | "ship";

export default function RunView({ id }: { id: string }) {
  const [run, setRun] = useState<RunDetailLite | null>(null);
  const [live, setLive] = useState<RunEventLite[]>([]);
  const [err, setErr] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    let es: EventSource | null = null;

    const loadRun = async (): Promise<string> => {
      try {
        const r = await api<RunDetailLite>(`/api/runs/${id}`);
        if (!dead) setRun(r);
        return r.status;
      } catch (e: any) {
        if (!dead) setErr(e.message);
        return "error";
      }
    };

    (async () => {
      const status = await loadRun();
      if (status === "running" || status === "queued") {
        es = new EventSource(`${API_BASE}/api/runs/${id}/events`);
        es.onmessage = (m) => {
          try {
            setLive((prev) => [...prev, JSON.parse(m.data) as RunEventLite]);
          } catch { /* ignore */ }
        };
        es.addEventListener("done", () => {
          es?.close();
          loadRun();
        });
        es.onerror = () => {
          es?.close();
          loadRun(); // run likely finished between fetch and SSE attach
        };
      }
    })();

    return () => {
      dead = true;
      es?.close();
    };
  }, [id]);

  const events = live.length > 0 ? live : run?.events || [];
  const phase = useMemo(() => phaseOf(events), [events]);
  const done = run?.status === "success" || run?.status === "failed";

  useEffect(() => {
    if (!done) timelineRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [events.length, done]);

  if (err) return <Shell><p className="text-rose">{err}</p></Shell>;
  if (!run) return <Shell><p className="text-white/40">loading run…</p></Shell>;

  return (
    <Shell>
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/" className="rounded-lg border border-edge px-2.5 py-1 text-xs text-white/50 transition hover:border-white/30 hover:text-white">
          ← runs
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{run.task}</h1>
        <a href={run.repoUrl} target="_blank" className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/40 transition hover:text-neon">
          {run.repoUrl.replace("https://github.com/", "")} ↗
        </a>
        <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
          run.status === "success" ? "border-mint/40 bg-mint/10 text-mint"
          : run.status === "failed" ? "border-rose/40 bg-rose/10 text-rose"
          : "border-amber/40 bg-amber/10 text-amber"
        }`}>
          {!done && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-amber" />}
          {run.status}
        </span>
      </div>

      {run.prUrl && (
        <a href={run.prUrl} target="_blank"
           className="mb-5 flex items-center gap-3 rounded-xl border border-mint/35 bg-mint/[0.07] px-5 py-4 transition hover:bg-mint/[0.12]">
          <span className="text-lg">🎉</span>
          <span className="text-sm font-semibold text-mint">Pull request opened</span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-mint/70">{run.prUrl}</span>
          <span className="text-mint/70">↗</span>
        </a>
      )}

      {/* phase tracker */}
      <PhaseBar phase={phase} done={done} ok={run.status === "success"} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* timeline */}
        <section className="overflow-hidden rounded-2xl border border-edge bg-panel/60">
          <h2 className="flex items-center gap-2 border-b border-edge px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Execution timeline
            {!done && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-mono normal-case tracking-normal text-amber">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber" /> streaming
              </span>
            )}
          </h2>
          <div ref={timelineRef} className="max-h-[620px] overflow-y-auto p-5 font-mono text-xs">
            {events.length === 0 && <p className="text-white/30">waiting for first event…</p>}
            {events.map((ev, i) => (
              <Row key={i} ev={ev} />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {/* stats */}
          <section className="rounded-2xl border border-edge bg-panel/60 p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Run stats</h2>
            <dl className="grid grid-cols-3 gap-2.5">
              <Tile k="attempts" v={run.stats.attempts} />
              <Tile k="test runs" v={run.stats.testRuns} />
              <Tile k="llm calls" v={run.stats.llmCalls} />
              <Tile k="tokens in" v={fmt(run.stats.tokensIn)} />
              <Tile k="tokens out" v={fmt(run.stats.tokensOut)} />
              <Tile k="wall clock" v={`${(run.stats.wallClockMs / 1000).toFixed(1)}s`} />
            </dl>
            <p className="mt-4 border-t border-edge/70 pt-3 font-mono text-[10px] text-white/30">
              llm <span className="text-white/50">{run.llmProvider}</span> · sandbox <span className="text-white/50">{run.sandboxProvider}</span>
            </p>
          </section>

          {/* branch tree */}
          <section className="rounded-2xl border border-edge bg-panel/60 p-5">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Branch tree</h2>
            <p className="mb-4 text-[10px] text-white/30">each attempt forks from a sandbox checkpoint</p>
            <BranchTree nodes={run.branchTree} />
          </section>
        </div>
      </div>

      {/* diff */}
      {run.diff && <DiffSection diff={run.diff} />}
    </Shell>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">{children}</main>;
}

function phaseOf(events: RunEventLite[]): Phase {
  let p: Phase = "clone";
  for (const ev of events) {
    if (ev.type === "run_started") p = "clone";
    else if (ev.type === "plan") p = "plan";
    else if (ev.type === "attempt_started") p = "patch";
    else if (ev.type === "test_run") p = "test";
    else if (ev.type === "pr_opened") p = "ship";
  }
  // if a test run happens after an attempt_started, we're testing
  const last = events[events.length - 1];
  if (last?.type === "test_run") return "test";
  if (last?.type === "backtrack" || last?.type === "branch") return "patch";
  return p;
}

const PHASES: { key: Phase; label: string; icon: string }[] = [
  { key: "clone", label: "clone", icon: "▣" },
  { key: "plan", label: "plan", icon: "☰" },
  { key: "patch", label: "patch", icon: "✎" },
  { key: "test", label: "test", icon: "✔" },
  { key: "ship", label: "ship", icon: "◆" },
];

function PhaseBar({ phase, done, ok }: { phase: Phase; done: boolean; ok: boolean }) {
  const cur = PHASES.findIndex((p) => p.key === phase);
  return (
    <div className="rounded-2xl border border-edge bg-panel/60 px-5 py-4">
      <div className="flex items-center">
        {PHASES.map((p, i) => {
          const active = i === cur && !done;
          const passed = done ? true : i < cur;
          return (
            <div key={p.key} className="flex flex-1 items-center last:flex-none">
              <div className={`flex items-center gap-2 ${active ? "text-amber" : passed ? (ok ? "text-mint" : "text-rose") : "text-white/25"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                  active ? "border-amber/60 bg-amber/10 glow-amber"
                  : passed ? (ok ? "border-mint/50 bg-mint/10" : "border-rose/50 bg-rose/10")
                  : "border-white/10 bg-black/30"
                }`}>
                  {passed && !active ? (ok ? "✓" : "✗") : p.icon}
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${active ? "" : passed ? "" : "text-white/20"}`}>
                  {p.label}
                </span>
              </div>
              {i < PHASES.length - 1 && (
                <div className={`mx-3 h-px flex-1 ${i < cur || (done && ok) ? "bg-gradient-to-r from-mint/50 to-mint/20" : i === cur ? "bg-amber/40" : "bg-white/8"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-xl border border-edge/60 bg-black/30 px-3 py-2.5">
      <dt className="text-[9px] uppercase tracking-[0.12em] text-white/35">{k}</dt>
      <dd className="mt-0.5 font-mono text-base text-white/90">{v}</dd>
    </div>
  );
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function Row({ ev }: { ev: RunEventLite }) {
  const t = new Date(ev.ts).toLocaleTimeString([], { hour12: false });
  let icon = "·", color = "text-white/40", bg = "", label = ev.type, detail = "";

  switch (ev.type) {
    case "run_started":
      icon = "▶"; color = "text-white/80"; detail = String(ev.repo || "");
      break;
    case "providers":
      icon = "⚙"; color = "text-white/50";
      detail = `llm=${ev.llm} · sandbox=${ev.sandbox}`;
      break;
    case "sandbox_ready":
      icon = "▣"; color = "text-neon"; label = "sandbox cloned";
      detail = `checkpoint ${String(ev.checkpoint || "").slice(0, 10)}`;
      bg = "bg-neon/[0.04]";
      break;
    case "plan":
      icon = "☰"; color = "text-neon"; label = "plan";
      detail = ((ev.steps as any[]) || []).map((s: any) => s.title).join(" → ");
      break;
    case "attempt_started":
      icon = "⚒"; color = "text-amber"; label = `attempt ${ev.attempt}`;
      detail = String(ev.strategy || "");
      bg = "bg-amber/[0.05]";
      break;
    case "llm_call":
      icon = "◈"; color = "text-neon/80"; label = `${ev.purpose} · ${shortModel(String(ev.model))}`;
      detail = `${fmtMs(ev.latencyMs)} · ${ev.tokensIn || 0}→${ev.tokensOut || 0} tok`;
      break;
    case "edits_applied": {
      icon = "✎"; color = "text-white/70"; label = "edits";
      const edits = (ev.edits as any[]) || [];
      detail = edits.map((e: any) => `${e.ok ? "✓" : "✗"} ${e.path}`).join("  ") || "none";
      break;
    }
    case "test_run": {
      const o = ev.outcome as any;
      icon = o.passed ? "✔" : "✘"; color = o.passed ? "text-mint" : "text-rose";
      label = o.passed ? "tests GREEN" : "tests RED";
      detail = `exit ${o.exitCode} · ${fmtMs(o.durationMs)}${(o.failures || []).length ? ` · ${o.failures.length} failing` : ""}`;
      bg = o.passed ? "bg-mint/[0.05]" : "bg-rose/[0.05]";
      break;
    }
    case "branch":
      icon = "⑂"; color = "text-white/60"; label = "branch";
      detail = String(ev.reason || "");
      break;
    case "backtrack":
      icon = "↩"; color = "text-amber"; label = "BACKTRACK";
      detail = `attempt ${ev.fromAttempt} → clean checkpoint ${String(ev.toCheckpoint || "").slice(0, 10)}`;
      bg = "bg-amber/[0.06]";
      break;
    case "pr_opened":
      icon = "◆"; color = "text-mint"; label = "PR opened";
      detail = String(ev.url || "");
      bg = "bg-mint/[0.05]";
      break;
    case "run_finished":
      icon = "■"; color = ev.status === "success" ? "text-mint" : "text-rose";
      detail = String(ev.summary || "");
      bg = ev.status === "success" ? "bg-mint/[0.05]" : "bg-rose/[0.05]";
      break;
    case "error":
      icon = "!"; color = "text-rose"; detail = String(ev.message || "");
      break;
  }

  return (
    <div className={`flow-in -mx-2 flex items-start gap-3 rounded-lg px-2 py-1.5 ${bg}`}>
      <span className="w-16 shrink-0 pt-0.5 text-white/25">{t}</span>
      <span className={`w-4 shrink-0 pt-0.5 text-center ${color}`}>{icon}</span>
      <span className="min-w-0 break-words">
        <span className={`font-semibold ${color}`}>{label}</span>
        {detail && <span className="text-white/45"> {detail}</span>}
      </span>
    </div>
  );
}

function shortModel(m: string): string {
  return m.replace("nvidia/", "").replace(/-120b-a12b|-550b-a55b/, "").slice(0, 24);
}

function fmtMs(ms: unknown): string {
  const n = Number(ms) || 0;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`;
}

// ── SVG branch tree ─────────────────────────────────────────────────────

function BranchTree({ nodes }: { nodes: BranchNodeLite[] }) {
  const W = 340, ROW = 52, PAD = 10;
  if (nodes.length === 0)
    return <p className="font-mono text-xs text-white/30">no branches yet — appears once attempts start</p>;

  const depth = (n: BranchNodeLite): number => {
    let d = 0, cur: BranchNodeLite | undefined = n;
    while (cur?.parentId) {
      cur = nodes.find((x) => x.id === cur!.parentId);
      d++;
      if (d > 8) break;
    }
    return d;
  };
  const H = nodes.length * ROW + PAD * 2;
  const x0 = 16, colW = 54;
  const pos = nodes.map((n, i) => ({ n, x: x0 + depth(n) * colW, y: PAD + i * ROW + ROW / 2 }));
  const byId = new Map(pos.map((p) => [p.n.id, p]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }}>
      {/* edges */}
      {pos.map(({ n, x, y }) => {
        const par = n.parentId ? byId.get(n.parentId) : null;
        if (!par) return null;
        const midY = (par.y + y) / 2;
        const stroke = n.status === "green" ? "#3ddc97" : n.status === "red" ? "#ff5c7a" : "#ffb454";
        return (
          <path key={`e-${n.id}`} d={`M ${par.x + 9} ${par.y} C ${par.x + 26} ${par.y}, ${par.x + 26} ${y}, ${x - 12} ${y}`}
            fill="none" stroke={stroke} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray={n.status === "red" ? "4 3" : undefined} />
        );
      })}
      {/* nodes */}
      {pos.map(({ n, x, y }) => {
        const fill = n.status === "green" ? "#3ddc97" : n.status === "red" ? "#ff5c7a" : "#ffb454";
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r="9" fill={fill} fillOpacity={n.status === "pending" ? 0.25 : 0.16} stroke={fill} strokeWidth="1.6" />
            <circle cx={x} cy={y} r="3" fill={fill} />
            <text x={x + 18} y={y - 3} fontSize="11" fill="#c9d2e4" fontFamily="ui-monospace, monospace">
              {n.label}
            </text>
            <text x={x + 18} y={y + 10} fontSize="9.5" fill="#5d6779" fontFamily="ui-monospace, monospace">
              {n.strategy !== "—" ? n.strategy : "clean clone"} {n.checkpoint ? `· ${String(n.checkpoint).slice(0, 7)}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── colored diff ────────────────────────────────────────────────────────

function DiffSection({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-edge bg-panel/60">
      <h2 className="border-b border-edge px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        Final diff
      </h2>
      <pre className="max-h-[420px] overflow-auto p-5 font-mono text-xs leading-relaxed">
        {lines.map((l, i) => {
          if (l.startsWith("+") && !l.startsWith("+++")) return <span key={i} className="diff-add">{l}</span>;
          if (l.startsWith("-") && !l.startsWith("---")) return <span key={i} className="diff-del">{l}</span>;
          if (l.startsWith("@@")) return <span key={i} className="diff-hunk">{l}</span>;
          return <span key={i} className="text-white/50">{l}</span>;
        })}
      </pre>
    </section>
  );
}
