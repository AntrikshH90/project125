'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Home, LockOpen, Sparkles, Loader2, CheckCircle2, Plus, ArrowUpRight, Radio } from 'lucide-react';
import { getSocket } from '@/hooks/useVoltixSocket';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onSimulateClick?: () => void;
  onOpenRemoteModal?: () => void;
}

export function HeroSection({ onSimulateClick, onOpenRemoteModal }: HeroSectionProps) {
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
    <section className="relative overflow-hidden rounded-[2rem] bg-[#e7ebea] border border-[#e6e6e6] p-6 sm:p-12 shadow-sm">
      {/* Background Organic Blurred Ellipse & Noise Texture */}
      <img
        src="/images/white-blurred-ellipse-background.webp"
        alt="Ambient Glow"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-80 select-none"
      />
      <div className="noise absolute inset-0 opacity-20 pointer-events-none select-none" />

      {/* Floating Anima Architectural Tags */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="relative px-3 py-1 font-mono-tag border border-black/15 bg-white/70 backdrop-blur-md rounded-lg text-[#020202]">
            <div className="corner-lines">
              <div className="corner-lines__top-left" />
              <div className="corner-lines__bottom-right" />
            </div>
            <span>001/ Master Routines</span>
          </div>

          <div className="relative px-3 py-1 font-mono-tag border border-black/15 bg-white/70 backdrop-blur-md rounded-lg text-[#020202] hidden sm:block">
            <div className="corner-lines">
              <div className="corner-lines__top-left" />
              <div className="corner-lines__bottom-right" />
            </div>
            <span>Self-Hosted Sinric Pro Alternative</span>
          </div>

          <div className="relative px-3 py-1 font-mono-tag border border-black/15 bg-[#dae4af] rounded-lg text-[#020202] font-bold">
            <span>0ms Latency</span>
          </div>
        </div>

        {/* Large Parabole Headline */}
        <div className="space-y-2 max-w-4xl">
          <h1 className="font-parabole text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#020202]">
            Growing intelligent spaces.
          </h1>
          <p className="text-sm sm:text-lg text-[#575757] font-light max-w-2xl mx-auto leading-relaxed">
            Direct 8-channel microcontroller control, automated gate vision intelligence, and instant remote accessibility when you are away on 4G/5G mobile data.
          </p>
        </div>

        {/* Anima Authentic Pill Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* Master Leave Home (Turn All OFF) */}
          <button
            onClick={handleLeaveHome}
            disabled={loadingAction !== null}
            className="anima-btn-primary group"
          >
            <div className={cn(
              "btn-body !bg-[#ffc687] text-[#020202]",
              successAction === 'leave' && '!bg-[#dae4af]'
            )}>
              {loadingAction === 'leave' ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </span>
              ) : successAction === 'leave' ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#8da036]" /> All Relays OFF
                </span>
              ) : (
                <span>Leaving Home (Turn All OFF)</span>
              )}
            </div>
            <div className={cn(
              "btn-icon-box !bg-[#ffc687]",
              successAction === 'leave' && '!bg-[#dae4af]'
            )}>
              <LogOut className="h-4 w-4 text-[#020202] transition-transform duration-300 group-hover:scale-110" />
            </div>
          </button>

          {/* Arrive Home */}
          <button
            onClick={handleArriveHome}
            disabled={loadingAction !== null}
            className="anima-btn-primary group"
          >
            <div className="btn-body">
              <span>Arrive Home</span>
            </div>
            <div className="btn-icon-box">
              <Plus className="h-4 w-4 text-[#020202] transition-transform duration-300 group-hover:rotate-45" />
            </div>
          </button>

          {/* Unlock Gate Solenoid */}
          <button
            onClick={handleGateUnlock}
            disabled={gateCountdown !== null}
            className="anima-btn-secondary flex items-center gap-2 group"
          >
            <LockOpen className="h-4 w-4 text-[#020202]" />
            <span>
              {gateCountdown !== null ? `Gate Unlocked (${gateCountdown}s)` : 'Unlock Gate (10s)'}
            </span>
          </button>

          {/* 4G/5G Remote Modal Trigger */}
          {onOpenRemoteModal && (
            <button
              onClick={onOpenRemoteModal}
              className="anima-btn-secondary flex items-center gap-2 bg-[#020202] text-white border-black hover:bg-[#222222]"
            >
              <Radio className="h-4 w-4 text-[#dae4af] animate-pulse" />
              <span>4G/5G Remote Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtle Bottom Architectural Frame Line */}
      <div className="corner-lines">
        <div className="corner-lines__bottom-left !bg-black/40" />
        <div className="corner-lines__bottom-right !bg-black/40" />
      </div>
    </section>
  );
}
