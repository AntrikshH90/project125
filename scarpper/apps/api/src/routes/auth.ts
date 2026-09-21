import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb, users } from "@dataharvest/core";
import { eq } from "drizzle-orm";
import { signUpUser, signInUser } from "../services/workspace.js";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  getSessionUser
} from "../auth/session.js";
import { signUpSchema, signInSchema } from "@dataharvest/core";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/sign-up", async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid sign-up payload",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      });
    }
    const { name, email, password } = parsed.data;

    const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return reply.code(409).send({ error: "conflict", message: "An account with this email already exists" });
    }

    const { user, workspace } = await signUpUser(name, email, password);
    const token = await createSession(user.id, req);
    setSessionCookie(reply, token);

    return reply.code(201).send({
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug }
    });
  });

  app.post("/api/auth/sign-in", async (req, reply) => {
    const parsed = loginUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid credentials payload" });
    }
    const user = await signInUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Email or password is incorrect" });
    }
    const token = await createSession(user.id, req);
    setSessionCookie(reply, token);
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name }
    });
  });

  app.post("/api/auth/sign-out", async (req, reply) => {
    await destroySession(req);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/api/auth/me", async (req, reply) => {
    const user = await getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return reply.send({ user });
  });
}
