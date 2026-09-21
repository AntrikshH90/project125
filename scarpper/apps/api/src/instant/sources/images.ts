// sources/images.ts — keyless image search: Openverse API (CC-licensed) + Wikimedia Commons fallback.

import fs from "node:fs";
import path from "node:path";
import { log, jobDir } from "../store.js";

const UA = "instant-scraper/1.0";

export interface ImageRec {
  title: string;
  url: string;        // direct image URL
  landing: string;
  source: string;
  license: string;
  width?: number;
  height?: number;
  extension: string;
}

export async function searchOpenverse(query: string, pageLen = 20, page = 1): Promise<ImageRec[]> {
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${pageLen}&page=${page}`, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`openverse ${r.status}`);
  const j = await r.json() as any;
  return (j.results ?? []).map((x: any): ImageRec => ({
    title: (x.title ?? "untitled").slice(0, 120),
    url: x.url,
    landing: x.foreign_landing_url ?? x.url,
    source: x.source ?? "openverse",
    license: [x.license, x.license_version].filter(Boolean).join(" "),
    width: x.width,
    height: x.height,
    extension: (x.url.split("?")[0].split("#")[0].split(".").pop() ?? "jpg").toLowerCase(),
  }));
}

export async function searchWikimedia(query: string, limit = 50, offset = 0): Promise<ImageRec[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:bitmap|drawing ${encodeURIComponent(query)}&gsrlimit=${limit}&gsroffset=${offset}&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1600&origin=*`;
  const r = await fetch(url, { headers: { "user-agent": UA } });
  const j = await r.json() as any;
  const pages = Object.values(j.query?.pages ?? {}) as any[];
  return pages
    .map((p: any): ImageRec | null => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
    const ext = (ii.url.split("/").pop() ?? "jpg").split(".").pop().toLowerCase();
    return {
      title: (p.title ?? "untitled").replace(/^File:/, "").slice(0, 120),
      url: ii.thumburl || ii.url,
      landing: ii.descriptionurl ?? ii.url,
      source: "wikimedia",
      license: ii.extmetadata?.LicenseShortName?.value ?? "",
      width: ii.thumbwidth ?? ii.width,
      height: ii.thumbheight ?? ii.height,
      extension: ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? ext : "jpg",
    };
  }).filter(Boolean) as ImageRec[];
}

export async function downloadImages(jobId: string, imgs: ImageRec[], want: number): Promise<number> {
  const dir = jobDir(jobId);
  let got = 0;
  let idx = 0;
  const q = imgs.slice(0, want);
  async function w() {
    while (idx < q.length) {
      const my = idx++;
      const im = q[my];
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(im.url, { headers: { "user-agent": UA }, signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error(String(r.status));
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 3000) throw new Error("too small");
        const safe = `${String(my + 1).padStart(3, "0")}-${im.title.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)}.${im.extension}`;
        fs.writeFileSync(path.join(dir, safe), buf);
        got++;
        if (got % 10 === 0) log(jobId, `downloaded ${got} images`);
      } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: 6 }, w));
  return got;
}

export async function tryImageSearch(query: string, want: number): Promise<ImageRec[]> {
  // Openverse first, Wikimedia fallback (and top-up if openverse returns too few)
  const all: ImageRec[] = [];
  try {
    const pages = Math.ceil(want / 20);
    for (let p = 1; p <= Math.min(pages, 10); p++) {
      const recs = await searchOpenverse(query, 20, p);
      all.push(...recs);
      if (recs.length < 20) break;
    }
  } catch (e: any) {
    log("global", `openverse failed: ${e.message}`);
  }
  if (all.length < want) {
    try {
      all.push(...(await searchWikimedia(query, Math.min(want, 100))));
    } catch { /* ignore */ }
  }
  // dedupe by URL
  const seen = new Set<string>();
  return all.filter((i) => i.url && !seen.has(i.url) && seen.add(i.url));
}

function esc(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function imagesToCsv(imgs: ImageRec[]): string {
  const head = ["title", "url", "landing", "source", "license", "width", "height", "extension"];
  const lines = [head.join(",")];
  for (const i of imgs) lines.push([i.title, i.url, i.landing, i.source, i.license, i.width, i.height, i.extension].map(esc).join(","));
  return lines.join("\n");
}
