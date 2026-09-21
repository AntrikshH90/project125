// GET /api/ask/zip?id= — build + download a zip of all job files
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import { zipJob } from "@/lib/jobs/runner";
import fs from "node:fs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  try {
    const zipPath = await zipJob(id);
    const buf = fs.readFileSync(zipPath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="instant-scraper-${id}.zip"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
