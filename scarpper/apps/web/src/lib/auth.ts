"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: AuthUser }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

const WORKSPACE_KEY = "dh.activeWorkspace";

export function useWorkspace(user: AuthUser | null, loading: boolean) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [active, setActive] = useState<WorkspaceInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setReady(true);
      return;
    }
    api
      .get<WorkspaceInfo[]>("/api/workspaces")
      .then((ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(WORKSPACE_KEY) : null;
          const found = stored ? ws.find((w) => w.id === stored) : null;
          setActive(found ?? ws[0]);
        }
      })
      .catch(() => setWorkspaces([]))
      .finally(() => setReady(true));
  }, [user, loading]);

  const switchWorkspace = (ws: WorkspaceInfo) => {
    setActive(ws);
    if (typeof window !== "undefined") window.localStorage.setItem(WORKSPACE_KEY, ws.id);
  };

  return { workspaces, active, switchWorkspace, ready };
}
