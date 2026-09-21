// sources/fetchers.ts — shared low-level fetch/save helpers for all sources.
// Every download: UA header, timeout, magic-byte validation, size floor, unique names.

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";

export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function sanitizeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9 ._-]/g, "_").replace(/\s+/g, " ").slice(0, 60).trim();
}

const MAGIC: { sig: number[]; ext: string }[] = [
  { sig: [0x25, 0x50, 0x44, 0x46], ext: "pdf" },                 // %PDF
  { sig: [0x50, 0x4b], ext: "zip" },                              // PK (docx/xlsx/pptx/zip)
  { sig: [0xd0, 0xcf, 0x11, 0xe0], ext: "doc" },                  // OLE (doc/ppt/xls)
  { sig: [0x52, 0x61, 0x72, 0x21], ext: "rar" },
  { sig: [0x37, 0x7a, 0xbc, 0xaf], ext: "7z" },
  { sig: [0x1f, 0x8b], ext: "gz" },
  { sig: [0x89, 0x50, 0x4e, 0x47], ext: "png" },
  { sig: [0xff, 0xd8, 0xff], ext: "jpg" },
  { sig: [0x47, 0x49, 0x46, 0x38], ext: "gif" },
];

function sniffExt(buf: Buffer, url: string, contentType: string): string | null {
  for (const m of MAGIC) {
    if (buf.length >= m.sig.length && m.sig.every((b, i) => buf[i] === b)) {
      // PK could be a real zip — prefer a url/ct hint if it says zip/docx/xlsx/pptx
      if (m.ext === "zip") {
        if (/\.docx(\?|$)/i.test(url) || /wordprocessingml/.test(contentType)) return "docx";
        if (/\.xlsx(\?|$)/i.test(url) || /spreadsheetml/.test(contentType)) return "xlsx";
        if (/\.pptx(\?|$)/i.test(url) || /presentationml/.test(contentType)) return "pptx";
        const z = url.match(/\.(zip|epub|apk|jar)(\?|$)/i);
        return z ? z[1].toLowerCase() : "zip";
      }
      return m.ext;
    }
  }
  // text-ish?
  const head = buf.slice(0, 512).toString("utf8").toLowerCase();
  if (head.includes("<!doctype html") || head.includes("<html")) return null; // html stub, reject
  if (/text\/plain|application\/json/.test(contentType) || /\.(txt|csv|json|md)(\?|$)/i.test(url)) {
    const t = url.match(/\.(txt|csv|json|md)(\?|$)/i);
    return t ? t[1].toLowerCase() : "txt";
  }
  return null;
}

export interface SaveResult { ok: boolean; file?: string; bytes?: number; reason?: string }

/** Download a binary/doc into the job dir with magic validation. Throws only on caller-relevant info via result. */
export async function fetchAndSaveBinary(jobId: string, url: string, baseName: string, timeoutMs = 40000): Promise<SaveResult> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/pdf,*/*" },
      signal: ctl.signal,
      redirect: "follow",
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 3000) return { ok: false, reason: `too small (${buf.length}B)` };
    const ct = r.headers.get("content-type") ?? "";
    const ext = sniffExt(buf, url, ct);
    if (!ext) return { ok: false, reason: "not a document (html stub)" };
    const name = `${sanitizeName(baseName) || "doc"}-${slug(new URL(url).pathname.split("/").pop() || "file")}.${ext}`;
    fs.writeFileSync(uniqueFile(path.join(jobDir(jobId), name)), buf);
    return { ok: true, file: name, bytes: buf.length };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? String(e) };
  } finally {
    clearTimeout(t);
  }
}

function uniqueFile(p: string): string {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p);
  const base = path.basename(p, ext);
  let i = 2;
  while (fs.existsSync(path.join(path.dirname(p), `${base}-${i}${ext}`))) i++;
  return path.join(path.dirname(p), `${base}-${i}${ext}`);
}

/** Fetch a text doc (txt/csv/json) and save. */
export async function fetchAndSaveText(jobId: string, url: string, baseName: string): Promise<SaveResult> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const txt = await r.text();
    if (txt.length < 300) return { ok: false, reason: "too small" };
    const m = url.match(/\.(csv|json|md|txt)(\?|$)/i);
    const name = `${sanitizeName(baseName) || "doc"}.${m ? m[1].toLowerCase() : "txt"}`;
    fs.writeFileSync(uniqueFile(path.join(jobDir(jobId), name)), txt);
    return { ok: true, file: name, bytes: txt.length };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? String(e) };
  } finally {
    clearTimeout(t);
  }
}

export function writeCsv(filePath: string, headers: string[], rows: any[][]): void {
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  fs.writeFileSync(filePath, lines.join("\n"));
}

/** Run download tasks with N workers, live progress. Returns ok/failed counts. */
export async function downloadConcurrent(jobId: string, tasks: (() => Promise<void>)[], max: number, workers = 5): Promise<{ ok: number; failed: number }> {
  const q = tasks.slice(0, Math.max(max, 3));
  let idx = 0, ok = 0, failed = 0;
  const total = q.length;
  async function w() {
    while (idx < q.length) {
      const my = idx++;
      try { await q[my](); ok++; }
      catch (e: any) { failed++; if (failed <= 5) log(jobId, `download failed: ${String(e?.message ?? e).slice(0, 80)}`); }
      if ((ok + failed) % 5 === 0) update(jobId, { itemsDone: ok + failed, itemsTotal: total });
    }
  }
  await Promise.all(Array.from({ length: workers }, w));
  update(jobId, { itemsDone: ok + failed, itemsTotal: total });
  return { ok, failed };
}
