// GET /api/ask/status?id= — live job status
import { NextRequest, NextResponse } from "next/server";
import { getJob, publicJob, fileList } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "job not found (server may have restarted)" }, { status: 404 });
  const pub = publicJob(job);
  if (job.status === "done" || job.status === "error") pub.files = fileList(id);
  else pub.files = fileList(id); // refresh cheap
  return NextResponse.json(pub);
}
