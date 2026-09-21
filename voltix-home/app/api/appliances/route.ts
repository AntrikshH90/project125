import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBridge } from '@/lib/face-bridge';
import { env } from '@/lib/env';

export async function GET() {
  const appliances = await prisma.appliance.findMany({
    orderBy: [{ room: 'asc' }, { relayChannel: 'asc' }],
  });
  return NextResponse.json(appliances);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, room, powerWatts, currentState } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appliance ID required' }, { status: 400 });
    }

    const updated = await prisma.appliance.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(room !== undefined && { room }),
        ...(powerWatts !== undefined && { powerWatts: Number(powerWatts) }),
        ...(currentState !== undefined && { currentState: Boolean(currentState) }),
      },
    });

    try {
      const bridge = getBridge();
      if (currentState !== undefined) {
        bridge.io.emit('appliance:state', { id: updated.id, state: updated.currentState });
        bridge.publishGateSet({
          topic: `voltix/devices/${updated.deviceId}/set`,
          payload: {
            relay: updated.relayChannel,
            state: updated.currentState ? 'ON' : 'OFF',
            key: env.VOLTIX_DEVICE_KEY,
          },
        });
      }
    } catch (e) {
      // Bridge may not be initialized in non-server tests
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update appliance' }, { status: 500 });
  }
}