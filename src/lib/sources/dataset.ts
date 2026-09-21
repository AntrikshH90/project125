// sources/dataset.ts — Hugging Face datasets: search, stream rows, write CSV/JSONL/Parquet.
// Parquet via DuckDB WASM is heavy; we ship CSV+JSONL always and Parquet only if duckdb available later.
// Row streaming: HF datasets-server /rows API (100 rows per call, keyless for public datasets).

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";

const UA = "instant-scraper/1.0";

// keyless works for public datasets; token raises limits and unlocks gated ones
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "user-agent": UA };
  if (process.env.HF_TOKEN) h.authorization = `Bearer ${process.env.HF_TOKEN}`;
  return h;
}

export interface DatasetPick {
  id: string;            // e.g. "imdb"
  downloads: number;
  likes: number;
  rowsHint: number;
  cols: string[];
}

export async function searchDatasets(query: string, limit = 10): Promise<DatasetPick[]> {
  const r = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=${limit}&sort=downloads&direction=-1&full=false`, {
    headers: authHeaders(),
  });
  const list = await r.json();
  return (Array.isArray(list) ? list : []).map((d: any) => ({
    id: d.id,
    downloads: d.downloads ?? 0,
    likes: d.likes ?? 0,
    rowsHint: 0,
    cols: [],
  }));
}

async function datasetInfo(id: string): Promise<{ rowsHint: number; splits: { name: string; numBytes?: number }[] }> {
  try {
    const j = await (await fetch(`https://datasets-server.huggingface.co/size?dataset=${id}`, { headers: authHeaders() })).json();
    const splits = j.size?.splits ?? [];
    const rowsHint = splits.reduce((a: number, s: any) => a + (s.num_rows ?? 0), 0);
    return { rowsHint, splits: splits.map((s: any) => ({ name: s.name })) };
  } catch {
    return { rowsHint: 0, splits: [] };
  }
}

