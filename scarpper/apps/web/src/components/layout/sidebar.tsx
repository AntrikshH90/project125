"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Hammer,
  Activity,
  Database,
  Settings,
  Wheat,
  ChevronDown,
  Plus,
  LogOut,
  Zap
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AuthUser, WorkspaceInfo } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/instant", label: "Instant", icon: Zap },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Hammer },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/collections", label: "Collections", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar({
  activeWorkspace,
  workspaces,
  onSwitch,
  user
}: {
  activeWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  onSwitch: (ws: WorkspaceInfo) => void;
  user: AuthUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createWorkspace = async () => {
    const name = window.prompt("Workspace name");
    if (!name || name.length < 2) return;
    setCreating(true);
    try {
      const ws = await api.post<WorkspaceInfo>("/api/workspaces", { name });
      onSwitch({ ...ws, role: "owner" });
    } finally {
      setCreating(false);
    }
  };

  const signOut = async () => {
    await api.post("/api/auth/sign-out").catch(() => undefined);
    router.replace("/login");
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-graphite-700 bg-graphite-900/50 md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-graphite-700 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-accent">
          <Wheat className="h-4 w-4 text-zinc-950" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">DataHarvest</span>
      </div>

      <div className="border-b border-graphite-700 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md border border-graphite-600 bg-graphite-850 px-3 py-2 text-left text-sm transition-colors hover:bg-graphite-800">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-text">{activeWorkspace?.name ?? "…"}</p>
                <p className="text-[11px] capitalize text-slate-dim">{activeWorkspace?.role ?? ""}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-dim" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} onClick={() => onSwitch(ws)} className={cn(ws.id === activeWorkspace?.id && "bg-graphite-800")}>
                <span className="truncate">{ws.name}</span>
                <span className="ml-auto text-[10px] uppercase text-slate-dim">{ws.role}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={createWorkspace} disabled={creating}>
              <Plus className="h-4 w-4" /> New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-accent/10 text-amber-400"
                  : "text-slate-dim hover:bg-graphite-800 hover:text-slate-text"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-graphite-700 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-graphite-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite-700 text-xs font-bold text-amber-400">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-text">{user.name}</p>
                <p className="truncate text-[11px] text-slate-dim">{user.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
