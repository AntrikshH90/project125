"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  FileStack,
  Gauge,
  Hash,
  PlayCircle,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { api } from "@/lib/api";
import { formatNumber, timeAgo, RUN_STATUS_STYLES } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import Link from "next/link";
import { useActiveWorkspace } from "@/lib/workspace-context";

interface Overview {
  activeRuns: number;
  records24h: number;
  totalRecords: number;
  collections: number;
  sources: number;
  successRate: number;
  runsByStatus: Array<{ status: string; count: number }>;
  recentRuns: Array<{
    id: string;
    status: string;
    pagesProcessed: number;
    recordsExtracted: number;
    totalPagesBudget: number;
    createdAt: string;
  }>;
  recentEvents: Array<{ id: string; runId: string; level: string; message: string; createdAt: string }>;
  throughput: Array<{ hour: string; count: number }>;
}

export default function OverviewPage() {
  const { workspace } = useActiveWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ["overview", workspace.id],
    queryFn: () => api.get<Overview>(`/api/workspaces/${workspace.id}/overview`),
    refetchInterval: 8000,
    retry: false
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const chartData = data.throughput.map((t) => ({
    time: new Date(t.hour).getHours().toString().padStart(2, "0") + ":00",
    records: t.count
  }));

  return (
    <div className="space-y-5 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={PlayCircle} label="Active runs" value={formatNumber(data.activeRuns)} accent />
        <StatCard icon={Hash} label="Records / 24h" value={formatNumber(data.records24h)} />
        <StatCard icon={Database} label="Total records" value={formatNumber(data.totalRecords)} />
        <StatCard icon={Gauge} label="Run success rate" value={`${data.successRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-accent" />
              <h2 className="text-sm font-semibold text-slate-text">Extraction throughput (24h)</h2>
            </div>
            <Badge variant="secondary">{formatNumber(data.records24h)} records</Badge>
          </div>
          <div className="h-64 p-4">
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#23272e" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" stroke="#5b6472" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5b6472" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#14161a", border: "1px solid #32373f", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#8a94a6" }}
                  />
                  <Area type="monotone" dataKey="records" stroke="#f59e0b" strokeWidth={2} fill="url(#amberGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileStack className="h-4 w-4 text-amber-accent" />
              <h2 className="text-sm font-semibold text-slate-text">Pipeline</h2>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <PipelineRow label="Collections" value={data.collections} />
            <PipelineRow label="Configured sources" value={data.sources} />
            <div className="border-t border-graphite-700 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-dim">Runs by status</p>
              <div className="flex flex-wrap gap-1.5">
                {data.runsByStatus.length === 0 && <span className="text-xs text-zinc-600">No runs yet</span>}
                {data.runsByStatus.map((s) => {
                  const style = RUN_STATUS_STYLES[s.status];
                  return (
                    <Badge key={s.status} className={style?.className}>
                      {style?.label ?? s.status} · {s.count}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-text">Recent runs</h2>
            <Link href="/runs" className="text-xs text-amber-400 hover:underline">
              View all →
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-xs text-zinc-600">
                    No runs yet — configure a collection in the Studio.
                  </TableCell>
                </TableRow>
              )}
              {data.recentRuns.map((run) => {
                const style = RUN_STATUS_STYLES[run.status];
                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs text-slate-dim">{run.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge className={style?.className}>{style?.label ?? run.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {run.pagesProcessed}/{run.totalPagesBudget}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-400">{run.recordsExtracted}</TableCell>
                    <TableCell className="text-right text-xs text-slate-dim">{timeAgo(run.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-graphite-700 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-text">System log</h2>
          </div>
          <div className="dh-scroll-thin max-h-72 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
            {data.recentEvents.length === 0 && <p className="text-zinc-600">Waiting for worker events…</p>}
            {data.recentEvents.map((ev) => (
              <div key={ev.id} className="flex gap-2 py-0.5">
                <span className="shrink-0 text-zinc-600">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                {ev.level === "error" ? (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                ) : ev.level === "warn" ? (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />
                )}
                <span
                  className={
                    ev.level === "error" ? "text-red-300" : ev.level === "warn" ? "text-yellow-300" : "text-slate-dim"
                  }
                >
                  {ev.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-dim">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold tracking-tight ${accent ? "text-amber-400" : "text-white"}`}>{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${accent ? "text-amber-accent" : "text-slate-dim"}`} />
      </div>
    </Card>
  );
}

function PipelineRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-dim">{label}</span>
      <span className="font-mono font-semibold text-slate-text">{value}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600">
      <Activity className="h-6 w-6" />
      <p className="text-xs">No extraction activity in the last 24 hours.</p>
    </div>
  );
}
