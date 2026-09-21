import { NextRequest, NextResponse } from 'next/server';
import { handleFaceResult, type FaceResultPayload } from '@/lib/face-bridge';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-voltix-key') !== env.VOLTIX_DEVICE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json()) as FaceResultPayload;
  await handleFaceResult(body);
  return NextResponse.json({ ok: true });
}