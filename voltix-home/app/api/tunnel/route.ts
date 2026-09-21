import { NextResponse } from 'next/server';
import { getTunnelState, startCloudflareTunnel, stopTunnel } from '@/lib/tunnel-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = getTunnelState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve tunnel state' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'start';

    if (action === 'start') {
      const state = await startCloudflareTunnel(3000);
      return NextResponse.json(state);
    } else if (action === 'stop') {
      const state = stopTunnel();
      return NextResponse.json(state);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tunnel operation failed' },
      { status: 500 }
    );
  }
}
