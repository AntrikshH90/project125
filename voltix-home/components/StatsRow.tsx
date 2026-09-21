'use client';
import { useQuery } from '@tanstack/react-query';
import { Users, DoorOpen, ShieldAlert, Zap } from 'lucide-react';
import { useVoltixSocket } from '@/hooks/useVoltixSocket';

interface Stats {
  today: number;
  granted: number;
  denied: number;
  persons: number;
}

interface StatsRowProps {
  activeAppliancesCount?: number;
  totalWatts?: number;
}

export function StatsRow({ activeAppliancesCount = 0, totalWatts = 0 }: StatsRowProps) {
  const { lastLog } = useVoltixSocket();
  const { data } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/accesslogs/stats').then((r) => r.json()),
    refetchInterval: 15_000,
  });

  const base = data ?? { today: 0, granted: 0, denied: 0, persons: 0 };
  const stats = {
    ...base,
    ...(lastLog?.status === 'GRANTED'
      ? { today: base.today + 1, granted: base.granted + 1 }
      : lastLog
      ? { today: base.today + 1, denied: base.denied + 1 }
      : {}),
  };

  const cards = [
    {
      num: '01',
      icon: DoorOpen,
      label: 'Gate Entries Today',
      value: stats.today,
      sub: `${stats.granted} authorized visits`,
    },
    {
      num: '02',
      icon: Zap,
      label: 'Live Power Draw',
      value: `${totalWatts.toLocaleString()} W`,
      sub: `${activeAppliancesCount} appliances ON`,
      highlight: true,
    },
    {
      num: '03',
      icon: Users,
      label: 'Authorized Faces',
      value: stats.persons,
      sub: 'Biometric AI registry',
    },
    {
      num: '04',
      icon: ShieldAlert,
      label: 'Security Flags',
      value: stats.denied,
      sub: 'Unknown / denied visitors',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="anima-panel flex flex-col justify-between relative overflow-hidden"
        >
          <div className="corner-lines">
            <div className="corner-lines__top-left" />
            <div className="corner-lines__top-right" />
            <div className="corner-lines__bottom-left" />
            <div className="corner-lines__bottom-right" />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono-tag text-[10px] text-[#808080]">
              {c.num} &middot; TELEMETRY
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f6f6] border border-[#e6e6e6] text-[#020202]">
              <c.icon className="h-4 w-4" />
            </div>
          </div>

          <p className="mt-3 font-parabole text-3xl sm:text-4xl font-bold tracking-tight text-[#020202]">
            {c.value}
          </p>

          <div className="mt-2 flex flex-col border-t border-[#f0f0f0] pt-2">
            <span className="text-xs font-bold text-[#020202]">{c.label}</span>
            <span className="text-[11px] text-[#808080] font-mono">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
