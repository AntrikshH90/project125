"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useWorkspace } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { WorkspaceCtx } from "@/lib/workspace-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const workspace = useWorkspace(user, loading);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user || !workspace.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-accent border-t-transparent" />
          <p className="text-xs text-slate-dim">Booting workbench…</p>
        </div>
      </div>
    );
  }

  if (!workspace.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-950">
        <div className="text-center">
          <p className="text-sm text-slate-dim">No workspace found. Try signing up again.</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceCtx.Provider
      value={{
        workspace: workspace.active,
        workspaces: workspace.workspaces,
        switchWorkspace: workspace.switchWorkspace
      }}
    >
      <div className="flex min-h-screen bg-graphite-950">
        <Sidebar
          activeWorkspace={workspace.active}
          workspaces={workspace.workspaces}
          onSwitch={workspace.switchWorkspace}
          user={user}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar workspace={workspace.active} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </WorkspaceCtx.Provider>
  );
}
