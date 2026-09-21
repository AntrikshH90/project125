'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Radio,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
  Loader2,
  QrCode,
  Power,
  Zap,
} from 'lucide-react';
import { useVoltixSocket } from '@/hooks/useVoltixSocket';
import { cn } from '@/lib/utils';

interface RemoteAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TunnelState {
  isActive: boolean;
  publicUrl: string | null;
  provider: 'cloudflare' | 'localtunnel' | 'none';
  startedAt: string | null;
  error: string | null;
}

export function RemoteAccessModal({ isOpen, onClose }: RemoteAccessModalProps) {
  const { getSocket } = useVoltixSocket();
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'tailscale'>('cloudflare');
  const [tunnelState, setTunnelState] = useState<TunnelState>({
    isActive: false,
    publicUrl: null,
    provider: 'none',
    startedAt: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch initial tunnel state
  useEffect(() => {
    if (isOpen) {
      fetch('/api/tunnel')
        .then((r) => r.json())
        .then((d) => setTunnelState(d))
        .catch(() => {});
    }
  }, [isOpen]);

  // Listen for socket tunnel state updates
  useEffect(() => {
    const s = getSocket();
    const handleTunnel = (st: TunnelState) => {
      setTunnelState(st);
      setIsLoading(false);
    };
    s.on('tunnel:state', handleTunnel);
    return () => {
      s.off('tunnel:state', handleTunnel);
    };
  }, [getSocket]);

  if (!isOpen) return null;

  const handleToggleTunnel = async () => {
    setIsLoading(true);
    const action = tunnelState.isActive ? 'stop' : 'start';
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setTunnelState(data);
    } catch (e) {
      console.error('Tunnel toggle failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCmd = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const qrUrl = tunnelState.publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        tunnelState.publicUrl
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl rounded-2xl border border-[#e6e6e6] bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative"
      >
        <div className="corner-lines">
          <div className="corner-lines__top-left" />
          <div className="corner-lines__top-right" />
          <div className="corner-lines__bottom-left" />
          <div className="corner-lines__bottom-right" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dae4af] text-[#020202]">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tag text-[#808080]">005/ ACCESS EVERYWHERE</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-mono font-bold",
                  tunnelState.isActive
                    ? "bg-[#dae4af] text-[#020202]"
                    : "bg-[#f5f6f6] text-[#808080]"
                )}>
                  {tunnelState.isActive ? 'ONLINE (GLOBAL)' : 'LOCAL ONLY'}
                </span>
              </div>
              <h3 className="font-parabole text-xl sm:text-2xl font-bold text-[#020202]">
                Remote 4G/5G Cellular Control
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#808080] hover:text-[#020202] hover:bg-[#f0f0f0]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1-Click Live Tunnel Switch & QR Code Center */}
        <div className="rounded-2xl border border-[#dae4af] bg-[#f9faf5] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono-tag text-xs font-bold text-[#020202] flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-[#8da036]" />
                1-Click Live Global HTTPS Tunnel
              </span>
              <p className="text-xs text-[#575757]">
                Activate instant encrypted global connection to control your home from anywhere on 4G/5G mobile data.
              </p>
            </div>

            <button
              onClick={handleToggleTunnel}
              disabled={isLoading}
              className={cn(
                'anima-btn-primary !h-11 text-xs whitespace-nowrap',
                tunnelState.isActive && '!bg-[#ffc687]'
              )}
            >
              <div className={cn("btn-body", tunnelState.isActive && "!bg-[#ffc687]")}>
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
                  </span>
                ) : (
                  <span>{tunnelState.isActive ? 'Stop Cloud Tunnel' : 'Activate 4G/5G Tunnel'}</span>
                )}
              </div>
              <div className={cn("btn-icon-box !w-11", tunnelState.isActive && "!bg-[#ffc687]")}>
                <Power className="h-4 w-4" />
              </div>
            </button>
          </div>

          {/* Active Public URL Display & Scan QR Code */}
          {tunnelState.isActive && tunnelState.publicUrl && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-3 border-t border-[#dae4af] space-y-4"
            >
              <div className="space-y-1">
                <span className="font-mono-tag text-[10px] text-[#576321] font-bold">
                  YOUR LIVE SECURE 4G/5G HTTPS URL:
                </span>
                <div className="flex items-center justify-between rounded-xl bg-[#020202] p-3 text-xs font-mono text-[#dae4af] shadow-inner">
                  <a
                    href={tunnelState.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline"
                  >
                    {tunnelState.publicUrl}
                  </a>
                  <button
                    onClick={() => copyCmd(tunnelState.publicUrl!, 'public-url')}
                    className="flex items-center gap-1 text-[11px] text-white hover:text-[#dae4af] ml-2 flex-shrink-0"
                  >
                    {copiedText === 'public-url' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#dae4af]" />
                        <span className="text-[#dae4af]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code for Instant Mobile Scan */}
              {qrUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-white border border-[#e6e6e6] p-4">
                  <div className="p-1 bg-white rounded-lg border border-[#e6e6e6] shadow-sm">
                    <img
                      src={qrUrl}
                      alt="Scan on Mobile Phone"
                      className="h-28 w-28 object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="font-mono-tag text-xs font-bold text-[#020202] flex items-center justify-center sm:justify-start gap-1">
                      <QrCode className="h-4 w-4 text-[#8da036]" />
                      Scan With Your Smartphone Camera
                    </span>
                    <p className="text-xs text-[#575757] font-light">
                      Point your phone camera at this QR code while on 4G/5G cellular data. It will open your Voltix Home dashboard immediately from anywhere in the world!
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Standalone Setup Guides */}
        <div className="space-y-4 text-xs font-mono">
          <div className="rounded-xl border border-[#e6e6e6] bg-[#f9faf9] p-4 space-y-3">
            <span className="font-bold text-[#020202] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#8da036]" />
              How It Works When You Are Away from Home:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
              <div className="rounded-xl bg-white border border-[#e6e6e6] p-3 space-y-1">
                <span className="font-bold font-mono text-[#020202] text-xs">1. Phone on 4G/5G</span>
                <p className="text-[11px] text-[#808080]">
                  Your smartphone sends encrypted commands via global HTTPS.
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#e6e6e6] p-3 space-y-1">
                <span className="font-bold font-mono text-[#020202] text-xs">2. Voltix Core Node</span>
                <p className="text-[11px] text-[#808080]">
                  Your computer receives the action and dispatches to local MQTT.
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#e6e6e6] p-3 space-y-1">
                <span className="font-bold font-mono text-[#020202] text-xs">3. ESP32 Relays</span>
                <p className="text-[11px] text-[#808080]">
                  Water heater / AC turns OFF in 0ms without opening router ports!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e6e6e6] text-xs font-mono">
          <span className="text-[#808080]">Zero-Trust Encrypted Tunnel</span>
          <button onClick={onClose} className="anima-btn-secondary !h-10 text-xs">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
