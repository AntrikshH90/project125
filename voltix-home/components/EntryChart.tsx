'use client';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface DayBucket {
  day: string;
  granted: number;
  denied: number;
}

export function EntryChart() {
  const { data = [] } = useQuery<DayBucket[]>({
    queryKey: ['entries-chart'],
    queryFn: () => fetch('/api/accesslogs/chart?days=14').then(r => r.json()),
    refetchInterval: 60_000,
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Access Activity Trends</h3>
          <p className="text-xs text-zinc-500">Authorized vs Denied scans (Last 14 Days)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            Granted
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
            Denied
          </span>
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 12,
                color: '#f4f4f5',
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Bar dataKey="granted" name="Granted" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="denied" name="Denied" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
