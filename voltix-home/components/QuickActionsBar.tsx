'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Home, LockOpen, Sparkles, Loader2, CheckCircle2, Zap, Radio } from 'lucide-react';
import { getSocket } from '@/hooks/useVoltixSocket';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  onSimulateClick?: () => void;
  onOpenRemoteModal?: () => void;
}

export function QuickActionsBar({ onSimulateClick, onOpenRemoteModal }: QuickActionsBarProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);
  const [gateCountdown, setGateCountdown] = useState<number | null>(null);

  const triggerAction = (actionKey: string, fn: () => void) => {
    setLoadingAction(actionKey);
    try {
      fn();
      setLoadingAction(null);
      setSuccessAction(actionKey);
      setTimeout(() => setSuccessAction(null), 2500);
    } catch (e) {
      setLoadingAction(null);
    }
  };

  const handleLeaveHome = () => {
    triggerAction('leave', () => {
      getSocket().emit('appliance:batch', { action: 'ALL_OFF' });
    });
  };

  const handleArriveHome = () => {
    triggerAction('arrive', () => {
      getSocket().emit('appliance:batch', { action: 'HOME_MODE' });
    });
  };

  const handleGateUnlock = () => {
    triggerAction('gate', () => {
      getSocket().emit('gate:override');
      setGateCountdown(10);
      const interval = setInterval(() => {
        setGateCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });
  };

  return (
    <div className="anima-card p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-primary">Quick Routines</span>
            <h2 className="card-title-editorial text-base sm:text-lg text-neutral-100">
              Master Home Automations
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            1-Click routines when rushing out or controlling via 4G/5G mobile data
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
          {/* Rush Out / Leave Home */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLeaveHome}
            disabled={loadingAction !== null}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border shadow-lg',
              successAction === 'leave'
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                : 'bg-error/15 hover:bg-error/25 border-error/30 text-error shadow-glow-error'
            )}
          >
            {loadingAction === 'leave' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : successAction === 'leave' ? (
              <CheckCircle2 className="h-4 w-4 text-primary-400" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>{successAction === 'leave' ? 'All Turned OFF' : "Leaving Home (Turn All OFF)"}</span>
          </motion.button>

          {/* Arrived Home */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleArriveHome}
            disabled={loadingAction !== null}
            className="btn-primary flex items-center justify-center gap-2 text-xs"
          >
            {loadingAction === 'arrive' ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
            ) : (
              <Home className="h-4 w-4 text-neutral-950" />
            )}
            <span>Arrive Home</span>
          </motion.button>

          {/* Remote Gate Unlock with Countdown */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGateUnlock}
            disabled={gateCountdown !== null}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border shadow-md',
              gateCountdown !== null
                ? 'bg-accent-500/20 border-accent-500/50 text-accent-300 animate-pulse'
                : 'btn-secondary text-neutral-200'
            )}
          >
            <LockOpen className="h-4 w-4 text-accent-400" />
            <span>
              {gateCountdown !== null ? `Gate Open (${gateCountdown}s)` : 'Unlock Gate (10s)'}
            </span>
          </motion.button>

          {/* Remote 4G/5G Trigger */}
          {onOpenRemoteModal && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOpenRemoteModal}
              className="btn-outline flex items-center justify-center gap-1.5 text-xs"
            >
              <Radio className="h-4 w-4" />
              <span>4G/5G Cellular</span>
            </motion.button>
          )}

          {/* Test Simulator Button */}
          {onSimulateClick && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onSimulateClick}
              className="btn-secondary flex items-center justify-center gap-1.5 text-xs text-primary-300"
            >
              <Zap className="h-4 w-4 text-primary-400" />
              <span>Face Scan</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
