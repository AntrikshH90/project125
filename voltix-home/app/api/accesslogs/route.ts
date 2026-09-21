import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const take = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 500);
  const logs = await prisma.accessLog.findMany({
    take,
    orderBy: { timestamp: 'desc' },
    include: { person: true },
  });
  return NextResponse.json(logs);
}