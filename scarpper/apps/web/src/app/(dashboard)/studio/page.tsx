"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Play,
  Database,
  FileCode2,
  Layers,
  Globe2,
  FileText,
  GitBranch,
  BookOpen,
  Boxes,
  Link2,
  Loader2,
  Trash2,
  Plus,
  Wand2,
  XCircle,
  Download
} from "lucide-react";
import { api, downloadArtifact } from "@/lib/api";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface HarvestStatus {
  run: { status: string; recordsExtracted: number } | null;
  downloadArtifactId: string | null;
  done: boolean;
}

const EXPORT_FORMATS = ["csv", "json", "jsonl", "parquet", "bibtex"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website (JS-rendered)", icon: Globe2, hint: "Playwright rendering + AI extraction" },
  { value: "arxiv", label: "arXiv", icon: BookOpen, hint: "Paper metadata via arXiv Atom API" },
  { value: "github", label: "GitHub repo", icon: GitBranch, hint: "Repo, issues and releases via REST" },
  { value: "huggingface", label: "HuggingFace dataset", icon: Boxes, hint: "Dataset rows via datasets-server" },
  { value: "pdf", label: "PDF document", icon: FileText, hint: "Text + table extraction" },
  { value: "api_endpoint", label: "JSON API", icon: Link2, hint: "Direct JSON endpoint ingestion" }
];

interface Field {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description?: string;
  required?: boolean;
}

interface PreviewState {
  status: "idle" | "loading" | "done" | "error";
  records?: Array<Record<string, unknown>>;
  error?: string;
  elapsedMs?: number;
}

