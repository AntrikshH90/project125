import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { getDb, users, sessions, auditLogs } from "@dataharvest/core";
import { eq, and, gt, lt } from "drizzle-orm";
import type { FastifyRequest, FastifyReply } from "fastify";

const SESSION_COOKIE = "dh_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, req: FastifyRequest): Promise<string> {
  const db = getDb();
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    token: tokenHash(rawToken),
    expiresAt,
    ipAddress: req.ip ?? null,
    userAgent: (req.headers["user-agent"] as string | undefined) ?? null
  });
  return rawToken;
}

export function setSessionCookie(reply: FastifyReply, rawToken: string) {
  reply.setCookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(req: FastifyRequest): Promise<SessionUser | null> {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (!rawToken) return null;
  const db = getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, tokenHash(rawToken)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function destroySession(req: FastifyRequest): Promise<void> {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (!rawToken) return;
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.token, tokenHash(rawToken)));
}

export async function pruneExpiredSessions(): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function audit(
  workspaceId: string,
  actor: SessionUser | null,
  action: string,
  targetType?: string,
  targetId?: string,
  meta: Record<string, unknown> = {}
) {
  const db = getDb();
  await db.insert(auditLogs).values({
    workspaceId,
    actorUserId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    meta
  });
}

function randomUUID(): string {
  return crypto.randomUUID();
}
