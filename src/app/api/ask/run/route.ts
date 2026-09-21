// POST /api/ask — classify + start a job
import { NextRequest, NextResponse } from "next/server";
import { startJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ask = String(body?.ask ?? "").trim();
    if (!ask) return NextResponse.json({ error: "ask is required" }, { status: 400 });
    const { jobId, plan, intent } = await startJob(ask);
    return NextResponse.json({ jobId, plan, intent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
