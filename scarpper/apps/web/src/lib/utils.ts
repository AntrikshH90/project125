import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export const RUN_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  running: { label: "Running", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  pausing: { label: "Pausing", className: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  paused: { label: "Paused", className: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  cancelling: { label: "Cancelling", className: "bg-red-500/10 text-red-300 border-red-500/30" },
  cancelled: { label: "Cancelled", className: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  completed_with_errors: { label: "Partial", className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/30" }
};
