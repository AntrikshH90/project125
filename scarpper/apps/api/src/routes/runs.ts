import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  startRun,
  controlRun,
  listRuns,
  getRun,
  runEventsList,
  listRecords
} from "../services/collections.js";
import { requireWorkspaceWrite } from "../auth/guards.js";

const startBody = z.object({
  sourceIds: z.array(z.string().uuid()).optional(),
  pageBudget: z.number().int().min(1).max(100000).optional(),
  preview: z.boolean().optional()
});

const controlBody = z.object({
  action: z.enum(["pause", "resume", "cancel"])
});

export function registerRunRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    const url = req.url.split("?")[0];
    const runMatch = url.match(/^\/api\/runs\/([0-9a-f-]{36})(\/.*)?$/);
    if (runMatch) {
      const { requireAuth, requireWorkspaceAccess, getMembershipRole } = await import("../auth/guards.js");
      const { getDb, runs, collections } = await import("@dataharvest/core");
      const { eq, and } = await import("drizzle-orm");
      if (!(await requireAuth(req, reply))) return reply;
      const rows = await getDb()
        .select({ workspaceId: runs.workspaceId })
        .from(runs)
        .innerJoin(collections, eq(runs.collectionId, collections.id))
        .where(and(eq(runs.id, runMatch[1]), eq(collections.workspaceId, collections.workspaceId)))
        .limit(1);
      if (!rows[0]) {
        await reply.code(404).send({ error: "not_found", message: "Run not found" });
        return reply;
      }
      const role = await getMembershipRole(rows[0].workspaceId, req.wsCtx!.user.id);
      if (!role) {
        await reply.code(403).send({ error: "forbidden" });
        return reply;
      }
      req.params = { ...((req.params as object) ?? {}), id: runMatch[1] };
      req.wsCtx = { ...req.wsCtx!, workspaceId: rows[0].workspaceId, role };
    }
  });

  app.post("/api/collections/:id/runs", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const parsed = startBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid run payload" });
    }
    try {
      const run = await startRun(req.wsCtx!.workspaceId, req.wsCtx!.user, (req.params as { id: string }).id, parsed.data);
      if (!run) return reply.code(404).send({ error: "not_found", message: "Collection not found" });
      return reply.code(201).send(run);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.code(statusCode).send({
        error: statusCode === 400 ? "bad_request" : "internal_error",
        message: (err as Error).message
      });
    }
  });

  app.get("/api/collections/:id/runs", async (req) => {
    const { id } = req.params as { id: string };
    const q = req.query as { limit?: string; offset?: string };
    return listRuns(req.wsCtx!.workspaceId, {
      collectionId: id,
      limit: q.limit ? Math.min(Number(q.limit), 200) : 50,
      offset: q.offset ? Number(q.offset) : 0
    });
  });

  app.get("/api/workspaces/:wsId/runs", async (req) => {
    const q = req.query as { limit?: string; offset?: string };
    return listRuns(req.wsCtx!.workspaceId, {
      limit: q.limit ? Math.min(Number(q.limit), 200) : 50,
      offset: q.offset ? Number(q.offset) : 0
    });
  });

  app.get("/api/runs/:id", async (req) => {
    return getRun(req.wsCtx!.workspaceId, (req.params as { id: string }).id);
  });

  app.get("/api/runs/:id/events", async (req) => {
    return runEventsList(req.wsCtx!.workspaceId, (req.params as { id: string }).id, 300);
  });

  app.post("/api/runs/:id/control", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const parsed = controlBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    const result = await controlRun(req.wsCtx!.workspaceId, req.wsCtx!.user, (req.params as { id: string }).id, parsed.data.action);
    if (!result) return reply.code(404).send({ error: "not_found" });
    return result;
  });

  app.get("/api/collections/:id/records", async (req) => {
    const { id } = req.params as { id: string };
    const q = req.query as { limit?: string; offset?: string; search?: string; runId?: string };
    const records = await listRecords(req.wsCtx!.workspaceId, id, {
      limit: q.limit ? Math.min(Number(q.limit), 500) : 100,
      offset: q.offset ? Number(q.offset) : 0,
      search: q.search,
      runId: q.runId
    });
    return { records, count: records.length };
  });
}
