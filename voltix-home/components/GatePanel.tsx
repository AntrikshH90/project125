'use client';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LockOpen,
  Lock,
  Download,
  Users,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Search,
  CheckCircle2,
  Video,
  ScanFace,
  Loader2,
  Plus,
} from 'lucide-react';
import { useVoltixSocket, AccessLogEntry } from '@/hooks/useVoltixSocket';
import { AuthorizedPersonsModal } from '@/components/AuthorizedPersonsModal';
import { cn } from '@/lib/utils';

interface GatePanelProps {
  initialLogs?: AccessLogEntry[];
}

export function GatePanel({ initialLogs = [] }: GatePanelProps) {
  const { getSocket, logs: socketLogs } = useVoltixSocket();
  const [logs, setLogs] = useState<AccessLogEntry[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPersonsModalOpen, setIsPersonsModalOpen] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [gateTimer, setGateTimer] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const feedRef = useRef<HTMLImageElement>(null);

  const handleDownloadCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/accesslogs/export');
      if (!res.ok) throw new Error('Export request failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voltix-access-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      const a = document.createElement('a');
      a.href = '/api/accesslogs/export';
      a.download = `voltix-access-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync socket logs
  useEffect(() => {
    if (socketLogs.length > 0) {
      setLogs((prev) => {
        const ids = new Set(socketLogs.map((l) => l.id));
        const remaining = prev.filter((p) => !ids.has(p.id));
        return [...socketLogs, ...remaining].slice(0, 100);
      });
    }
  }, [socketLogs]);

  const handleManualOverride = () => {
    getSocket().emit('gate:override');
    triggerGateUnlockAnimation();
  };

  const triggerGateUnlockAnimation = () => {
    setGateUnlocked(true);
    setGateTimer(6);
    const interval = setInterval(() => {
      setGateTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setGateUnlocked(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSimulate = async (scenario: 'AUTHORIZED' | 'INTRUDER' | 'LOW_CONFIDENCE', personName?: string) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/gate/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, personName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'GRANTED') {
          triggerGateUnlockAnimation();
        }
      }
    } catch (e) {
      console.error('Simulation error', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.person?.name || 'Unknown Person').toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'GRANTED' && log.status === 'GRANTED') ||
      (filterStatus === 'DENIED' && log.status !== 'GRANTED');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Section Header with Anima Architectural Number */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e6e6e6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tag text-[#808080]">003/</span>
            <h2 className="font-parabole text-2xl sm:text-3xl font-bold text-[#020202]">
              Gate Cam & AI Face Security
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#575757] font-light mt-1">
            Real-time biometric verification with automated solenoid unlock & continuous CSV logging
          </p>
        </div>

        {/* Live Simulation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSimulate('AUTHORIZED', 'Antriksh (Owner)')}
            disabled={isSimulating}
            className="anima-btn-primary !h-10 text-xs"
          >
            <div className="btn-body">
              <span>Simulate Owner (Antriksh)</span>
            </div>
            <div className="btn-icon-box !w-10">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </button>

          <button
            onClick={() => handleSimulate('INTRUDER')}
            disabled={isSimulating}
            className="anima-btn-secondary !h-10 text-xs text-red-600 border-red-200 hover:border-red-600"
          >
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            <span>Simulate Intruder</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Camera Viewport + Live Access Log Stream */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Live Camera & Solenoid Control (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#e6e6e6] bg-[#020202] aspect-video flex items-center justify-center shadow-lg">
            {/* Live Camera Stream */}
            <img
              ref={feedRef}
              src="/api/cam/stream"
              alt="Gate Camera Feed"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Corner Lines Marker */}
            <div className="corner-lines">
              <div className="corner-lines__top-left !bg-white/40" />
              <div className="corner-lines__top-right !bg-white/40" />
              <div className="corner-lines__bottom-left !bg-white/40" />
              <div className="corner-lines__bottom-right !bg-white/40" />
            </div>

            {/* Nature-inspired Security HUD Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none bg-gradient-to-t from-black/85 via-transparent to-black/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full bg-black/60 border border-white/20 px-2.5 py-1 text-[10px] text-white font-mono backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-[#dae4af] animate-ping" />
                  <span>GATE CAM // OV2640</span>
                </div>
                <div className="rounded-full bg-black/60 border border-white/10 px-2.5 py-1 text-[10px] font-mono text-neutral-400">
                  1080P // 30 FPS
                </div>
              </div>

              {/* Center Graphic */}
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10">
                  <Video className="h-5 w-5 text-[#dae4af]" />
                  <span className="absolute inset-0 rounded-full border border-[#dae4af]/40 animate-ping" />
                </div>
                <p className="text-xs font-semibold text-white">
                  ESP32-CAM Stream Ready
                </p>
                <p className="text-[10px] text-neutral-400 font-mono">
                  http://gate-esp32-cam:81/stream
                </p>
              </div>

              {/* Bottom Gate Status */}
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-bold backdrop-blur-md border transition-all',
                    gateUnlocked
                      ? 'bg-[#ffc687] text-[#020202] border-[#ffc687] animate-pulse'
                      : 'bg-[#dae4af] text-[#020202] border-[#dae4af]'
                  )}
                >
                  {gateUnlocked ? (
                    <>
                      <LockOpen className="h-3.5 w-3.5" />
                      <span>SOLENOID UNLOCKED ({gateTimer}s)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>GATE LOCKED (ARMED)</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-white/70 font-mono">
                  GPIO 13
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleManualOverride}
              className={cn(
                'anima-btn-primary flex-1 !h-11',
                gateUnlocked && '!bg-[#ffc687]'
              )}
            >
              <div className={cn("btn-body flex-1 justify-center", gateUnlocked && "!bg-[#ffc687]")}>
                <span>{gateUnlocked ? `Gate Open (${gateTimer}s)` : 'Manual Override'}</span>
              </div>
              <div className={cn("btn-icon-box !w-11", gateUnlocked && "!bg-[#ffc687]")}>
                <LockOpen className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => setIsPersonsModalOpen(true)}
              className="anima-btn-secondary !h-11 flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" />
              <span>Face Registry</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={isExporting}
              title="Download Full CSV Report"
              className="anima-btn-secondary !h-11 flex items-center gap-1.5"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#576321]" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'CSV'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Access Stream & CSV Log Table (7 cols) */}
        <div className="lg:col-span-7 anima-panel p-5 flex flex-col justify-between">
          <div className="corner-lines">
            <div className="corner-lines__top-left" />
            <div className="corner-lines__top-right" />
            <div className="corner-lines__bottom-left" />
            <div className="corner-lines__bottom-right" />
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e6e6e6] pb-3">
              <div>
                <h3 className="font-parabole text-lg font-bold text-[#020202]">
                  Live Access Audit Stream
                </h3>
                <p className="text-xs text-[#808080] font-mono-tag">
                  Real-time face snapshots & continuous CSV sync
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {['ALL', 'GRANTED', 'DENIED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                      filterStatus === s
                        ? 'bg-[#020202] text-white'
                        : 'text-[#808080] hover:text-[#020202]'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mt-3 mb-3">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#808080]" />
              <input
                type="text"
                placeholder="Search visitor logs by name or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="anima-field w-full pl-9 !py-2 text-xs"
              />
            </div>
          </div>

          {/* Activity Stream List */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
            {filteredLogs.length === 0 ? (
              <div className="rounded-xl border border-[#e6e6e6] bg-[#f5f6f6] p-8 text-center text-xs text-[#808080]">
                No access logs found matching filter.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredLogs.map((log) => {
                  const isGranted = log.status === 'GRANTED';
                  return (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-3 transition-all',
                        isGranted
                          ? 'border-[#dae4af] bg-[#f7f9f0]'
                          : 'border-red-200 bg-red-50/50'
                      )}
                    >
                      {/* Avatar Snapshot */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-10 w-10 rounded-xl bg-neutral-200 border border-[#e6e6e6] overflow-hidden flex-shrink-0">
                          <img
                            src={log.snapshotUrl || '/snapshots/placeholder.jpg'}
                            alt="Snapshot"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#020202]">
                            {log.person?.name || 'Unknown Visitor'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#808080] font-mono">
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span>·</span>
                            <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span>·</span>
                            <span className="text-[#576321] font-bold">
                              conf {(log.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-mono font-bold border tracking-wider',
                            isGranted
                              ? 'bg-[#dae4af] text-[#020202] border-[#bed06c]'
                              : 'bg-red-100 text-red-700 border-red-200'
                          )}
                        >
                          {isGranted ? 'AUTHORIZED' : 'DENIED'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Bottom Export Summary */}
          <div className="mt-4 pt-3 border-t border-[#e6e6e6] flex items-center justify-between text-xs text-[#808080] font-mono">
            <span>Logged {logs.length} events in local CSV</span>
            <button
              onClick={handleDownloadCsv}
              disabled={isExporting}
              className="text-[#020202] underline font-bold flex items-center gap-1 hover:text-[#576321] disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#576321]" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? 'Generating...' : 'Download .CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Face Registry Modal */}
      <AuthorizedPersonsModal
        isOpen={isPersonsModalOpen}
        onClose={() => setIsPersonsModalOpen(false)}
      />
    </div>
  );
}