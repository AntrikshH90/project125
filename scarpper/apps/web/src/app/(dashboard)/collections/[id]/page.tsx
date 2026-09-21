"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Download,
  Columns3,
  ExternalLink,
  Fingerprint,
  Clock,
  Gauge,
  FileJson,
  FileSpreadsheet,
  FileText,
  Boxes,
  BookMarked,
  Loader2
} from "lucide-react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type VisibilityState
} from "@tanstack/react-table";
import { api, downloadArtifact } from "@/lib/api";
import { formatNumber, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface RecordRow {
  id: string;
  sourceUrl: string;
  contentHash: string;
  payload: Record<string, unknown>;
  confidenceScore: number | null;
  provenance: Record<string, unknown>;
  createdAt: string;
}

interface ArtifactRow {
  id: string;
  format: string;
  fileSizeBytes: number;
  recordCount: number;
  createdAt: string;
}

const columnHelper = createColumnHelper<RecordRow>();

const FORMAT_META: Array<{ value: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "jsonl", label: "JSONL", icon: FileText },
  { value: "parquet", label: "Parquet", icon: Boxes },
  { value: "bibtex", label: "BibTeX", icon: BookMarked }
];

export default function CollectionExplorerPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [limit, setLimit] = useState(200);

  const { data: collection } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => api.get<{ id: string; name: string; schemaDefinition: { fields?: Array<{ name: string }> } }>(`/api/collections/${id}`)
  });

  const { data, isLoading } = useQuery({
    queryKey: ["records", id, limit],
    queryFn: () => api.get<{ records: RecordRow[] }>(`/api/collections/${id}/records?limit=${limit}`),
    refetchInterval: 10000
  });

  const { data: artifacts } = useQuery({
    queryKey: ["artifacts", id],
    queryFn: () => api.get<ArtifactRow[]>(`/api/collections/${id}/artifacts`)
  });

  const requestExport = useMutation({
    mutationFn: (format: string) => api.post(`/api/collections/${id}/exports`, { format, limit: 200000 }),
    onSuccess: () => {
      toast.info("Export queued — the file appears below when ready");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["artifacts", id] }), 2500);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["artifacts", id] }), 7000);
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const records = data?.records ?? [];

  const columns = useMemo(() => {
    const payloadKeys = Array.from(new Set(records.flatMap((r) => Object.keys(r.payload ?? {})))).slice(0, 15);
    return [
      ...payloadKeys.map((key) =>
        columnHelper.accessor((row) => row.payload?.[key], {
          id: key,
          header: key.replace(/_/g, " "),
          cell: (info) => {
            const v = info.getValue();
            if (v === null || v === undefined) return <span className="text-zinc-600">—</span>;
            const text = Array.isArray(v) ? v.join(", ") : String(v);
            return <span className="line-clamp-2 max-w-64 text-slate-text">{text}</span>;
          }
        })
      ),
      columnHelper.accessor("sourceUrl", {
        id: "_source_url",
        header: "Source",
        cell: (info) => (
          <a
            href={info.getValue()}
            target="_blank"
            rel="noreferrer"
            className="flex max-w-40 items-center gap-1 truncate text-xs text-amber-400/80 hover:underline"
          >
            {info.getValue().replace(/^https?:\/\//, "").slice(0, 32)}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )
      }),
      columnHelper.accessor("confidenceScore", {
        id: "_confidence",
        header: "Conf.",
        cell: (info) => {
          const v = info.getValue();
          return v === null ? <span className="text-zinc-600">—</span> : <Badge variant={(v ?? 0) >= 0.8 ? "success" : "secondary"}>{Math.round(v * 100)}%</Badge>;
        }
      })
    ];
  }, [records]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString"
  });

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) => JSON.stringify(r.payload).toLowerCase().includes(q));
  }, [records, search]);

  void table;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/collections" className="flex h-8 w-8 items-center justify-center rounded-md border border-graphite-600 text-slate-dim hover:text-slate-text">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="font-semibold text-slate-text">{collection?.name ?? "…"}</h2>
          <p className="text-[11px] text-slate-dim">{formatNumber(records.length)} records loaded{records.length >= limit ? ` (of ${formatNumber(limit)} cap)` : ""}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records…"
              className="h-8 w-52 pl-8 text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              {table.getAllLeafColumns().map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={requestExport.isPending}>
                {requestExport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Download format</DropdownMenuLabel>
              {FORMAT_META.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => requestExport.mutate(f.value)}>
                  <f.icon className="h-4 w-4 text-amber-400" /> {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {records.length >= limit && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 500)}>
            Load more records
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden xl:col-span-3">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={header.column.getCanSort() ? "cursor-pointer select-none hover:text-slate-text" : ""}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-12 text-center text-xs text-zinc-600">
                      No records extracted yet. Launch a run from the Studio.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className={selected?.id === row.id ? "cursor-pointer bg-amber-accent/5" : "cursor-pointer"}
                  >
                    {columns.map((col, i) => {
                      const value = i < columns.length - 2
                        ? (row.payload as Record<string, unknown>)[col.id ?? ""]
                        : i === columns.length - 2
                          ? row.sourceUrl
                          : row.confidenceScore;
                      const rendered = columns[i].cell
                        ? null
                        : String(value ?? "—");
                      return (
                        <TableCell key={col.id as string} className="max-w-64">
                          {rendered !== null ? (
                            <span className="line-clamp-2 text-slate-text">{rendered}</span>
                          ) : (
                            <span className="text-slate-text">
                              {i === columns.length - 2 ? (
                                <a href={row.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-amber-400/80 hover:underline">
                                  {row.sourceUrl.replace(/^https?:\/\//, "").slice(0, 30)}
                                </a>
                              ) : row.confidenceScore === null ? (
                                <span className="text-zinc-600">—</span>
                              ) : (
                                <Badge variant={(row.confidenceScore ?? 0) >= 0.8 ? "success" : "secondary"}>
                                  {Math.round((row.confidenceScore ?? 0) * 100)}%
                                </Badge>
                              )}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-amber-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-dim">Provenance</h3>
            </div>
            {!selected ? (
              <p className="text-xs text-zinc-600">Select a row to inspect its full provenance trail.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <ProvenanceRow icon={ExternalLink} label="Source" value={selected.sourceUrl} mono wrap />
                <ProvenanceRow icon={Fingerprint} label="Content hash" value={selected.contentHash.slice(0, 20) + "…"} mono />
                <ProvenanceRow icon={Gauge} label="Confidence" value={selected.confidenceScore === null ? "—" : `${Math.round(selected.confidenceScore * 100)}%`} />
                <ProvenanceRow icon={Clock} label="Extracted" value={timeAgo(selected.createdAt)} />
                <ProvenanceRow
                  icon={Boxes}
                  label="Strategy"
                  value={String((selected.provenance as Record<string, unknown>).strategy ?? "unknown")}
                  mono
                />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-dim">Exports</h3>
            </div>
            <div className="space-y-1.5">
              {(artifacts ?? []).length === 0 && <p className="text-xs text-zinc-600">No exports generated yet.</p>}
              {(artifacts ?? []).map((a) => (
                <button
                  key={a.id}
                  onClick={() => a.fileSizeBytes > 0 && downloadArtifact(a.id)}
                  disabled={a.fileSizeBytes === 0}
                  className="flex w-full items-center gap-2 rounded-md border border-graphite-700 px-3 py-2 text-left text-xs transition-colors hover:border-amber-accent/40 disabled:opacity-50"
                >
                  <Badge variant="secondary" className="uppercase">{a.format}</Badge>
                  <span className="text-slate-dim">{formatNumber(a.recordCount)} rows</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600">
                    {a.fileSizeBytes === 0 ? "generating…" : timeAgo(a.createdAt)}
                    {a.fileSizeBytes > 0 && <Download className="h-3 w-3" />}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {selected && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <FileJson className="h-4 w-4 text-amber-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-dim">Raw payload</h3>
              </div>
              <pre className="dh-scroll-thin max-h-56 overflow-auto rounded-md bg-graphite-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-300/80">
                {JSON.stringify(selected.payload, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProvenanceRow({
  icon: Icon,
  label,
  value,
  mono,
  wrap
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-dim" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
        <p className={`${mono ? "font-mono" : ""} ${wrap ? "break-all" : "truncate"} text-slate-text`}>{value}</p>
      </div>
    </div>
  );
}
