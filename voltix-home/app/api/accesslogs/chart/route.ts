import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type DayBucketShape = { day: string; granted: number; denied: number };

export async function GET(req: NextRequest) {
  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 14), 90);
  const since = new Date(Date.now() - days * 86_400_000);

  // Group aggregate query (works on SQLite & PostgreSQL)
  const logs = await prisma.accessLog.findMany({
    where: {
      timestamp: { gte: since },
    },
    select: {
      timestamp: true,
      status: true,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  const map = new Map<string, DayBucketShape>();

  // Fill in all past N days with 0s so the chart has continuous date buckets
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const dayStr = d.toISOString().slice(5, 10); // MM-DD
    map.set(dayStr, { day: dayStr, granted: 0, denied: 0 });
  }

  for (const log of logs) {
    const dayStr = log.timestamp.toISOString().slice(5, 10);
    const bucket = map.get(dayStr) ?? { day: dayStr, granted: 0, denied: 0 };
    if (log.status === 'GRANTED') {
      bucket.granted += 1;
    } else {
      bucket.denied += 1;
    }
    map.set(dayStr, bucket);
  }

  return NextResponse.json(Array.from(map.values()));
}
