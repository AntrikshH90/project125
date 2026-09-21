import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [today, granted, denied, persons] = await Promise.all([
    prisma.accessLog.count({ where: { timestamp: { gte: startOfDay } } }),
    prisma.accessLog.count({ where: { status: 'GRANTED' } }),
    prisma.accessLog.count({ where: { status: { not: 'GRANTED' } } }),
    prisma.authorizedPerson.count(),
  ]);

  return NextResponse.json({ today, granted, denied, persons });
}
