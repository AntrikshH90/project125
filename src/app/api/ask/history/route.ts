// GET /api/ask/history — recent jobs from the downloads folder
import { NextResponse } from "next/server";
import { listJobs } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listJobs(30));
}
