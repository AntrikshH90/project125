"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, Pause, Play, XCircle, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { timeAgo, RUN_STATUS_STYLES, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { useState } from "react";

interface RunRow {
  id: string;
  status: string;
  collectionName: string;
  collectionId: string;
  totalPagesBudget: number;
  pagesProcessed: number;
  recordsExtracted: number;
  recordsFailed: number;
  errorMessage: string | null;
  startedAt: string | null;
  createdAt: string;
}

const FILTERS = ["all", "running", "queued", "paused", "completed", "failed"] as const;

export default function RunsPage() {
  const { workspace } = useActiveWorkspace();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["runs", workspace.id],
    queryFn: () => api.get<RunRow[]>(`/api/workspaces/${workspace.id}/runs?limit=100`),
    refetchInterval: 5000
  });

  const control = useMutation({
    mutationFn: ({ runId, action }: { runId: string; action: "pause" | "resume" | "cancel" }) =>
      api.post(`/api/runs/${runId}/control`, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["runs", workspace.id] })
  });

  const runs = (data ?? []).filter((r) => (filter === "all" ? true : r.status.startsWith(filter) || (filter === "completed" && r.status === "completed_with_errors")));

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "rounded-full border border-amber-accent/40 bg-amber-accent/10 px-3 py-1 text-xs font-medium text-amber-300"
                : "rounded-full border border-graphite-600 px-3 py-1 text-xs text-slate-dim hover:text-slate-text"
            }
          >
            {f}
          </button>
        ))}
        <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["runs"] })} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Activity className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                    <p className="text-xs text-zinc-600">No runs yet. Launch one from the Studio.</p>
                  </TableCell>
                </TableRow>
              )}
              {runs.map((run) => {
                const style = RUN_STATUS_STYLES[run.status];
                const pct = run.totalPagesBudget > 0 ? Math.min(100, Math.round((run.pagesProcessed / run.totalPagesBudget) * 100)) : 0;
                const live = ["running", "queued", "pausing", "cancelling"].includes(run.status);
                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link href={`/runs/${run.id}`} className="font-mono text-xs text-amber-400 hover:underline">
                        {run.id.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm">{run.collectionName}</TableCell>
                    <TableCell>
                      <Badge className={style?.className}>
                        {live && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current dh-pulse" />}
                        {style?.label ?? run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-graphite-700 sm:block">
                          <div className="h-full rounded-full bg-amber-accent transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs text-slate-dim">
                          {run.pagesProcessed}/{run.totalPagesBudget}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className="text-emerald-400">+{formatNumber(run.recordsExtracted)}</span>
                      {run.recordsFailed > 0 && <span className="ml-1.5 text-red-400">-{run.recordsFailed}</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-dim">{timeAgo(run.startedAt ?? run.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {run.status === "running" && (
                          <Button variant="ghost" size="icon" title="Pause" onClick={() => control.mutate({ runId: run.id, action: "pause" })}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {run.status === "paused" && (
                          <Button variant="ghost" size="icon" title="Resume" onClick={() => control.mutate({ runId: run.id, action: "resume" })}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {live && (
                          <Button variant="ghost" size="icon" title="Cancel" onClick={() => control.mutate({ runId: run.id, action: "cancel" })}>
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                        <Link href={`/runs/${run.id}`} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-dim hover:bg-graphite-800 hover:text-slate-text">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
