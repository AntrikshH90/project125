"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pause, Play, XCircle, Terminal } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo, RUN_STATUS_STYLES, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RunDetail {
  id: string;
  status: string;
  collectionId: string;
  totalPagesBudget: number;
  pagesProcessed: number;
  recordsExtracted: number;
  recordsFailed: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface RunEventRow {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: run } = useQuery({
    queryKey: ["run", id],
    queryFn: () => api.get<RunDetail>(`/api/runs/${id}`),
    refetchInterval: (q) => (["running", "queued", "pausing", "cancelling"].includes(q.state.data?.status ?? "") ? 3000 : false)
  });

  const { data: events } = useQuery({
    queryKey: ["run-events", id],
    queryFn: () => api.get<RunEventRow[]>(`/api/runs/${id}/events`),
    refetchInterval: (q) => (run?.status === "running" ? 4000 : false)
  });

  const control = useMutation({
    mutationFn: (action: "pause" | "resume" | "cancel") => api.post(`/api/runs/${id}/control`, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["run", id] })
  });

  if (!run) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-accent border-t-transparent" />
      </div>
    );
  }

  const style = RUN_STATUS_STYLES[run.status];
  const pct = run.totalPagesBudget > 0 ? Math.min(100, Math.round((run.pagesProcessed / run.totalPagesBudget) * 100)) : 0;
  const live = ["running", "queued", "pausing", "cancelling"].includes(run.status);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Link href="/runs" className="flex h-8 w-8 items-center justify-center rounded-md border border-graphite-600 text-slate-dim hover:text-slate-text">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-mono text-sm font-semibold text-slate-text">run_{run.id.slice(0, 8)}</h2>
            <Badge className={style?.className}>{style?.label ?? run.status}</Badge>
          </div>
          <p className="text-[11px] text-slate-dim">
            created {timeAgo(run.createdAt)}
            {run.startedAt ? ` · started ${timeAgo(run.startedAt)}` : ""}
            {run.completedAt ? ` · finished ${timeAgo(run.completedAt)}` : ""}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {run.status === "paused" && (
            <Button variant="secondary" size="sm" onClick={() => control.mutate("resume")}>
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          {run.status === "running" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => control.mutate("pause")}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
              <Button variant="destructive" size="sm" onClick={() => control.mutate("cancel")}>
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Pages processed" value={`${run.pagesProcessed} / ${run.totalPagesBudget}`} bar={pct} />
        <Metric label="Records extracted" value={formatNumber(run.recordsExtracted)} accent />
        <Metric label="Records failed" value={formatNumber(run.recordsFailed)} />
        <Metric label="Duration" value={run.startedAt ? timeAgo(run.startedAt) : "—"} />
      </div>

      {run.errorMessage && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Errors</p>
          <p className="mt-1 break-words font-mono text-xs text-red-300/90">{run.errorMessage}</p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-graphite-700 px-4 py-3">
          <Terminal className="h-4 w-4 text-amber-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-dim">Worker log stream</span>
          {live && <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dh-pulse" />live</span>}
        </div>
        <div className="dh-scroll-thin max-h-[480px] space-y-0.5 overflow-y-auto bg-graphite-950 p-4 font-mono text-[11px] leading-relaxed">
          {(events ?? []).length === 0 && <p className="text-zinc-600">No events yet…</p>}
          {[...(events ?? [])].reverse().map((ev) => (
            <div key={ev.id} className="flex gap-2">
              <span className="shrink-0 text-zinc-600">{new Date(ev.createdAt).toLocaleTimeString()}</span>
              <span
                className={
                  ev.level === "error"
                    ? "text-red-400"
                    : ev.level === "warn"
                      ? "text-yellow-400"
                      : ev.level === "debug"
                        ? "text-zinc-500"
                        : "text-emerald-300/80"
                }
              >
                [{ev.level.toUpperCase().padEnd(5)}]
              </span>
              <span className="text-slate-dim">{ev.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, accent, bar }: { label: string; value: string; accent?: boolean; bar?: number }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-dim">{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight ${accent ? "text-amber-400" : "text-white"}`}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite-700">
          <div className="h-full rounded-full bg-amber-accent transition-all" style={{ width: `${bar}%` }} />
        </div>
      )}
    </Card>
  );
}
