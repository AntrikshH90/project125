import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SOURCE_TYPES } from "@dataharvest/core";
import {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addSource,
  listSources,
  deleteSource
} from "../services/collections.js";
import { requireWorkspaceWrite } from "../auth/guards.js";

const collectionBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  schemaDefinition: z.object({
    fields: z
      .array(
        z.object({
          name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(64),
          type: z.enum(["string", "number", "boolean", "array"]),
          description: z.string().max(500).optional(),
          required: z.boolean().optional()
        })
      )
      .min(1)
      .max(60),
    prompt: z.string().max(2000).optional(),
    mode: z.enum(["auto", "heuristic", "llm"]).optional()
  })
});

const sourceBody = z.object({
  type: z.enum(SOURCE_TYPES),
  targetUrl: z.string().url(),
  config: z
    .object({
      maxPages: z.number().int().min(1).max(10000).optional(),
      maxDepth: z.number().int().min(0).max(5).optional(),
      includePatterns: z.array(z.string()).optional(),
      excludePatterns: z.array(z.string()).optional(),
      useAiExtraction: z.boolean().optional(),
      maxItems: z.number().int().min(1).max(50000).optional()
    })
    .optional()
});

export function registerCollectionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    const url = req.url.split("?")[0];
    if (!url.startsWith("/api/collections")) return;
    const { requireAuth } = await import("../auth/guards.js");
    if (!(await requireAuth(req, reply))) return reply;

    const colMatch = url.match(/^\/api\/collections\/([0-9a-f-]{36})(\/.*)?$/);
    if (colMatch) {
      const { getDb, collections } = await import("@dataharvest/core");
      const { eq: drizzleEq } = await import("drizzle-orm");
      const { getMembershipRole } = await import("../auth/guards.js");
      const rows = await getDb()
        .select({ workspaceId: collections.workspaceId })
        .from(collections)
        .where(drizzleEq(collections.id, colMatch[1]));
      if (!rows[0]) {
        await reply.code(404).send({ error: "not_found", message: "Collection not found" });
        return reply;
      }
      req.params = { ...((req.params as object) ?? {}), id: colMatch[1] };
      const role = await getMembershipRole(rows[0].workspaceId, req.wsCtx!.user.id);
      if (!role) {
        await reply.code(403).send({ error: "forbidden", message: "No access to this collection" });
        return reply;
      }
      req.wsCtx = { ...req.wsCtx!, workspaceId: rows[0].workspaceId, role };
    }
  });

  app.post("/api/workspaces/:wsId/collections", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const parsed = collectionBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid collection payload",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      });
    }
    const col = await createCollection(req.wsCtx!.workspaceId, req.wsCtx!.user, parsed.data);
    return reply.code(201).send(col);
  });

  app.get("/api/workspaces/:wsId/collections", async (req) => {
    return listCollections(req.wsCtx!.workspaceId);
  });

  app.get("/api/collections/:id", async (req) => {
    return getCollection(req.wsCtx!.workspaceId, (req.params as { id: string }).id);
  });

  app.patch("/api/collections/:id", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const partial = (collectionBody as unknown as { partial: () => typeof collectionBody }).partial();
    const parsed = partial.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid update payload" });
    }
    const col = await updateCollection(
      req.wsCtx!.workspaceId,
      req.wsCtx!.user,
      (req.params as { id: string }).id,
      parsed.data
    );
    if (!col) return reply.code(404).send({ error: "not_found" });
    return col;
  });

  app.delete("/api/collections/:id", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    await deleteCollection(req.wsCtx!.workspaceId, req.wsCtx!.user, (req.params as { id: string }).id);
    return { ok: true };
  });

  app.post("/api/collections/:id/sources", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const parsed = sourceBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid source payload" });
    }
    const src = await addSource(req.wsCtx!.workspaceId, req.wsCtx!.user, (req.params as { id: string }).id, parsed.data);
    return reply.code(201).send(src);
  });

  app.get("/api/collections/:id/sources", async (req) => {
    return listSources(req.wsCtx!.workspaceId, (req.params as { id: string }).id);
  });

  app.delete("/api/collections/:id/sources/:sourceId", async (req, reply) => {
    if (!(await requireWorkspaceWrite(req, reply))) return reply;
    const { sourceId } = req.params as { id: string; sourceId: string };
    const ok = await deleteSource(req.wsCtx!.workspaceId, req.wsCtx!.user, sourceId);
    if (!ok) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
