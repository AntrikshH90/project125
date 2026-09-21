import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const USER_COOKIE = "prep_uid";
const TEAM_COOKIE = "prep_team";

/**
 * Reads the current user from the cookie. If no cookie, creates a User in
 * the DB keyed by a fingerprint header so the user is stable across pages,
 * but DOES NOT set a cookie (cookies can only be set in Route Handlers /
 * Server Actions in Next 15+). The cookie is set the first time the user
 * takes a meaningful action (create team, submit attempt).
 */
export async function getOrCreateUser() {
  const c = await cookies();
  let userId = c.get(USER_COOKIE)?.value;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u) return u;
  }
  // No cookie. Find or create a "guest" user — keep them stable by UA hash
  // so analytics don't fragment per request. The cookie gets set on first
  // server action.
  const h = await headers();
  const fp =
    h.get("user-agent")?.slice(0, 80) +
    "|" +
    (h.get("x-forwarded-for") ?? "local");
  const guestName = "Guest-" + simpleHash(fp).toString(16).slice(0, 6);

  let user = await prisma.user.findFirst({ where: { name: guestName } });
  if (!user) {
    user = await prisma.user.create({ data: { name: guestName } });
  }
  return user;
}

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Only call from a Route Handler or Server Action.
 */
export async function attachUserCookie(userId: string) {
  const c = await cookies();
  c.set(USER_COOKIE, userId, { httpOnly: false, sameSite: "lax", path: "/" });
}

export async function setUserName(name: string) {
  const c = await cookies();
  let userId = c.get(USER_COOKIE)?.value;
  if (!userId) {
    const u = await prisma.user.create({ data: { name } });
    await attachUserCookie(u.id);
    return u;
  }
  const u = await prisma.user.update({ where: { id: userId }, data: { name } });
  return u;
}

export async function joinTeam(code: string) {
  const c = await cookies();
  const team = await prisma.team.findUnique({ where: { code } });
  if (!team) return null;
  const u = await getOrCreateUser();
  await prisma.user.update({ where: { id: u.id }, data: { teamId: team.id } });
  c.set(TEAM_COOKIE, team.id, { httpOnly: false, sameSite: "lax", path: "/" });
  return team;
}

export async function createTeam(name: string) {
  const c = await cookies();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const team = await prisma.team.create({ data: { name, code } });
  const u = await getOrCreateUser();
  await prisma.user.update({ where: { id: u.id }, data: { teamId: team.id } });
  c.set(TEAM_COOKIE, team.id, { httpOnly: false, sameSite: "lax", path: "/" });
  return team;
}

export async function getCurrentTeam() {
  const c = await cookies();
  const teamId = c.get(TEAM_COOKIE)?.value;
  if (teamId) {
    const t = await prisma.team.findUnique({ where: { id: teamId } });
    if (t) return t;
  }
  const u = await getOrCreateUser();
  if (u.teamId) return prisma.team.findUnique({ where: { id: u.teamId } });
  return null;
}