export default function StudioPage() {
  const { workspace } = useActiveWorkspace();
  const queryClient = useQueryClient();

  const [sourceType, setSourceType] = useState("website");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("Extract every product listing: title, price, availability, and link.");
  const [maxPages, setMaxPages] = useState(50);
  const [fields, setFields] = useState<Field[]>([
    { name: "title", type: "string", required: true, description: "Primary title" },
    { name: "price", type: "number", description: "Numeric price" },
    { name: "url", type: "string", description: "Item link" }
  ]);
  const [collectionName, setCollectionName] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [autoDownload, setAutoDownload] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [activeHarvest, setActiveHarvest] = useState<{ collectionId: string; format: string } | null>(null);

  const genSchema = useMutation({
    mutationFn: () =>
      api.post<{ fields: Field[]; source: string }>("/api/studio/generate-schema", {
        prompt,
        url: url || undefined
      }),
    onSuccess: (data) => {
      setFields(data.fields);
      toast.success(`Schema generated (${data.source}) — ${data.fields.length} fields`);
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const runPreview = useMutation({
    mutationFn: async () => {
      const start = Date.now();
      const col = await api.post<{ id: string }>(`/api/workspaces/${workspace.id}/collections`, {
        name: collectionName || `Preview ${new Date().toLocaleTimeString()}`,
        schemaDefinition: { fields, prompt, mode: "auto" }
      });
      const src = await api.post<{ id: string }>(`/api/collections/${col.id}/sources`, {
        type: sourceType,
        targetUrl: url,
        config: { maxPages: 1 }
      });
      const run = await api.post<{ id: string }>(`/api/collections/${col.id}/runs`, {
        sourceIds: [src.id],
        pageBudget: 1,
        preview: true
      });
      return { colId: col.id, runId: run.id, started: start };
    },
    onSuccess: ({ colId, runId, started }) => {
      toast.info("Preview run queued — watch the Runs page or this panel");
      pollRun(colId, runId, started);
    },
    onError: (err) => {
      setPreview({ status: "error", error: (err as Error).message });
      toast.error((err as Error).message);
    }
  });

  const pollRun = (colId: string, runId: string, started: number) => {
    setPreview({ status: "loading" });
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const run = await api.get<{ status: string; recordsExtracted: number; errorMessage: string | null }>(`/api/runs/${runId}`);
        if (["completed", "completed_with_errors", "failed", "cancelled"].includes(run.status) || attempts > 60) {
          clearInterval(timer);
          if (run.status === "failed" || run.recordsExtracted === 0) {
            setPreview({ status: "error", error: run.errorMessage ?? "No records extracted — try a different source or enable AI mode", elapsedMs: Date.now() - started });
            return;
          }
          const res = await api.get<{ records: Array<{ payload: Record<string, unknown> }> }>(`/api/collections/${colId}/records?limit=25&runId=${runId}`);
          setPreview({ status: "done", records: res.records.map((r) => r.payload), elapsedMs: Date.now() - started });
          queryClient.invalidateQueries({ queryKey: ["collections"] });
          queryClient.invalidateQueries({ queryKey: ["overview"] });
        }
      } catch {
        if (attempts > 60) {
          clearInterval(timer);
          setPreview({ status: "error", error: "Preview polling timed out" });
        }
      }
    }, 3000);
  };

  const launchFullRun = useMutation({
    mutationFn: async () => {
      const harvest = await api.post<{ collectionId: string; runId: string; format: string }>("/api/harvest", {
        workspaceId: workspace.id,
        url,
        prompt: prompt || undefined,
        fields,
        sourceType,
        format: exportFormat,
        pageBudget: maxPages,
        name: collectionName || undefined
      });
      return harvest;
    },
    onSuccess: (harvest) => {
      toast.success(`Harvest launched — ${exportFormat.toUpperCase()} file will download automatically when done`);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setActiveHarvest({ collectionId: harvest.collectionId, format: harvest.format });
      setPreview({ status: "loading" });
    },
    onError: (err) => toast.error((err as Error).message)
  });

  const { data: harvestStatus } = useQuery({
    queryKey: ["harvest-status", activeHarvest?.collectionId],
    queryFn: () => api.get<HarvestStatus>(`/api/harvest/${activeHarvest!.collectionId}`),
    enabled: !!activeHarvest,
    refetchInterval: 4000
  });

  if (activeHarvest && harvestStatus) {
    if (harvestStatus.downloadArtifactId && autoDownload) {
      toast.success(`Dataset ready — downloading ${activeHarvest.format.toUpperCase()}`);
      downloadArtifact(harvestStatus.downloadArtifactId);
      setActiveHarvest(null);
      setPreview({ status: "done", records: [], elapsedMs: 0 });
    } else if (harvestStatus.run && ["failed", "cancelled"].includes(harvestStatus.run.status)) {
      toast.error(`Harvest ${harvestStatus.run.status} — check the Runs page for logs`);
      setActiveHarvest(null);
    }
  }

  const addField = () => setFields([...fields, { name: `field_${fields.length + 1}`, type: "string", description: "" }]);
  const updateField = (i: number, patch: Partial<Field>) =>
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const activeOption = SOURCE_OPTIONS.find((o) => o.value === sourceType);
  const canRun = url.trim().length > 3 && fields.length > 0 && !runPreview.isPending && !launchFullRun.isPending;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-5">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-amber-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Source</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSourceType(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-[11px] transition-colors",
                    sourceType === opt.value
                      ? "border-amber-accent/50 bg-amber-accent/10 text-amber-300"
                      : "border-graphite-600 bg-graphite-850 text-slate-dim hover:border-graphite-600/80 hover:text-slate-text"
                  )}
                  title={opt.hint}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label.split(" (")[0]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-dim">{activeOption?.hint}</p>
            <div className="mt-3">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  sourceType === "github"
                    ? "https://github.com/vercel/next.js"
                    : sourceType === "arxiv"
                      ? "https://arxiv.org/list/cs.LG/recent"
                      : sourceType === "huggingface"
                        ? "https://huggingface.co/datasets/squad"
                        : "https://example.com/products"
                }
                className="font-mono text-xs"
              />
            </div>
            {sourceType === "website" && (
              <div className="mt-3 flex items-center gap-3">
                <label className="text-[11px] text-slate-dim">Page budget</label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(1, Number(e.target.value)))}
                  className="h-8 w-24 font-mono text-xs"
                />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-accent" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">AI schema prompt</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => genSchema.mutate()} disabled={genSchema.isPending || prompt.length < 10}>
                {genSchema.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Generate
              </Button>
            </div>
            <Textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Extract all medical dosage tables with drug name, dose in mg, and trial phase"'
            />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-accent" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Target schema</h2>
                <Badge variant="secondary">{fields.length} fields</Badge>
              </div>
              <button onClick={addField} className="flex items-center gap-1 text-xs text-amber-400 hover:underline">
                <Plus className="h-3 w-3" /> Add field
              </button>
            </div>
            <div className="dh-scroll-thin max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {fields.map((field, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded border border-graphite-700 bg-graphite-850 p-1.5">
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(i, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                    className="h-7 flex-1 border-0 bg-transparent font-mono text-xs focus-visible:border-0"
                    placeholder="field_name"
                  />
                  <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as Field["type"] })}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="array">array</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => updateField(i, { required: !field.required })}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      field.required ? "bg-amber-accent/15 text-amber-400" : "text-zinc-600 hover:text-slate-dim"
                    )}
                  >
                    req
                  </button>
                  <button onClick={() => removeField(i)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Launch &amp; deliver</h2>
            </div>
            <Input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Collection name (optional — auto-generated)"
            />
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] text-slate-dim">Dataset format</span>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger className="h-8 w-32 text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((f) => (
                    <SelectItem key={f} value={f} className="uppercase">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-slate-dim">
                <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
                Auto-download when done
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" disabled={!canRun} onClick={() => runPreview.mutate()}>
                {runPreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-zinc-950" />}
                Preview 1 page
              </Button>
              <Button variant="secondary" className="flex-1" disabled={!canRun} onClick={() => launchFullRun.mutate()}>
                {launchFullRun.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {activeHarvest ? "Harvesting…" : `Harvest → ${exportFormat.toUpperCase()}`}
              </Button>
            </div>
            {activeHarvest && (
              <p className="mt-2 text-center text-[11px] text-slate-dim">
                Run in progress — the {activeHarvest.format.toUpperCase()} file downloads here automatically.{" "}
                <a href="/runs" className="text-amber-400 hover:underline">
                  Watch live →
                </a>
              </p>
            )}
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="flex min-h-[600px] flex-col">
            <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-amber-accent" />
                <h2 className="text-sm font-semibold text-slate-text">Live extraction preview</h2>
              </div>
              {preview.status === "done" && (
                <Badge variant="success">{preview.records?.length ?? 0} records · {Math.round((preview.elapsedMs ?? 0) / 1000)}s</Badge>
              )}
              {preview.status === "loading" && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Extracting…</Badge>}
              {preview.status === "error" && <Badge variant="destructive">Failed</Badge>}
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs dh-scroll-thin">
              {preview.status === "idle" && (
                <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 text-zinc-600">
                  <div className="dh-grid-bg flex h-24 w-24 items-center justify-center rounded-xl border border-graphite-700">
                    <FileCode2 className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="max-w-xs text-center leading-relaxed">
                    Configure a source and schema, then hit <span className="text-amber-400">Preview 1 page</span> to inspect
                    extraction output before committing to a full harvest.
                  </p>
                </div>
              )}
              {preview.status === "loading" && (
                <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-accent border-t-transparent" />
                  <p className="text-slate-dim">Rendering page, running extraction pipeline…</p>
                </div>
              )}
              {preview.status === "error" && (
                <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 px-8">
                  <XCircle className="h-8 w-8 text-red-400" />
                  <p className="max-w-md text-center leading-relaxed text-red-300">{preview.error}</p>
                  <p className="text-[11px] text-zinc-600">Tip: JS-heavy sites need the Website source type. Check the Runs page for detailed logs.</p>
                </div>
              )}
              {preview.status === "done" && preview.records && (
                <pre className="whitespace-pre-wrap break-words text-emerald-300/90">
                  {JSON.stringify(preview.records, null, 2)}
                </pre>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
