'use client';
import { Zap, ShieldCheck, Wifi, Radio, Cpu, Lock } from 'lucide-react';

export function MarqueeTicker() {
  const items = [
    'VOLTIX HOME // 8-CHANNEL SMART RELAYS',
    '0MS OPTIMISTIC LATENCY',
    'SELF-HOSTED SINRIC PRO ALTERNATIVE',
    'ESP32-CAM AI BIOMETRICS',
    'SOLENOID 12V GATE CONTROL',
    '4G/5G CELLULAR DATA ACCESS',
    'AUTO-OFF HARDWARE TIMERS',
    'MQTT :1883 DEDICATED BROKER',
    'CONTINUOUS CSV AUDIT SYNC',
  ];

  return (
    <div className="relative overflow-hidden border-y border-[#e6e6e6] bg-[#f0f0f0] py-2.5 font-mono-tag text-[#020202]">
      <div className="marquee-track flex items-center gap-8 whitespace-nowrap">
        {/* Repeat list twice for seamless infinite loop */}
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8da036]" />
            <span className="font-semibold">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
