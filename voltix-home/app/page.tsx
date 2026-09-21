import { prisma } from '@/lib/prisma';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [appliances, recentLogs] = await Promise.all([
    prisma.appliance.findMany({
      orderBy: [{ room: 'asc' }, { relayChannel: 'asc' }],
    }),
    prisma.accessLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: { person: true },
    }),
  ]);

  const serializedLogs = recentLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    status: log.status,
    confidence: log.confidence,
    snapshotUrl: log.snapshotUrl,
    person: log.person ? { name: log.person.name } : null,
  }));

  return (
    <DashboardClient
      initialAppliances={appliances}
      initialLogs={serializedLogs}
    />
  );
}