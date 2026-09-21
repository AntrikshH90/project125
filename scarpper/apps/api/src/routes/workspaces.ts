import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb, workspaces, workspaceMemberships, users, invitations, slugify } from "@dataharvest/core";
import { and, eq, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  requireAuth,
  requireWorkspaceAccess,
  requireWorkspaceManage,
  userWorkspaces,
  getMembershipRole,
  canManage
} from "../auth/guards.js";
import { audit, getSessionUser } from "../auth/session.js";
import { workspaceOverview, workspaceAudit, workspaceArtifacts } from "../services/workspace.js";

const createWsSchema = z.object({ name: z.string().min(2).max(100) });
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member")
});
const respondSchema = z.object({ action: z.enum(["accept", "decline"]) });
const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"])
});

export function registerWorkspaceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/api/workspaces")) {
      const ok = await requireAuth(req, reply);
      if (!ok) return reply;
      const url = req.url.split("?")[0];
      const match = url.match(/^\/api\/workspaces\/([0-9a-f-]{36})(\/.*)?$/);
      if (match) {
        req.params = { ...((req.params as object) ?? {}), wsId: match[1] };
        const allowed = await requireWorkspaceAccess(req, reply);
        if (!allowed) return reply;
      }
    }
  });

  app.get("/api/workspaces", async (req) => {
    const ctx = req.wsCtx!;
    return userWorkspaces(ctx.user.id);
  });

  app.post("/api/workspaces", async (req, reply) => {
    const ctx = req.wsCtx!;
    const parsed = createWsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Workspace name is required (2-100 chars)" });
    }
    const db = getDb();
    const base = slugify(parsed.data.name);
    let slug = base;
    let n = 1;
    while (n < 10) {
      const exists = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
      if (exists.length === 0) break;
      slug = `${base}-${n++}`;
    }
    const [ws] = await db
      .insert(workspaces)
      .values({ name: parsed.data.name, slug, ownerId: ctx.user.id })
      .returning();
    await db.insert(workspaceMemberships).values({
      workspaceId: ws.id,
      userId: ctx.user.id,
      role: "owner"
    });
    await audit(ws.id, ctx.user, "workspace.create", "workspace", ws.id, { name: ws.name });
    return reply.code(201).send(ws);
  });

  app.get("/api/workspaces/:wsId/overview", async (req) => {
    const ctx = req.wsCtx!;
    return workspaceOverview(ctx.workspaceId);
  });

  app.get("/api/workspaces/:wsId/members", async (req, reply) => {
    const ctx = req.wsCtx!;
    const db = getDb();
    const members = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: workspaceMemberships.role,
        joinedAt: workspaceMemberships.createdAt
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(eq(workspaceMemberships.workspaceId, ctx.workspaceId));
    const pending = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.workspaceId, ctx.workspaceId), eq(invitations.status, "pending")));
    return { members, invitations: pending };
  });

  app.post("/api/workspaces/:wsId/invitations", async (req, reply) => {
    const ctx = req.wsCtx!;
    if (!canManage(ctx.role)) {
      return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
    }
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Valid email and role required" });
    }
    const db = getDb();
    const token = randomBytes(24).toString("hex");
    const [inv] = await db
      .insert(invitations)
      .values({
        workspaceId: ctx.workspaceId,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        token,
        invitedBy: ctx.user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      })
      .returning();
    await audit(ctx.workspaceId, ctx.user, "invitation.create", "invitation", inv.id, {
      email: inv.email,
      role: inv.role
    });
    return reply.code(201).send({ ...inv, token });
  });

  app.post("/api/invitations/respond", async (req, reply) => {
    const user = await getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const token = (req.body as { token?: string }).token;
    if (!token) return reply.code(400).send({ error: "validation_error", message: "token required" });

    const db = getDb();
    const rows = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    const inv = rows[0];
    if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
      return reply.code(404).send({ error: "not_found", message: "Invitation is invalid or expired" });
    }
    if (parsed.data.action === "decline") {
      await db.update(invitations).set({ status: "revoked" }).where(eq(invitations.id, inv.id));
      return { ok: true, declined: true };
    }
    await db.transaction(async (tx) => {
      await tx.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, inv.id));
      const existing = await tx
        .select({ id: workspaceMemberships.id })
        .from(workspaceMemberships)
        .where(
          and(
            eq(workspaceMemberships.workspaceId, inv.workspaceId),
            eq(workspaceMemberships.userId, user.id)
          )
        )
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(workspaceMemberships).values({
          workspaceId: inv.workspaceId,
          userId: user.id,
          role: inv.role
        });
      }
    });
    await audit(inv.workspaceId, user, "invitation.accept", "invitation", inv.id, {});
    return { ok: true, workspaceId: inv.workspaceId };
  });

  app.get("/api/invitations/mine", async (req, reply) => {
    const user = await getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const db = getDb();
    const rows = await db
      .select({
        id: invitations.id,
        token: invitations.token,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        workspaceName: workspaces.name
      })
      .from(invitations)
      .innerJoin(workspaces, eq(invitations.workspaceId, workspaces.id))
      .where(and(eq(invitations.email, user.email.toLowerCase()), eq(invitations.status, "pending")))
      .orderBy(desc(invitations.createdAt));
    return rows;
  });

  app.patch("/api/workspaces/:wsId/members/role", async (req, reply) => {
    const ctx = req.wsCtx!;
    if (ctx.role !== "owner") {
      return reply.code(403).send({ error: "forbidden", message: "Only the owner can change roles" });
    }
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const db = getDb();
    const target = await db
      .select({ role: workspaceMemberships.role })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, ctx.workspaceId),
          eq(workspaceMemberships.userId, parsed.data.userId)
        )
      )
      .limit(1);
    if (!target[0]) return reply.code(404).send({ error: "not_found", message: "Member not found" });
    if (target[0].role === "owner") {
      return reply.code(400).send({ error: "bad_request", message: "Cannot change the owner's role" });
    }
    await db
      .update(workspaceMemberships)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(workspaceMemberships.workspaceId, ctx.workspaceId),
          eq(workspaceMemberships.userId, parsed.data.userId)
        )
      );
    await audit(ctx.workspaceId, ctx.user, "member.role_change", "user", parsed.data.userId, {
      role: parsed.data.role
    });
    return { ok: true };
  });

  app.delete("/api/workspaces/:wsId/members/:userId", async (req, reply) => {
    const ctx = req.wsCtx!;
    if (!canManage(ctx.role)) {
      return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
    }
    const { userId } = req.params as { userId: string };
    if (userId === ctx.user.id) {
      return reply.code(400).send({ error: "bad_request", message: "Cannot remove yourself" });
    }
    const db = getDb();
    await db
      .delete(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, ctx.workspaceId),
          eq(workspaceMemberships.userId, userId)
        )
      );
    await audit(ctx.workspaceId, ctx.user, "member.remove", "user", userId, {});
    return { ok: true };
  });

  app.get("/api/workspaces/:wsId/audit", async (req) => {
    const ctx = req.wsCtx!;
    if (!canManage(ctx.role)) return [];
    return workspaceAudit(ctx.workspaceId, 100);
  });

  app.get("/api/workspaces/:wsId/artifacts", async (req) => {
    const ctx = req.wsCtx!;
    return workspaceArtifacts(ctx.workspaceId, 50);
  });
}
