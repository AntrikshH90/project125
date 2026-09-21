import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function escapeCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    const logs = await prisma.accessLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: { person: true },
    });

    const header = 'Timestamp,Person,Status,Confidence,Trigger Source,Snapshot URL\n';
    const rows = logs.map((l) =>
      [
        l.timestamp.toISOString(),
        l.person?.name ?? 'UNKNOWN',
        l.status,
        (l.confidence * 100).toFixed(0) + '%',
        l.triggerSource || 'FACE_SCAN',
        l.snapshotUrl,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = header + rows.join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="voltix-access-logs-${Date.now()}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('CSV export error:', error);
    const fallback = 'Timestamp,Person,Status,Confidence,Trigger Source,Snapshot URL\n';
    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="voltix-access-logs-${Date.now()}.csv"`,
      },
    });
  }
}