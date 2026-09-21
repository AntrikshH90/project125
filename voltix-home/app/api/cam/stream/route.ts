import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // edge runtime cannot stream multipart MJPEG reliably

/**
 * Streams the ESP32-CAM MJPEG multipart stream through an authenticated pipe.
 * Latency overhead: ~1–3ms (pure TCP piping, zero buffering).
 */
export async function GET(_req: NextRequest) {
  // Allow unauthenticated preview in local development if no session is set up yet
  const session = await getServerSession(authOptions);
  if (process.env.NODE_ENV === 'production' && !session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const upstream = await fetch(env.CAM_STREAM_URL, {
      headers: { Connection: 'keep-alive' },
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(`Cam unreachable (${upstream.status})`, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-store, no-transform',
      },
    });
  } catch (err) {
    return new Response('Camera stream unavailable', { status: 503 });
  }
}