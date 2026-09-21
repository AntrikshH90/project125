import { getDb, workspaceMemberships, workspaces } from "@dataharvest/core";
import { and, eq } from "drizzle-orm";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getSessionUser, type SessionUser } from "./session.js";

export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceContext {
  user: SessionUser;
  workspaceId: string;
  role: MemberRole;
}

const ROLE_RANK: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
};

export function canWrite(role: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.member;
}

export function canManage(role: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

declare module "fastify" {
  interface FastifyRequest {
    wsCtx?: WorkspaceContext;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const user = await getSessionUser(req);
  if (!user) {
    await reply.code(401).send({ error: "unauthorized", message: "Authentication required" });
    return false;
  }
  req.wsCtx = { user, workspaceId: "", role: "viewer" };
  return true;
}

export async function requireWorkspaceAccess(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const ctx = req.wsCtx;
  if (!ctx) {
    await reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  const wsId = (req.params as Record<string, string>).wsId;
  if (!wsId) {
    await reply.code(400).send({ error: "bad_request", message: "Missing wsId" });
    return false;
  }
  const role = await getMembershipRole(wsId, ctx.user.id);
  if (!role) {
    await reply.code(403).send({ error: "forbidden", message: "Not a member of this workspace" });
    return false;
  }
  req.wsCtx = { ...ctx, workspaceId: wsId, role };
  return true;
}

export async function requireWorkspaceWrite(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const ctx = req.wsCtx;
  if (!ctx || !canWrite(ctx.role)) {
    await reply.code(403).send({ error: "forbidden", message: "Write access required" });
    return false;
  }
  return true;
}

export async function requireWorkspaceManage(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const ctx = req.wsCtx;
  if (!ctx || !canManage(ctx.role)) {
    await reply.code(403).send({ error: "forbidden", message: "Admin access required" });
    return false;
  }
  return true;
}

export async function getMembershipRole(workspaceId: string, userId: string): Promise<MemberRole | null> {
  const db = getDb();
  const rows = await db
    .select({ role: workspaceMemberships.role })
    .from(workspaceMemberships)
    .where(
      and(
        eq(workspaceMemberships.workspaceId, workspaceId),
        eq(workspaceMemberships.userId, userId)
      )
    )
    .limit(1);
  return (rows[0]?.role as MemberRole) ?? null;
}

export async function userWorkspaces(userId: string) {
  const db = getDb();
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMemberships.role,
      createdAt: workspaces.createdAt
    })
    .from(workspaces)
    .innerJoin(workspaceMemberships, eq(workspaceMemberships.workspaceId, workspaces.id))
    .where(eq(workspaceMemberships.userId, userId));
}