// strip ML-noise words users add ("for training a model") that wreck literal HF search
function cleanQuery(q: string): string {
  return q
    .replace(/\b(for|training|train|model|models|machine|learning|ml|ai|data|give|me)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function pickDataset(jobId: string, query: string, want: number): Promise<DatasetPick | null> {
  // search both the raw and cleaned query; obscure raw matches lose to canonical cleaned matches
  const variants = [...new Set([query, cleanQuery(query)].filter(Boolean))];
  const cands: DatasetPick[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    try {
      for (const d of await searchDatasets(v, 12)) {
        if (!seen.has(d.id)) { seen.add(d.id); cands.push(d); }
      }
    } catch { /* try next variant */ }
  }
  if (cands.length === 0) return null;
  // enrich top 6 with size info (concurrently)
  await Promise.all(cands.slice(0, 6).map(async (c) => {
    const info = await datasetInfo(c.id);
    c.rowsHint = info.rowsHint;
  }));
  // Rank by: can it cover the requested rows? then popularity; if none cover, biggest first.
  // Non-English dataset IDs (cs_*, tr_*, de_*...) get demoted unless the user named that language.
  const NON_EN = /^(cs|tr|de|fr|es|it|pl|ru|nl|sv|fi|hu|ro|pt|ja|ko|zh|ar|hi|bn|ta|te|ml|mr|ur|fa|vi|th|uk|bg|da|no|sl|sk|hr|sr|lt|lv|et|he|el|id|ms|kk|az|uz)_/;
  const userWantsLang = /\b(english|hindi|turkish|czech|german|french|spanish|chinese|japanese|korean|russian|arabic|portuguese|italian|dutch|polish)\b/i.test(query);
  const score = (c: DatasetPick): number => {
    let s = Math.log10(c.downloads + 10);                                   // popularity
    if (c.rowsHint >= want) s += 2;                                          // covers the ask: big boost
    else if (want / Math.max(c.rowsHint, 1, 1) <= 4) s += 0.5;               // within 4x of ask: mild boost
    const bare = c.id.split("/").pop() ?? c.id;
    if (!userWantsLang && NON_EN.test(bare)) s -= 2.5;                       // non-English prefix: demote
    return s;
  };
  const ranked = [...cands].sort((a, b) => score(b) - score(a));
  const pick = ranked[0];
  if (pick.rowsHint > 0 && pick.rowsHint < want) {
    log(jobId, `note: best dataset has ${pick.rowsHint.toLocaleString()} rows — you asked for ${want.toLocaleString()}`);
  }
  log(jobId, `picked HF dataset "${pick.id}" (${pick.rowsHint.toLocaleString()} rows available, ${pick.downloads.toLocaleString()} downloads)`);
  return pick;
}

export interface RowsResult {
  rows: any[];
  columns: string[];
  split: string;
  dataset: string;
}

// Stream rows from HF datasets-server /rows endpoint. Keyless, 100/call, paginated by offset.
export async function streamRows(jobId: string, dataset: string, want: number, split?: string): Promise<RowsResult> {
  const rows: any[] = [];
  let columns: string[] = [];
  let config = "";
  // 1. resolve config + split
  const splitsJ = await (await fetch(`https://datasets-server.huggingface.co/splits?dataset=${dataset}`, { headers: authHeaders() })).json();
  const splits: any[] = splitsJ.splits ?? [];
  if (splits.length === 0) throw new Error(`dataset ${dataset} has no readable splits (it may be gated or unsupported format)`);
  const useSplit = split && splits.some((s) => s.config === config && s.split === split) ? split : (splits.find((s) => s.split === "train") ?? splits[0]).split;
  config = (splits.find((s) => s.split === useSplit) ?? splits[0]).config;
  log(jobId, `streaming split "${useSplit}" (config ${config})`);

  // 2. page through rows (parallel batches of 5 requests x 100 rows, retry on rate limit)
  const PER = 100;
  let offset = 0;
  let done = false;
  const fetchPage = async (o: number): Promise<any[] | null> => {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${dataset}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(useSplit)}&offset=${o}&length=${PER}`;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const r = await fetch(url, { headers: authHeaders() });
        if (r.status === 429 || r.status === 503) {
          await new Promise((res) => setTimeout(res, attempt * 1500));
          continue;
        }
        if (!r.ok) return null;
        const j = await r.json();
        return j.rows?.map((row: any) => row.row) ?? [];
      } catch {
        await new Promise((res) => setTimeout(res, attempt * 1000));
      }
    }
    return null;
  };
  while (!done && rows.length < want) {
    const batchOffsets: number[] = [];
    for (let i = 0; i < 5 && offset < want; i++, offset += PER) batchOffsets.push(offset);
    const pages = await Promise.all(batchOffsets.map(fetchPage));
    let added = 0;
    let allEmpty = true;
    for (const page of pages) {
      if (!page) continue;             // failed page — don't assume end of data
      if (page.length > 0) allEmpty = false;
      for (const row of page) {
        if (rows.length < want) { rows.push(row); added++; }
      }
      if (page.length > 0 && columns.length === 0) columns = Object.keys(page[0]).filter((k) => k !== "Unnamed: 0");
    }
    // end only when every page in the batch came back empty (200, zero rows)
    if (allEmpty && pages.every((p) => p !== null)) done = true;
    if (added === 0 && pages.every((p) => p === null)) done = true; // all failed after retries
    update(jobId, { itemsDone: rows.length });
  }
  return { rows, columns, split: useSplit, dataset };
}

// ---- writers ----

function flatten(row: any, prefix = ""): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else if (Array.isArray(v)) out[key] = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" | ");
    else out[key] = v;
  }
  return out;
}

export function rowsToCsv(rows: any[], columns: string[]): string {
  const flat = rows.map((r) => flatten(r));
  const cols = columns.length ? columns : [...new Set(flat.flatMap((r) => Object.keys(r)))];
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of flat) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n");
}

export function rowsToJsonl(rows: any[]): string {
  return rows.map((r) => JSON.stringify(flatten(r))).join("\n");
}

// Download the dataset's parquet files directly (HF CDN) — used for large pulls
// where row-by-row paging would be slow and rate-limited.
export async function downloadParquet(jobId: string, dataset: string, want: number, split?: string): Promise<{ files: string[]; totalBytes: number; rowsAvailable: number }> {
  const j = await (await fetch(`https://datasets-server.huggingface.co/parquet?dataset=${dataset}`, { headers: authHeaders() })).json();
  let urls: { url: string; split: string; config: string }[] = j.parquet_files ?? [];
  if (!urls.length) throw new Error("no parquet files available for this dataset");
  // prefer the split we want (train by default), else all
  const wantSplit = split ?? "train";
  const matched = urls.filter((f) => f.split === wantSplit);
  if (matched.length) urls = matched;
  const { dir } = { dir: jobDir(jobId) };

  // resolve splits to get accurate available-row count
  let rowsAvailable = 0;
  try {
    const sj = await (await fetch(`https://datasets-server.huggingface.co/splits?dataset=${dataset}`, { headers: authHeaders() })).json();
    rowsAvailable = urls.reduce((a, f) => {
      const s = (sj.splits ?? []).find((x: any) => x.config === f.config && x.split === f.split);
      return a + (s?.num_rows ?? 0);
    }, 0);
  } catch { /* size info unavailable */ }

  const MAX_BYTES = 3 * 1024 * 1024 * 1024; // 3GB safety cap
  let totalBytes = 0;
  const written: string[] = [];
  const base = dataset.replace(/[/:]/g, "_");
  let i = 0;
  for (const f of urls) {
    if (totalBytes > MAX_BYTES) { log(jobId, `stopped at ${written.length} parquet files (3GB cap)`); break; }
    i++;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 300000);
      const r = await fetch(f.url, { headers: authHeaders(), signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(path.join(dir, `${base}__${f.split}__part${i}.parquet`), buf);
      totalBytes += buf.length;
      written.push(`${base}__${f.split}__part${i}.parquet`);
      log(jobId, `downloaded parquet part ${i} (${(buf.length / 1e6).toFixed(1)} MB, split ${f.split})`);
      update(jobId, { itemsDone: Math.min(rowsAvailable || 0, want) });
    } catch (e: any) {
      log(jobId, `parquet part ${i} failed: ${e.message}`);
    }
  }
  if (!written.length) throw new Error("parquet download failed");
  return { files: written, totalBytes, rowsAvailable };
}

export async function writeDatasetOutputs(jobId: string, res: RowsResult): Promise<string[]> {
  const dir = jobDir(jobId);
  const written: string[] = [];
  const base = res.dataset.replace(/[/:]/g, "_");
  const csv = rowsToCsv(res.rows, res.columns);
  fs.writeFileSync(path.join(dir, `${base}.csv`), csv);
  written.push(`${base}.csv`);
  const jsonl = rowsToJsonl(res.rows);
  fs.writeFileSync(path.join(dir, `${base}.jsonl`), jsonl);
  written.push(`${base}.jsonl`);
  return written;
}
