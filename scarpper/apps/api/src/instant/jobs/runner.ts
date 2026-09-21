// jobs/runner.ts — executes a classified intent end-to-end, updating the job record live.

import fs from "node:fs";
import path from "node:path";
import { createJob, update, log, addFiles, jobDir, ROOT } from "../store.js";
import { classifySmart, describePlan, Intent } from "../intent.js";
import * as papers from "../sources/papers.js";
import * as dataset from "../sources/dataset.js";
import * as github from "../sources/github.js";
import * as images from "../sources/images.js";
import * as web from "../sources/web.js";

export async function startJob(ask: string): Promise<{ jobId: string; plan: string; intent: Intent }> {
  const intent = await classifySmart(ask);
  const plan = describePlan(intent);
  const job = createJob(ask, plan, intent.kind, intent);
  // fire and forget — status endpoint reports progress
  run(job.id, intent).catch(async (e) => {
    update(job.id, { status: "error", error: String(e?.message ?? e), finishedAt: Date.now() });
    log(job.id, `FATAL: ${String(e?.message ?? e)}`);
  });
  return { jobId: job.id, plan, intent };
}

async function run(jobId: string, intent: Intent): Promise<void> {
  const t0 = Date.now();
  update(jobId, { status: "running", stage: "searching", progress: 5 });
  log(jobId, `plan: ${intent.kind}`);

  try {
    switch (intent.kind) {
      case "papers": await runPapers(jobId, intent); break;
      case "dataset": await runDataset(jobId, intent); break;
      case "github": await runGithub(jobId, intent); break;
      case "images": await runImages(jobId, intent); break;
      case "web": await runWeb(jobId, intent); break;
      default: throw new Error(intent.reason);
    }
    addFiles(jobId, jobDir(jobId));
    update(jobId, { status: "done", progress: 100, stage: "complete", finishedAt: Date.now() });
    log(jobId, `done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e: any) {
    addFiles(jobId, jobDir(jobId));
    update(jobId, { status: "error", error: String(e?.message ?? e), finishedAt: Date.now() });
    log(jobId, `ERROR: ${String(e?.message ?? e)}`);
  }
}

// ---------------- papers ----------------
async function runPapers(jobId: string, i: Extract<Intent, { kind: "papers" }>) {
  const limit = i.limit;
  const lists: papers.PaperRec[][] = [];
  update(jobId, { itemsTotal: limit, stage: `searching arXiv / OpenAlex / Crossref` });

  const tasks = [
    (async () => {
      try { const r = await papers.searchArxiv(i.topic, limit); log(jobId, `arxiv: ${r.length} results`); return r; }
      catch (e: any) { log(jobId, `arxiv failed: ${e.message}`); return []; }
    })(),
    (async () => {
      try { const r = await papers.searchOpenAlex(i.topic, Math.min(limit, 200)); log(jobId, `openalex: ${r.length} results`); return r; }
      catch (e: any) { log(jobId, `openalex failed: ${e.message}`); return []; }
    })(),
    (async () => {
      try { const r = await papers.searchCrossref(i.topic, Math.min(limit, 100)); log(jobId, `crossref: ${r.length} results`); return r; }
      catch (e: any) { log(jobId, `crossref failed: ${e.message}`); return []; }
    })(),
    (async () => {
      try { const r = await papers.searchSemanticScholar(i.topic, limit); log(jobId, `semantic scholar: ${r.length} results`); return r; }
      catch (e: any) { log(jobId, `semantic scholar failed: ${e.message}`); return []; }
    })(),
  ];
  lists.push(...(await Promise.all(tasks)));

  let merged = papers.mergePapers(...lists);
  if (merged.length === 0) throw new Error("no papers found on any source — try a broader topic");
  log(jobId, `merged ${merged.length} unique papers`);

  // resolve more direct PDF links via Unpaywall (for DOI papers without one)
  await papers.resolvePdfUrls(jobId, merged);

  // prioritize papers with PDF urls for download
  const withPdf = merged.filter((p) => p.pdfUrl);
  merged = [...withPdf, ...merged.filter((p) => !p.pdfUrl)];

        update(jobId, { stage: "downloading PDFs", progress: 30, itemsDone: 0, itemsTotal: Math.min(withPdf.length, limit), preview: merged.slice(0, 5).map((p: any) => ({ title: p.title, year: p.year, source: p.source, pdf: !!p.pdfUrl })) });
  const dir = jobDir(jobId);

  const got = await papers.downloadPdfs(jobId, merged, i.wantPdfs ? Math.min(limit * 3, withPdf.length, 40) : 0);
  log(jobId, `PDFs saved: ${got}`);

  // metadata CSV + BibTeX
  fs.writeFileSync(path.join(dir, "papers.csv"), papers.papersToCsv(merged));
  fs.writeFileSync(path.join(dir, "papers.bib"), papers.papersToBibtex(merged));
  update(jobId, { stage: "writing metadata", progress: 90, itemsDone: got });
}

// ---------------- dataset ----------------
async function runDataset(jobId: string, i: Extract<Intent, { kind: "dataset" }>) {
  update(jobId, { stage: "finding a public dataset", progress: 10, itemsTotal: i.rows });
  const pick = await dataset.pickDataset(jobId, i.query, i.rows);
  if (!pick) throw new Error(`no HF dataset found for "${i.query}" — try more common wording (e.g. "movie reviews")`);
  update(jobId, { stage: `pulling ${pick.id}`, progress: 30 });
  const BIG = 20000;
  if (i.rows >= BIG) {
    // large pull: fetch parquet files directly (fast, no row paging, no rate limits)
    log(jobId, `large pull (${i.rows.toLocaleString()} rows) — using direct parquet download`);
    const pq = await dataset.downloadParquet(jobId, pick.id, i.rows);
    log(jobId, `downloaded ${pq.files.length} parquet files (${(pq.totalBytes / 1e6).toFixed(1)} MB total)`);
    const rowsGot = pq.rowsAvailable > 0 ? pq.rowsAvailable : pick.rowsHint;
    update(jobId, {
      stage: "complete",
      itemsDone: Math.min(rowsGot, i.rows),
      preview: [{ dataset: pick.id, split: "train", rowsAvailable: rowsGot.toLocaleString(), parquetFiles: pq.files.length, note: "parquet = native pandas/pyarrow input; use pd.read_parquet(...)" }],
    });
  } else {
    // small pull: page rows and write CSV + JSONL
    const res = await dataset.streamRows(jobId, pick.id, i.rows);
    if (res.rows.length === 0) throw new Error(`dataset ${pick.id} returned 0 rows (may be gated or unsupported)`);
    update(jobId, { stage: "writing files", progress: 80, itemsDone: res.rows.length });
    const written = await dataset.writeDatasetOutputs(jobId, res);
    log(jobId, `wrote ${written.join(", ")}`);
    update(jobId, { preview: res.rows.slice(0, 5), itemsDone: res.rows.length });
  }
}

// ---------------- github ----------------
async function runGithub(jobId: string, i: Extract<Intent, { kind: "github" }>) {
  update(jobId, { stage: "searching GitHub", progress: 15, itemsTotal: i.limit });
  const repos = await github.searchRepos(i.query, i.limit);
  if (repos.length === 0) throw new Error(`no repos found for "${i.query}"`);
  log(jobId, `found ${repos.length} repos`);
  const dir = jobDir(jobId);
  fs.writeFileSync(path.join(dir, "repos.csv"), github.reposToCsv(repos));
  update(jobId, { progress: 40, preview: repos.slice(0, 5).map((r: any) => ({ repo: r.full_name, stars: r.stars, lang: r.language })) });
  update(jobId, { stage: "fetching READMEs", progress: 60 });
  const got = await github.downloadReadmes(jobId, repos, Math.min(repos.length, 50));
  log(jobId, `READMEs saved: ${got}`);
  update(jobId, { itemsDone: repos.length });
}

// ---------------- images ----------------
async function runImages(jobId: string, i: Extract<Intent, { kind: "images" }>) {
  update(jobId, { stage: "searching Openverse + Wikimedia", progress: 15, itemsTotal: i.limit });
  const found = await images.tryImageSearch(i.query, i.limit);
  if (found.length === 0) throw new Error(`no images found for "${i.query}"`);
  log(jobId, `found ${found.length} candidate images`);
  const dir = jobDir(jobId);
  fs.writeFileSync(path.join(dir, "images.csv"), images.imagesToCsv(found));
  update(jobId, { progress: 40, stage: "downloading images" });
  const got = await images.downloadImages(jobId, found, i.limit);
  log(jobId, `images saved: ${got}`);
  update(jobId, { preview: found.slice(0, 5).map((im: any) => ({ title: im.title, url: im.url.slice(0, 80), license: im.license })), itemsDone: got });
}

// ---------------- web ----------------
async function runWeb(jobId: string, i: Extract<Intent, { kind: "web" }>) {
  update(jobId, { stage: i.url ? `scraping ${i.url}` : `searching web for "${i.query}"`, progress: 15, itemsTotal: i.url ? 1 : Math.min(i.limit, 8) });
  const out = await web.runWebJob(jobId, i.query, i.url, i.limit);
  update(jobId, {
    preview: out.recs.map((r: any) => ({ title: r.title, url: r.url, chars: r.textChars })),
    itemsDone: out.recs.length,
  });
}

// ---------------- zip ----------------
export async function zipJob(jobId: string): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const dir = path.join(ROOT, jobId);
  const zip = new JSZip();
  const add = (d: string, prefix = "") => {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) add(fp, prefix + f + "/");
      else zip.file(prefix + f, fs.readFileSync(fp));
    }
  };
  add(dir);
  const out = path.join(dir, `${jobId}.zip`);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(out, buf);
  return out;
}
