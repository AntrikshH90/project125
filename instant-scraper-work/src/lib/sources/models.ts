// sources/models.ts — GitHub model discovery. When the user asks for "a model that
// does X", search GitHub for ready-built repos/models, rank them, and deliver a
// decision-ready comparison: CSV + README reports per top repo + setup snippets.

import fs from "node:fs";
import path from "node:path";
import { log, update, jobDir } from "../store";
import { ghHeaders } from "./github";
import { writeCsv, slug } from "./fetchers";
import { fetchAndSaveText } from "./fetchers";

export interface ModelRec {
  full_name: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  license: string;
  pushed_at: string;
  has_model_weights: boolean;   // .safetensors / .pt / .onnx found in tree
  model_size_hint: string;      // e.g. "7B", "300M" parsed from name/readme
  install: string;              // best-guess install/run command
  score: number;
}

const SIZE_RE = /(\d+(?:\.\d+)?)\s*([bmb]\b|billion|million|params)/i;

function sizeFromText(text: string): string {
  const m = text.match(/(\d+(?:\.\d+)?)\s?(-\s?)?(b|bn|billion)\b/i);
  if (m) return `${m[1]}B`;
  const m2 = text.match(/(\d+(?:\.\d+)?)\s?(m|million)\b/i);
  if (m2) return `${m2[1]}M`;
  return "";
}

function inferInstall(r: any): string {
  const lang = (r.language ?? "").toLowerCase();
  if (lang === "python") return "pip install (see repo README) → python demo.py";
  if (lang === "javascript" || lang === "typescript") return "npm install (see repo README)";
  return "see repo README";
}

export async function searchModels(query: string, limit: number): Promise<ModelRec[]> {
  const per = Math.min(Math.max(limit, 20), 100);
  // search repos; also try topic-style search
  const tries = [
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${per}`,
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query + " in:name,description,readme")}&sort=stars&order=desc&per_page=${per}`,
  ];
  const byName = new Map<string, ModelRec>();
  for (const url of tries) {
    try {
      const r = await fetch(url, { headers: ghHeaders() });
      if (!r.ok) throw new Error(`github ${r.status}`);
      const j = await r.json();
      for (const it of j.items ?? []) {
        const rec: ModelRec = {
          full_name: it.full_name,
          url: it.html_url,
          description: it.description ?? "",
          stars: it.stargazers_count ?? 0,
          language: it.language ?? "",
          topics: it.topics ?? [],
          license: it.license?.spdx_id ?? "",
          pushed_at: it.pushed_at?.slice(0, 10) ?? "",
          has_model_weights: false,
          model_size_hint: sizeFromName(it.name + " " + (it.description ?? "")),
          install: inferInstall(it),
          score: 0,
        };
        if (!byName.has(rec.full_name)) byName.set(rec.full_name, rec);
      }
    } catch { /* try next */ }
  }
  const out = [...byName.values()];
  // score: stars dominate, freshness bonus, size-hint bonus
  for (const m of out) {
    const days = Math.max(0, (Date.now() - new Date(m.pushed_at).getTime()) / 86400000);
    m.score = Math.log10(m.stars + 10) + (days < 180 ? 0.7 : 0) + (m.model_size_hint ? 0.3 : 0);
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

function sizeFromName(text: string): string {
  const m = text.match(/(\d+(?:\.\d+)?)\s?(-\s)?([0-9]*\.?[0-9]*\s?[bB])\b/);
  const mm = text.match(/\b(\d+(?:\.\d+)?)\s?([bB])\b/);
  if (mm) return `${mm[1]}${mm[2].toUpperCase()}`;
  return m ? m[1] : "";
}

// ---- enrich top N: does the repo actually ship model weights? ----
export async function enrichModels(jobId: string, models: ModelRec[], max = 10): Promise<void> {
  const dir = jobDir(jobId);
  update(jobId, { stage: "inspecting top repos", progress: 55, itemsTotal: Math.min(models.length, max) });
  let done = 0;
  for (const m of models.slice(0, max)) {
    try {
      const treeRes = await fetch(`https://api.github.com/repos/${m.full_name}/git/trees/HEAD?recursive=1`, { headers: ghHeaders() });
      if (treeRes.ok) {
        const j: any = await treeRes.json();
        const paths: string[] = (j.tree ?? []).map((t: any) => t.path);
        m.has_model_weights = paths.some((p) => /\.(safetensors|bin|pt|onnx|gguf|pth|ckpt|h5|mlmodel)$/i.test(p));
      }
    } catch { /* keep false */ }
    // save the README as the "inspect" artifact
    try {
      const r = await fetch(`https://api.github.com/repos/${m.full_name}/readme`, { headers: { ...ghHeaders(), accept: "application/vnd.github.raw" } });
      if (r.ok) {
        const txt = await r.text();
        if (txt.length > 50) {
          fs.writeFileSync(path.join(dir, `model-${slug(m.full_name.replace("/", "-"))}-README.md`), txt);
          if (!m.model_size_hint) m.model_size_hint = sizeFromName(txt.slice(0, 4000));
        }
      }
    } catch { /* optional */ }
    done++;
    update(jobId, { itemsDone: done });
  }
}

export function modelsToCsv(models: ModelRec[]): string {
  const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["rank", "repo", "url", "stars", "language", "license", "ships_weights", "size_hint", "description", "install_hint"];
  const lines = [head.join(",")];
  models.forEach((m, i) => {
    lines.push([i + 1, m.full_name, m.url, m.stars, m.language, m.license, m.has_model_weights ? "yes" : "no", m.model_size_hint, m.description, m.install].map(esc).join(","));
  });
  return lines.join("\n");
}

export function modelsToHtml(models: ModelRec[], query: string): string {
  const rows = models.map((m, i) => `
  <tr>
    <td>${i + 1}</td>
    <td><a href="${m.url}"><b>${m.full_name}</b></a><br><small>${escapeHtml(m.description || "")}</small></td>
    <td>${m.stars.toLocaleString()}★</td>
    <td>${m.language || "—"}</td>
    <td>${m.license || "—"}</td>
    <td>${m.has_model_weights ? "✅ weights" : "code only"}</td>
    <td>${m.model_size_hint || "—"}</td>
  </tr>`).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Models — ${escapeHtml(query)}</title><style>
body{font-family:system-ui,sans-serif;max-width:1000px;margin:24px auto;padding:0 16px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}small{color:#666}
</style></head><body><h1>Ready-built models for "${escapeHtml(query)}"</h1>
<p>Pick from the ranked list below — weights column tells you if the repo ships model files you can download and run.</p>
<table><tr><th>#</th><th>Repo</th><th>Stars</th><th>Lang</th><th>License</th><th>Weights</th><th>Size</th></tr>
${rows}
</table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
