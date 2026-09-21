'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
export function getSocket(): Socket {
  return (socket ??= io('/', { transports: ['websocket'], reconnectionDelay: 500 }));
}

export interface ApplianceState { id: string; state: boolean; }
export interface AccessLogEntry {
  id: string; timestamp: string; status: string;
  confidence: number; snapshotUrl: string; person?: { name: string } | null;
}

/** Subscribes once; returns latest appliance states and streaming access logs. */
export function useVoltixSocket() {
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [lastLog, setLastLog] = useState<AccessLogEntry | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onState = (e: ApplianceState) => setOptimistic(p => ({ ...p, [e.id]: e.state }));
    const onLog = (e: AccessLogEntry) => {
      setLastLog(e); setLogs(prev => [e, ...prev].slice(0, 100));
    };
    s.on('appliance:state', onState); s.on('appliance:optimistic', onState);
    s.on('access:newlog', onLog);
    return () => { s.off('appliance:state', onState); s.off('access:newlog', onLog); };
  }, []);

  return { getSocket, setOptimistic, logs, lastLog };
}