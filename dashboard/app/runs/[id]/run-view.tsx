"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_BASE, api, type BranchNodeLite, type RunDetailLite, type RunEventLite } from "@/lib/api";

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
            const ev = JSON.parse(m.data) as RunEventLite;
            setLive((prev) => [...prev, ev]);
          } catch { /* ignore */ }
        };
        es.addEventListener("done", () => {
          es?.close();
          loadRun();
        });
        es.onerror = () => { es?.close(); };
      }
    })();

    return () => {
      dead = true;
      es?.close();
    };
  }, [id]);

  useEffect(() => {
    timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight });
  }, [live.length, run?.events.length]);

  if (err) return <main className="mx-auto max-w-5xl px-6 py-10 text-rose">{err}</main>;
  if (!run) return <main className="mx-auto max-w-5xl px-6 py-10 text-white/40">loading…</main>;

  const events = live.length > 0 ? live : run.events;
  const isLive = run.status === "running" || live.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-white/50 hover:text-white">← runs</Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{run.task}</h1>
        <a href={run.repoUrl} target="_blank" className="font-mono text-xs text-white/40 hover:text-white/70">
          {run.repoUrl.replace("https://github.com/", "")}
        </a>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            run.status === "success" ? "bg-mint/15 text-mint" : run.status === "failed" ? "bg-rose/15 text-rose" : "bg-amber/15 text-amber"
          }`}
        >
          {isLive && <span className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber align-middle" />}
          {run.status}
        </span>
      </div>

      {run.prUrl && (
        <a
          href={run.prUrl}
          target="_blank"
          className="mb-6 block rounded-xl border border-mint/40 bg-mint/10 px-5 py-4 text-sm text-mint transition hover:bg-mint/15"
        >
          ✅ Pull request opened — {run.prUrl}
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-edge bg-panel">
          <h2 className="border-b border-edge px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">
            Timeline {isLive && <span className="text-amber normal-case tracking-normal">· streaming</span>}
          </h2>
          <div ref={timelineRef} className="max-h-[560px] overflow-y-auto p-5">
            {events.map((ev, i) => (
              <TimelineRow key={i} ev={ev} />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Stats</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat k="attempts" v={run.stats.attempts} />
              <Stat k="test runs" v={run.stats.testRuns} />
              <Stat k="LLM calls" v={run.stats.llmCalls} />
              <Stat k="tokens in" v={run.stats.tokensIn.toLocaleString()} />
              <Stat k="tokens out" v={run.stats.tokensOut.toLocaleString()} />
              <Stat k="wall clock" v={`${(run.stats.wallClockMs / 1000).toFixed(1)}s`} />
            </dl>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-white/30">
              llm: {run.llmProvider} · sandbox: {run.sandboxProvider}
            </p>
          </section>

          <section className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Branch tree</h2>
            <BranchTree nodes={run.branchTree} />
          </section>
        </div>
      </div>

      {run.diff && (
        <section className="mt-6 rounded-xl border border-edge bg-panel">
          <h2 className="border-b border-edge px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">Diff</h2>
          <pre className="max-h-96 overflow-auto p-5 font-mono text-xs leading-relaxed text-white/70">{run.diff}</pre>
        </section>
      )}
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-lg bg-ink px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-white/35">{k}</dt>
      <dd className="font-mono text-sm text-white/85">{v}</dd>
    </div>
  );
}

function TimelineRow({ ev }: { ev: RunEventLite }) {
  const t = new Date(ev.ts).toLocaleTimeString([], { hour12: false });
  let icon = "·";
  let color = "text-white/40";
  let label = ev.type;
  let detail = "";

  switch (ev.type) {
    case "run_started":
      icon = "▶"; color = "text-white/70"; detail = String(ev.repo || "");
      break;
    case "providers":
      icon = "⚙"; color = "text-white/50";
      detail = `llm=${ev.llm} sandbox=${ev.sandbox}`;
      break;
    case "sandbox_ready":
      icon = "▣"; color = "text-neon"; label = "sandbox";
      detail = `${ev.provider} · cp ${String(ev.checkpoint || "").slice(0, 8)}`;
      break;
    case "plan":
      icon = "☰"; color = "text-neon";
      detail = ((ev.steps as any[]) || []).map((s) => s.title).join(" → ");
      break;
    case "attempt_started":
      icon = "⚒"; color = "text-amber";
      label = `attempt ${ev.attempt}`;
      detail = String(ev.strategy || "");
      break;
    case "llm_call":
      icon = "◈"; color = "text-neon/80"; label = `${ev.purpose} (${ev.model})`;
      detail = `${((ev.latencyMs as number) || 0)}ms · ${ev.tokensIn || 0}→${ev.tokensOut || 0} tok`;
      break;
    case "edits_applied": {
      icon = "✎"; color = "text-white/70"; label = "edits";
      const edits = (ev.edits as any[]) || [];
      detail = edits.map((e) => `${e.ok ? "✓" : "✗"}${e.path}`).join(", ") || "none";
      break;
    }
    case "test_run": {
      const o = ev.outcome as any;
      icon = o.passed ? "✔" : "✘"; color = o.passed ? "text-mint" : "text-rose";
      label = o.passed ? "tests green" : "tests red";
      detail = `${o.command} · exit ${o.exitCode} · ${o.durationMs}ms`;
      break;
    }
    case "branch":
      icon = "⑂"; color = "text-white/60"; label = "branch";
      detail = String(ev.reason || "");
      break;
    case "backtrack":
      icon = "↩"; color = "text-amber"; label = "backtrack";
      detail = `attempt ${ev.fromAttempt} → cp ${String(ev.toCheckpoint || "").slice(0, 8)}`;
      break;
    case "pr_opened":
      icon = "🎉"; color = "text-mint"; label = "PR opened";
      detail = String(ev.url || "");
      break;
    case "run_finished":
      icon = "■"; color = ev.status === "success" ? "text-mint" : "text-rose";
      detail = String(ev.summary || "");
      break;
    case "error":
      icon = "!"; color = "text-rose";
      detail = String(ev.message || "");
      break;
  }

  return (
    <div className="flex items-start gap-3 py-1.5 font-mono text-xs">
      <span className="w-16 shrink-0 text-white/25">{t}</span>
      <span className={`w-4 shrink-0 ${color}`}>{icon}</span>
      <span className="min-w-0">
        <span className={color}>{label}</span>
        {detail && <span className="text-white/40"> {detail}</span>}
      </span>
    </div>
  );
}

function BranchTree({ nodes }: { nodes: BranchNodeLite[] }) {
  return (
    <div className="space-y-1.5 font-mono text-xs">
      {nodes.map((n) => {
        const depth = countDepth(n, nodes);
        return (
          <div key={n.id} className="flex items-center gap-2" style={{ paddingLeft: depth * 18 }}>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                n.status === "green" ? "bg-mint" : n.status === "red" ? "bg-rose" : "bg-amber pulse-dot"
              }`}
            />
            <span className="text-white/70">{n.label}</span>
            {n.strategy !== "—" && <span className="text-white/30">[{n.strategy}]</span>}
          </div>
        );
      })}
    </div>
  );
}

function countDepth(node: BranchNodeLite, nodes: BranchNodeLite[]): number {
  let d = 0;
  let cur: BranchNodeLite | undefined = node;
  while (cur?.parentId) {
    const parent: BranchNodeLite | undefined = nodes.find((n) => n.id === cur!.parentId);
    cur = parent;
    d++;
    if (d > 10) break;
  }
  return d;
}
