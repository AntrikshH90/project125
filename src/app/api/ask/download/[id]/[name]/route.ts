// GET /api/ask/download/[id]/[name] — serve a single artifact file
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  pdf: "application/pdf", csv: "text/csv", json: "application/json",
  jsonl: "application/x-ndjson", txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8",
  bib: "text/plain; charset=utf-8", zip: "application/zip",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await ctx.params;
  // hard sanitize: id and name must be simple tokens
  if (!/^[\w-]+$/.test(id) || !/^[\w .@()-]+$/.test(name)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  const fp = path.join(ROOT, id, name);
  if (!fp.startsWith(ROOT)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = fs.readFileSync(fp);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
