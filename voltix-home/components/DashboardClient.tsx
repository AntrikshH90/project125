'use client';
import { useState, useMemo, useEffect } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { MarqueeTicker } from '@/components/MarqueeTicker';
import { StatsRow } from '@/components/StatsRow';
import { ApplianceGrid, Appliance } from '@/components/ApplianceGrid';
import { GatePanel } from '@/components/GatePanel';
import { EnergyMeterWidget } from '@/components/EnergyMeterWidget';
import { EntryChart } from '@/components/EntryChart';
import { FlashingCenter } from '@/components/FlashingCenter';
import { RemoteAccessModal } from '@/components/RemoteAccessModal';
import { useVoltixSocket, AccessLogEntry } from '@/hooks/useVoltixSocket';

interface DashboardClientProps {
  initialAppliances: Appliance[];
  initialLogs: AccessLogEntry[];
}

export function DashboardClient({
  initialAppliances = [],
  initialLogs = [],
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [appliances, setAppliances] = useState<Appliance[]>(initialAppliances);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const { getSocket } = useVoltixSocket();

  useEffect(() => {
    const s = getSocket();
    const handleState = (e: { id: string; state: boolean }) => {
      setAppliances((prev) =>
        prev.map((a) => (a.id === e.id ? { ...a, currentState: e.state } : a))
      );
    };
    s.on('appliance:state', handleState);
    return () => {
      s.off('appliance:state', handleState);
    };
  }, [getSocket]);

  const { activeWatts, activeCount, onlineCount } = useMemo(() => {
    let watts = 0;
    let count = 0;
    let online = 0;
    appliances.forEach((a) => {
      if (a.online !== false) online++;
      if (a.currentState) {
        watts += a.powerWatts || 0;
        count++;
      }
    });
    return { activeWatts: watts, activeCount: count, onlineCount: online };
  }, [appliances]);

  return (
    <div className="min-h-screen bg-[#f5f6f6] text-[#020202] selection:bg-[#dae4af] selection:text-[#020202]">
      {/* Top Navbar with Anima Architectural Numbers */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeWatts={activeWatts}
        onlineCount={onlineCount}
        totalDevices={appliances.length}
        onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
      />

      {/* Running Marquee Ticker */}
      <MarqueeTicker />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-10 animate-fadeIn">
            {/* Master Hero Cover Section */}
            <HeroSection
              onSimulateClick={() => setActiveTab('gate')}
              onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
            />

            {/* Architectural Telemetry Metric Row */}
            <StatsRow activeAppliancesCount={activeCount} totalWatts={activeWatts} />

            {/* 8-Channel Appliance Hub */}
            <section className="space-y-4">
              <ApplianceGrid initialData={appliances} />
            </section>

            {/* Smart Gate & AI Vision Center */}
            <section className="space-y-4">
              <GatePanel initialLogs={initialLogs} />
            </section>

            {/* Power Telemetry & Expenditure Studio */}
            <EnergyMeterWidget appliances={appliances} />

            {/* 14-Day Activity Chart */}
            <section className="space-y-4">
              <EntryChart />
            </section>
          </div>
        )}

        {/* 8-RELAY APPLIANCE TAB */}
        {activeTab === 'appliances' && (
          <div className="space-y-8 animate-fadeIn">
            <ApplianceGrid initialData={appliances} />
            <EnergyMeterWidget appliances={appliances} />
          </div>
        )}

        {/* GATE & VISION TAB */}
        {activeTab === 'gate' && (
          <div className="space-y-8 animate-fadeIn">
            <GatePanel initialLogs={initialLogs} />
            <EntryChart />
          </div>
        )}

        {/* ENERGY & STATS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            <StatsRow activeAppliancesCount={activeCount} totalWatts={activeWatts} />
            <EnergyMeterWidget appliances={appliances} />
            <EntryChart />
          </div>
        )}

        {/* ESP32 FLASHING & CODE TAB */}
        {activeTab === 'flashing' && (
          <div className="space-y-8 animate-fadeIn">
            <FlashingCenter />
          </div>
        )}
      </main>

      {/* Remote 4G/5G Access Setup Modal */}
      <RemoteAccessModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
      />
    </div>
  );
}
