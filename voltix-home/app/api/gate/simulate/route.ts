import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBridge } from '@/lib/face-bridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, personName } = body; // 'AUTHORIZED' | 'INTRUDER' | 'LOW_CONFIDENCE'

    let status = 'DENIED_UNKNOWN';
    let confidence = 0.32;
    let personId: string | null = null;
    let name = personName || 'Unknown Visitor';
    let snapshotUrl = '/snapshots/placeholder.jpg';

    if (scenario === 'AUTHORIZED') {
      status = 'GRANTED';
      confidence = 0.96;
      // Find an authorized person or use default
      const person = await prisma.authorizedPerson.findFirst({
        where: personName ? { name: { contains: personName } } : undefined,
      });
      if (person) {
        personId = person.id;
        name = person.name;
        snapshotUrl = person.referenceImagePath || '/snapshots/sample-authorized.jpg';
      } else {
        name = personName || 'Antriksh (Homeowner)';
      }
    } else if (scenario === 'LOW_CONFIDENCE') {
      status = 'DENIED_LOW_CONFIDENCE';
      confidence = 0.74;
    } else {
      status = 'DENIED_UNKNOWN';
      confidence = 0.28;
    }

    const log = await prisma.accessLog.create({
      data: {
        personId,
        status,
        confidence,
        snapshotUrl,
        triggerSource: 'FACE_SCAN_SIMULATION',
      },
      include: { person: true },
    });

    try {
      const bridge = getBridge();
      bridge.io.emit('access:newlog', {
        ...log,
        timestamp: log.timestamp.toISOString(),
        person: log.person ? { name: log.person.name } : (status === 'GRANTED' ? { name } : null),
      });

      if (status === 'GRANTED') {
        bridge.publishGateAuthorize({
          decision: 'GRANTED',
          person: name,
          confidence,
          snapshot: snapshotUrl,
        });
      }
    } catch (e) {
      console.warn('Bridge emit skipped:', e);
    }

    return NextResponse.json({ success: true, log, name, status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Simulation failed' }, { status: 500 });
  }
}
