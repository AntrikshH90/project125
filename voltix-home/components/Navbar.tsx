'use client';
import { useState, useEffect } from 'react';
import {
  Zap,
  Radio,
  Clock,
  LayoutDashboard,
  Sliders,
  Video,
  BarChart3,
  Code2,
  Globe,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActiveTab = 'overview' | 'appliances' | 'gate' | 'analytics' | 'flashing';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeWatts: number;
  onlineCount: number;
  totalDevices: number;
  onOpenRemoteModal: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  activeWatts,
  onlineCount,
  totalDevices,
  onOpenRemoteModal,
}: NavbarProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview' as const, num: '001', label: 'Overview' },
    { id: 'appliances' as const, num: '002', label: '8-Channel Relays' },
    { id: 'gate' as const, num: '003', label: 'Gate Cam & AI' },
    { id: 'analytics' as const, num: '004', label: 'Power Analytics' },
    { id: 'flashing' as const, num: '005', label: 'Firmware & Pinout' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e6e6e6] bg-[#f5f6f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-8">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logotype */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#dae4af] text-[#020202] shadow-sm">
              <Zap className="h-5 w-5 fill-current" />
              <div className="corner-lines">
                <div className="corner-lines__top-left !bg-black/40" />
                <div className="corner-lines__bottom-right !bg-black/40" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-parabole text-2xl font-bold tracking-tight text-[#020202]">
                  VOLTIX
                </h1>
                <span className="font-mono-tag rounded-full bg-[#dae4af] px-2 py-0.5 text-[10px] text-[#020202] font-semibold">
                  STUDIO
                </span>
              </div>
              <p className="font-mono-tag text-[10px] text-[#808080]">
                8-Channel IoT & Gate Intelligence
              </p>
            </div>
          </div>

          {/* Micro Telemetry Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Live Watts */}
            <div className="flex items-center gap-1.5 rounded-full bg-white border border-[#e6e6e6] px-3 py-1 font-mono text-[11px] text-[#020202] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b] animate-pulse" />
              <span className="font-semibold">{activeWatts.toLocaleString()} W Active</span>
            </div>

            {/* MQTT Broker Status */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#dae4af]/40 border border-[#dae4af] px-3 py-1 font-mono text-[11px] text-[#020202]">
              <span className="h-2 w-2 rounded-full bg-[#8da036]" />
              <span>MQTT :1883</span>
            </div>

            {/* 4G/5G Remote Button */}
            <button
              onClick={onOpenRemoteModal}
              className="flex items-center gap-1.5 rounded-full bg-[#020202] text-[#ffffff] hover:bg-[#222222] px-3.5 py-1.5 font-mono text-[11px] transition shadow-sm"
            >
              <Globe className="h-3.5 w-3.5 text-[#dae4af] animate-pulse" />
              <span>4G/5G Remote</span>
            </button>

            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-white border border-[#e6e6e6] px-3 py-1 font-mono text-[11px] text-[#808080]">
              <Clock className="h-3 w-3" />
              <span>{time || '--:--:--'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs with Anima Architectural Numbers */}
        <nav className="flex space-x-1 overflow-x-auto border-t border-[#e6e6e6] pt-2 pb-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-[#020202] text-[#ffffff] shadow-md font-semibold'
                    : 'text-[#808080] hover:text-[#020202] hover:bg-white/60'
                )}
              >
                <span className={cn('text-[10px]', isActive ? 'text-[#dae4af]' : 'text-[#808080]')}>
                  {item.num}/
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
