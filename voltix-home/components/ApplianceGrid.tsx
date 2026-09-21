'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Power,
  Clock,
  Settings2,
  Wind,
  Flame,
  Lightbulb,
  Tv,
  Fan,
  Box,
  Warehouse,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { useVoltixSocket, ApplianceState } from '@/hooks/useVoltixSocket';
import { cn } from '@/lib/utils';

export interface Appliance {
  id: string;
  deviceId: string;
  relayChannel: number;
  name: string;
  room: string;
  currentState: boolean;
  online: boolean;
  powerWatts: number;
}

interface ApplianceGridProps {
  initialData?: Appliance[];
}

export function ApplianceGrid({ initialData = [] }: ApplianceGridProps) {
  const { getSocket, setOptimistic } = useVoltixSocket();
  const [appliances, setAppliances] = useState<Appliance[]>(initialData);
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);

  // Sync initialData
  useEffect(() => {
    if (initialData.length > 0) {
      setAppliances(initialData);
    }
  }, [initialData]);

  // Listen for socket events
  useEffect(() => {
    const s = getSocket();
    const handleState = (e: ApplianceState) => {
      setAppliances((prev) =>
        prev.map((a) => (a.id === e.id ? { ...a, currentState: e.state, online: true } : a))
      );
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(e.id);
        return next;
      });
    };

    s.on('appliance:state', handleState);
    return () => {
      s.off('appliance:state', handleState);
    };
  }, [getSocket]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        const updated: Record<string, number> = {};
        Object.entries(prev).forEach(([appId, secondsLeft]) => {
          if (secondsLeft > 1) {
            updated[appId] = secondsLeft - 1;
          } else {
            const target = appliances.find((a) => a.id === appId);
            if (target && target.currentState) {
              toggleAppliance(target);
            }
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [appliances]);

  const toggleAppliance = useCallback(
    (appliance: Appliance) => {
      const nextState = !appliance.currentState;
      setAppliances((prev) =>
        prev.map((a) => (a.id === appliance.id ? { ...a, currentState: nextState } : a))
      );
      setOptimistic((p) => ({ ...p, [appliance.id]: nextState }));
      setPendingToggles((prev) => new Set(prev).add(appliance.id));

      getSocket().emit('appliance:set', { id: appliance.id, state: nextState });

      if (!nextState) {
        setActiveTimers((prev) => {
          const n = { ...prev };
          delete n[appliance.id];
          return n;
        });
      }

      setTimeout(() => {
        setPendingToggles((prev) => {
          const n = new Set(prev);
          n.delete(appliance.id);
          return n;
        });
      }, 1200);
    },
    [getSocket, setOptimistic]
  );

  const setTimerForAppliance = (appId: string, minutes: number) => {
    if (minutes <= 0) {
      setActiveTimers((prev) => {
        const n = { ...prev };
        delete n[appId];
        return n;
      });
      return;
    }
    setActiveTimers((prev) => ({ ...prev, [appId]: minutes * 60 }));
  };

  const handleSaveEdit = async (updated: Partial<Appliance>) => {
    if (!editingAppliance) return;
    try {
      const res = await fetch('/api/appliances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAppliance.id, ...updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppliances((prev) => prev.map((a) => (a.id === data.id ? { ...a, ...data } : a)));
        setEditingAppliance(null);
      }
    } catch (e) {
      console.error('Failed to update appliance', e);
    }
  };

  const allRooms = ['ALL', ...Array.from(new Set(appliances.map((a) => a.room)))];

  const filteredAppliances =
    selectedRoom === 'ALL'
      ? appliances
      : appliances.filter((a) => a.room === selectedRoom);

  return (
    <div className="space-y-6">
      {/* Section Header with Anima Architectural Number */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e6e6e6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tag text-[#808080]">002/</span>
            <h2 className="font-parabole text-2xl sm:text-3xl font-bold text-[#020202]">
              8-Channel Appliance Control
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#575757] font-light mt-1">
            Tactile cloud relay control with hardware auto-off timers & power metering
          </p>
        </div>

        {/* Room Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {allRooms.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-medium transition-all whitespace-nowrap',
                selectedRoom === room
                  ? 'bg-[#020202] text-[#ffffff] shadow-sm'
                  : 'bg-white border border-[#e6e6e6] text-[#575757] hover:border-[#020202]'
              )}
            >
              {room.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 8-Channel Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredAppliances.map((appliance) => (
          <ApplianceCard
            key={appliance.id}
            appliance={appliance}
            isPending={pendingToggles.has(appliance.id)}
            remainingSeconds={activeTimers[appliance.id]}
            onToggle={toggleAppliance}
            onSetTimer={setTimerForAppliance}
            onEdit={() => setEditingAppliance(appliance)}
          />
        ))}
      </div>

      {/* Edit Appliance Modal */}
      <AnimatePresence>
        {editingAppliance && (
          <EditApplianceModal
            appliance={editingAppliance}
            onClose={() => setEditingAppliance(null)}
            onSave={handleSaveEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================= */
/* Single Appliance Card (Anima Venture Style)                              */
/* ========================================================================= */
function ApplianceCard({
  appliance,
  isPending,
  remainingSeconds,
  onToggle,
  onSetTimer,
  onEdit,
}: {
  appliance: Appliance;
  isPending: boolean;
  remainingSeconds?: number;
  onToggle: (a: Appliance) => void;
  onSetTimer: (id: string, mins: number) => void;
  onEdit: () => void;
}) {
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const isOn = appliance.currentState;

  const getApplianceIcon = () => {
    const name = appliance.name.toLowerCase();
    const room = appliance.room.toLowerCase();

    if (name.includes('ac') || name.includes('air')) {
      return <Wind className="h-5 w-5" />;
    }
    if (name.includes('water') || name.includes('heater') || name.includes('geyser')) {
      return <Flame className="h-5 w-5" />;
    }
    if (name.includes('tv') || name.includes('media')) {
      return <Tv className="h-5 w-5" />;
    }
    if (name.includes('fan')) {
      return <Fan className={cn('h-5 w-5 transition-transform duration-1000', isOn && 'animate-spin')} />;
    }
    if (name.includes('fridge') || name.includes('oven')) {
      return <Box className="h-5 w-5" />;
    }
    if (room.includes('garage')) {
      return <Warehouse className="h-5 w-5" />;
    }
    return <Lightbulb className="h-5 w-5" />;
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={cn(
        'anima-panel flex flex-col justify-between transition-all duration-300 relative overflow-hidden',
        isOn
          ? 'bg-white border-[#bed06c] shadow-lg ring-1 ring-[#dae4af]'
          : 'bg-[#ffffff] border-[#e6e6e6]'
      )}
    >
      {/* Corner Lines Marker */}
      <div className="corner-lines">
        <div className="corner-lines__top-left" />
        <div className="corner-lines__top-right" />
        <div className="corner-lines__bottom-left" />
        <div className="corner-lines__bottom-right" />
      </div>

      <div>
        {/* Top Channel Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                isOn
                  ? 'bg-[#dae4af] text-[#020202]'
                  : 'bg-[#f5f6f6] text-[#808080]'
              )}
            >
              {getApplianceIcon()}
            </div>
            <div>
              <span className="font-mono-tag text-[10px] text-[#808080]">
                CH {appliance.relayChannel + 1} &middot; {appliance.room.replace('_', ' ')}
              </span>
              <h4 className="font-sans text-sm font-bold text-[#020202] truncate max-w-[130px]">
                {appliance.name}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              title="Set Auto-Off Timer"
              className={cn(
                'rounded-lg p-1.5 transition text-[#808080] hover:text-[#020202] hover:bg-[#f0f0f0]',
                remainingSeconds ? 'text-[#a76c07] bg-[#ffc687]/30' : ''
              )}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onEdit}
              title="Edit Channel Settings"
              className="rounded-lg p-1.5 transition text-[#808080] hover:text-[#020202] hover:bg-[#f0f0f0]"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Timer countdown banner */}
        {remainingSeconds !== undefined && remainingSeconds > 0 && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#ffc687]/20 border border-[#ffc687] px-2.5 py-1 text-[11px] text-[#7f5305] font-mono">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 animate-pulse" /> Auto-Off:
            </span>
            <span className="font-bold">{formatTimer(remainingSeconds)}</span>
          </div>
        )}

        {/* Timer Popover */}
        {showTimerMenu && (
          <div className="mt-2 rounded-xl bg-white border border-[#e6e6e6] p-2.5 text-xs shadow-xl space-y-2 z-20">
            <div className="flex items-center justify-between text-[11px] text-[#808080] px-1 font-semibold">
              <span>Auto-Off Timer</span>
              <button onClick={() => setShowTimerMenu(false)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    onSetTimer(appliance.id, mins);
                    setShowTimerMenu(false);
                  }}
                  className="rounded-lg bg-[#f5f6f6] hover:bg-[#dae4af] text-[#020202] py-1.5 text-[10px] font-mono transition"
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
            {remainingSeconds && (
              <button
                onClick={() => {
                  onSetTimer(appliance.id, 0);
                  setShowTimerMenu(false);
                }}
                className="w-full text-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 py-1 text-[10px] transition font-semibold"
              >
                Cancel Timer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Switch Row */}
      <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 font-mono text-xs">
            <Zap className={cn('h-3.5 w-3.5', isOn ? 'text-[#8da036]' : 'text-[#808080]')} />
            <span className={cn('font-bold', isOn ? 'text-[#020202]' : 'text-[#808080]')}>
              {isOn ? `${appliance.powerWatts} W` : '0 W'}
            </span>
          </div>
          <span className="text-[10px] text-[#808080] font-mono">
            {appliance.powerWatts}W rated
          </span>
        </div>

        {/* Anima Tactile Switch Button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onToggle(appliance)}
          disabled={isPending}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono font-bold transition-all shadow-sm',
            isOn
              ? 'bg-[#dae4af] text-[#020202] hover:bg-[#cddb9b]'
              : 'bg-[#f0f0f0] text-[#808080] hover:bg-[#e6e6e6] hover:text-[#020202]'
          )}
        >
          <Power className="h-3.5 w-3.5" />
          <span>{isOn ? 'ON' : 'OFF'}</span>
        </motion.button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Edit Appliance Modal                                                      */
/* ========================================================================= */
function EditApplianceModal({
  appliance,
  onClose,
  onSave,
}: {
  appliance: Appliance;
  onClose: () => void;
  onSave: (data: Partial<Appliance>) => void;
}) {
  const [name, setName] = useState(appliance.name);
  const [room, setRoom] = useState(appliance.room);
  const [powerWatts, setPowerWatts] = useState(appliance.powerWatts);

  const rooms = ['LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'GARAGE', 'OUTDOOR'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-[#e6e6e6] bg-white p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#020202]" />
            <h3 className="font-parabole text-lg font-bold text-[#020202]">
              Configure Relay Channel {appliance.relayChannel + 1}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#808080] hover:text-[#020202]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Appliance Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="anima-field w-full"
            />
          </div>

          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Room Location</label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="anima-field w-full bg-white cursor-pointer"
            >
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#575757] mb-1 font-mono-tag">Rated Load (Watts)</label>
            <input
              type="number"
              value={powerWatts}
              onChange={(e) => setPowerWatts(Number(e.target.value))}
              className="anima-field w-full font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#e6e6e6]">
          <button onClick={onClose} className="anima-btn-secondary text-xs">
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, room, powerWatts })}
            className="anima-btn-primary text-xs"
          >
            <div className="btn-body">
              <span>Save Changes</span>
            </div>
            <div className="btn-icon-box">
              <Check className="h-4 w-4 text-[#020202]" />
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}