import type { Server as SocketIOServer } from 'socket.io';
import type { PrismaClient } from '@prisma/client';

export interface FaceResultPayload {
  decision: 'GRANTED' | 'DENIED_UNKNOWN' | 'DENIED_LOW_CONFIDENCE';
  personId?: string | null;
  personName?: string | null;
  confidence: number;
  snapshot: string;
}

export type Bridge = {
  io: SocketIOServer;
  prisma: PrismaClient;
  publishGateAuthorize: (p: Record<string, unknown>) => void;
  publishGateSet: (p: Record<string, unknown>) => void;
};

/**
 * server.ts registers itself here at boot; API routes consume it.
 * Survives HMR via globalThis.
 */
const g = globalThis as unknown as { __voltixBridge?: Bridge };

export function registerBridge(b: Bridge) {
  g.__voltixBridge = b;
}

export function getBridge(): Bridge {
  if (!g.__voltixBridge) {
    throw new Error('Voltix bridge not initialized — is server.ts running?');
  }
  return g.__voltixBridge;
}

/**
 * Full face-result pipeline, callable from the internal REST route:
 * persist log → emit socket → publish MQTT gate authorize on grant.
 */
export async function handleFaceResult(r: FaceResultPayload) {
  const { io, prisma, publishGateAuthorize } = getBridge();

  await prisma.accessLog.create({
    data: {
      personId: r.decision === 'GRANTED' && r.personId ? r.personId : null,
      status: r.decision,
      confidence: r.confidence,
      snapshotUrl: r.snapshot,
      triggerSource: 'FACE_SCAN',
    },
  });

  const log = await prisma.accessLog.findFirst({
    orderBy: { timestamp: 'desc' },
    include: { person: true },
  });
  io.emit('access:newlog', log); // real-time table sync (<50ms)

  if (r.decision === 'GRANTED') {
    publishGateAuthorize({
      decision: 'GRANTED',
      person: r.personName ?? '',
      confidence: r.confidence,
      snapshot: r.snapshot,
    });
  }
}
