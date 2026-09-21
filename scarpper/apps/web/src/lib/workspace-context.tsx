"use client";

import { createContext, useContext } from "react";
import type { WorkspaceInfo } from "@/lib/auth";

export interface WorkspaceCtxValue {
  workspace: WorkspaceInfo;
  workspaces: WorkspaceInfo[];
  switchWorkspace: (ws: WorkspaceInfo) => void;
}

export const WorkspaceCtx = createContext<WorkspaceCtxValue | null>(null);

export function useActiveWorkspace(): WorkspaceCtxValue {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error("useActiveWorkspace must be used within dashboard layout");
  return ctx;
}
