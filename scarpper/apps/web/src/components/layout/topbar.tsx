"use client";

import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import type { WorkspaceInfo } from "@/lib/auth";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/overview": { title: "Overview", subtitle: "Live harvest telemetry across your workspace" },
  "/studio": { title: "Extraction Studio", subtitle: "Configure sources, schemas and preview extraction" },
  "/runs": { title: "Runs", subtitle: "Execution history with live log inspector" },
  "/collections": { title: "Collections", subtitle: "Datasets, provenance and exports" },
  "/settings": { title: "Settings", subtitle: "Team, roles and workspace configuration" }
};

export function Topbar({ workspace }: { workspace: WorkspaceInfo | null }) {
  const pathname = usePathname();
  const meta =
    Object.entries(TITLES).find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
    TITLES["/overview"];

  return (
    <header className="flex h-14 items-center justify-between border-b border-graphite-700 bg-graphite-900/40 px-6 backdrop-blur">
      <div>
        <h1 className="text-sm font-semibold text-slate-text">{meta.title}</h1>
        <p className="text-[11px] text-slate-dim">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 sm:flex">
          <Radio className="h-3 w-3 dh-pulse" />
          Worker cluster online
        </span>
        <span className="hidden text-[11px] text-slate-dim lg:block">{workspace?.name}</span>
      </div>
    </header>
  );
}
