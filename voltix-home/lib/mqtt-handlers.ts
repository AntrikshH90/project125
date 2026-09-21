import type Aedes from 'aedes';
import type { PrismaClient } from '@prisma/client';

interface DeviceStatePayload {
  deviceId: string;
  relay: number;        // 0–7 channel that changed
  state: 'ON' | 'OFF';
  rssi?: number;
  uptime?: number;
  ip?: string;
}

export interface GateDecision {
  decision: 'GRANTED' | 'DENIED_UNKNOWN' | 'DENIED_LOW_CONFIDENCE';
  person?: string;
  confidence?: number;
  snapshot: string; // public path of captured frame (set by face engine)
}

/** Confidence floor before we actuate the gate. */
const CONFIDENCE_THRESHOLD = 0.82;

let handleFaceRecognitionFn: ((decision: Omit<GateDecision, 'decision'> & { decision?: string; embedMatchId?: string | null }) => void) | null = null;

export function registerMqttHandlers(ctx: {
  aedes: Aedes;
  io: import('socket.io').Server;
  secretKey: string;
  prisma: PrismaClient;
  publishGateAuthorize: (d: GateDecision) => void;
}) {
  const { aedes, io, secretKey, prisma, publishGateAuthorize } = ctx;

  /**
   * Full event stream from devices. Route by topic:
   *   voltix/devices/{deviceId}/state  → persist Appliance state, broadcast to UI
   *   voltix/devices/{deviceId}/online → online/offline heartbeat (retained LWT)
   */
  aedes.subscribe('voltix/#', (packet, done) => {
    (async () => {
      try {
        const topic = packet.topic;

      /* ---- Appliance state reports ---- */
      const stateMatch = topic.match(/^voltix\/devices\/([^/]+)\/state$/);
      if (stateMatch && packet.payload.length > 0) {
        const data = JSON.parse(packet.payload.toString()) as DeviceStatePayload;
        // Map channel -> appliance row (unique composite deviceId+channel).
        const appliance = await prisma.appliance.findUnique({
          where: { deviceId_relayChannel: { deviceId: data.deviceId, relayChannel: data.relay } },
        });
        if (appliance) {
          await prisma.appliance.update({
            where: { id: appliance.id },
            data: { currentState: data.state === 'ON', online: true },
          });
          io.emit('appliance:state', { id: appliance.id, state: data.state === 'ON' });
        }
      }

      /* ---- Online / offline heartbeat ---- */
      const onlineMatch = topic.match(/^voltix\/devices\/([^/]+)\/online$/);
      if (onlineMatch) {
        const online = packet.payload.length === 0 || JSON.parse(packet.payload.toString()).online;
        await prisma.appliance.updateMany({ where: { deviceId: onlineMatch[1] }, data: { online } });
        io.emit('device:lwt', { deviceId: onlineMatch[1], online });
      }

        done();
      } catch (err) {
        console.error('[mqtt] handler error:', err);
        done();
      }
    })();
  }, () => {});

  /** Called by the Face Engine bridge after comparing embeddings. */
  handleFaceRecognitionFn = async function handleFaceRecognition(decision: Omit<GateDecision, 'decision'> & { decision?: string; embedMatchId?: string | null }) {
    try {
      let granted =
        decision.embedMatchId != null &&
        (decision.confidence ?? 0) >= CONFIDENCE_THRESHOLD;

      const status = granted
        ? 'GRANTED'
        : decision.confidence! >= CONFIDENCE_THRESHOLD - 0.05
        ? 'DENIED_LOW_CONFIDENCE'
        : 'DENIED_UNKNOWN';

      if (granted) {
        publishGateAuthorize({ ...decision, decision: 'GRANTED' } as GateDecision);
      }

      await prisma.accessLog.create({
        data: {
          personId: granted ? decision.embedMatchId! : null,
          status,
          confidence: decision.confidence ?? 0,
          snapshotUrl: decision.snapshot,
          triggerSource: 'FACE_SCAN',
        },
      });

      // Real-time dashboard sync of the new log entry.
      const log = await prisma.accessLog.findFirst({
        orderBy: { timestamp: 'desc' },
        include: { person: true },
      });
      io.emit('access:newlog', log);
    } catch (error) {
      console.error('[mqtt] face recognition handler error:', error);
    }
  };
}

export function getHandleFaceRecognition() {
  return handleFaceRecognitionFn;
}