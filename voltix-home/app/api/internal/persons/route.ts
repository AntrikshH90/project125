import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (req.headers.get('x-voltix-key') !== process.env.VOLTIX_DEVICE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const persons = await prisma.authorizedPerson.findMany({
    select: { id: true, name: true, embedding: true },
  });
  return NextResponse.json(persons);
}