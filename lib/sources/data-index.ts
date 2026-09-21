// sources/data-index.ts — Comprehensive data source discovery with format, size, license, quality indicators.
// Aggregates from HuggingFace, Kaggle, Google Dataset Search, and more.

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";
import { writeCsv, slug } from "./fetchers";

export interface DataSourceRec {
  title: string;
  description: string;
  url: string;
  format: string;        // csv, json, parquet, sql, etc.
  size: string;         // MB, GB
  rows: string;         // row count
  license: string;
  quality: number;      // 1-5 star rating
  tags: string[];
  source: string;       // huggingface, kaggle, google-datasets, etc.
  lastUpdated: string;
}

const FORMAT_ICONS: Record<string, string> = {
  csv: '📄',
  json: '📝',
  parquet: '🗂️',
  sql: '🗄️',
  xls: '📊',
  txt: '📃',
  xml: '📑',
  yaml: '📋',
  tsv: '📄',
  arrow: '🏹',
  feather: '🪶',
  avro: '📦',
  default: '📁',
};

const SIZE_RANGES = [
  { label: 'tiny', max: 10, icon: '✓️' },
  { label: 'small', max: 100, icon: '📱' },
  { label: 'medium', max: 1000, icon: '💻' },
  { label: 'large', max: 10000, icon: '🗄️' },
  { label: 'huge', max: Infinity, icon: '🏭' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getQualityScore(rec: { likes?: number; downloads?: number; version?: number }): number {
  let score = 1;
  if (rec.likes && rec.likes > 100) score += 1;
  if (rec.likes && rec.likes > 1000) score += 1;
  if (rec.downloads && rec.downloads > 1000) score += 0.5;
  if (rec.downloads && rec.downloads > 10000) score += 0.5;
  if (rec.version && rec.version > 1) score += 0.2;
  return Math.min(5, Math.round(score * 2) / 2);
}

async function searchHuggingFace(query: string, limit: number): Promise<DataSourceRec[]> {
  const out: DataSourceRec[] = [];
  try {
    const r = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}`, {
      headers: { "user-agent": "instant-scraper/1.0" }
    });
    if (!r.ok) return out;
    const list = await r.json();
    for (const d of list) {
      const size = d.cardData?.size;
      out.push({
        title: d.id,
        description: d.cardData?.description || '',
        url: `https://huggingface.co/datasets/${d.id}`,
        format: d.cardData?.tags?.find((t: string) => /csv|json|parquet|sql/i.test(t))?.split(':')?.[1] || 'unknown',
        size: size ? formatSize(size * 1024 * 1024) : 'unknown',
        rows: d.cardData?.train?.rows || 'unknown',
        license: d.cardData?.license || 'unknown',
        quality: getQualityScore({ likes: d.likes, downloads: d.downloads, version: d.cardData?.version }),
        tags: d.tags || [],
        source: 'huggingface',
        lastUpdated: d.lastModified?.split('T')[0] || 'unknown'
      });
    }
  } catch { /* ignore */ }
  return out;
}

async function searchKaggle(query: string, limit: number): Promise<DataSourceRec[]> {
  const out: DataSourceRec[] = [];
  try {
    const r = await fetch(`https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}`, {
      headers: { "user-agent": "instant-scraper/1.0" }
    });
    if (!r.ok) return out;
    const list = await r.json();
    for (const d of (list || []).slice(0, limit)) {
      out.push({
        title: d.title,
        description: d.description || '',
        url: `https://www.kaggle.com/datasets/${d.ref}`,
        format: (d.files?.[0]?.format || '').toLowerCase() || 'unknown',
        size: formatSize(d.totalBytes || 0),
        rows: 'unknown',
        license: d.license || 'unknown',
        quality: getQualityScore({ likes: d.voteCount, downloads: d.totalViews }),
        tags: d.tags?.map((t: any) => t.title) || [],
        source: 'kaggle',
        lastUpdated: d.lastUpdated?.split('T')[0] || 'unknown'
      });
    }
  } catch { /* ignore */ }
  return out;
}

export async function runDataIndexJob(jobId: string, query: string, limit: number): Promise<{ sources: number; formats: string[]; totalSize: number }> {
  const dir = jobDir(jobId);
  log(jobId, `data index mode — "${query}"`);
  update(jobId, { stage: "searching dataset indexes", progress: 10, itemsTotal: limit });

  const all: DataSourceRec[] = [];
  const formatSet = new Set<string>();
  let totalSize = 0;

  // Parallel search
  const [hf, kg] = await Promise.all([
    searchHuggingFace(query, Math.floor(limit / 2)),
    searchKaggle(query, Math.floor(limit / 2))
  ]);

  // Merge and dedupe
  const byTitle = new Map<string, DataSourceRec>();
  for (const d of [...hf, ...kg]) {
    if (!byTitle.has(d.title)) {
      byTitle.set(d.title, d);
      formatSet.add(d.format);
    }
  }
  
  const merged = [...byTitle.values()].slice(0, limit);
  all.push(...merged);

  // Write outputs
  const rows = merged.map(d => [
    d.title,
    d.source,
    d.format,
    d.size,
    d.rows,
    d.license,
    d.quality,
    d.tags.join(', '),
    d.url,
    d.lastUpdated
  ]);
  
  writeCsv(path.join(dir, "data-index.csv"), [
    "title", "source", "format", "size", "rows", "license", "quality", "tags", "url", "lastUpdated"
  ], rows);

  // Format breakdown
  const formatCounts = Array.from(formatSet).map(f => [f, merged.filter(d => d.format === f).length]);
  writeCsv(path.join(dir, "formats.csv"), ["format", "count"], formatCounts);

  // HTML summary with icons
  const qualityBadges = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
  const formatBadges = [...formatSet].map(f => `${FORMAT_ICONS[f] || '📁'} ${f}`).join(' ');
  
  const rowsHtml = merged.slice(0, 50).map((d) => 
    `<li>
      <a href="${d.url}"><b>${escapeHtml(d.title)}</b></a> 
      <small>(${d.source})</small><br>
      ${d.format} ${d.size} • ${d.rows} rows • ${d.license} • ${qualityBadges[d.quality - 1] || '⭐'}
    </li>`
  ).join("\n");

  fs.writeFileSync(path.join(dir, "summary.html"), `<!doctype html>
<html><head><meta charset="utf-8"><title>Data Sources — ${escapeHtml(query)}</title><style>
body{font-family:system-ui,sans-serif;max-width:950px;margin:24px auto;padding:0 16px;line-height:1.5}
li{margin:10px 0}small{color:#666}
format{display:inline-block;background:#1f2937;color:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px}
</style></head><body>
<h1>Dataset Sources for "${escapeHtml(query)}"</h1>
<p><strong>${merged.length}</strong> sources found • <strong>${Array.from(formatSet).length}</strong> formats • <strong>${formatBadges}</strong></p>
<p><a href="data-index.csv">Download full CSV</a> | <a href="formats.csv">Format breakdown</a></p>
<h2>Top sources</h2>
<ul>${rowsHtml || "<li>—</li>"}</ul>
</body></html>`);

  const sizeNum = merged.reduce((a, d) => {
    const m = d.size.match(/([\d.]+)/);
    return a + (m ? parseFloat(m[1]) : 0);
  }, 0);

  update(jobId, { 
    preview: [{ 
      totalSources: merged.length,
      formatsFound: Array.from(formatSet).length,
      estimatedSizeMB: sizeNum.toFixed(1)
    }],
    itemsDone: merged.length
  });
  
  return { sources: merged.length, formats: [...formatSet], totalSize: sizeNum };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
