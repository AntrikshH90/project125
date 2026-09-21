import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestExport, listArtifacts } from "../services/exports.js";
import { requireWorkspaceWrite } from "../auth/guards.js";

const exportBody = z.object({
  format: z.enum(["csv", "json", "jsonl", "parquet", "bibtex"]),
  runId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(200000).optional()
});

export function registerArtifactRoutes(app: FastifyInstance) {
  app.post("/api/collections/:id/exports", async (req, reply) => {
    const { requireAuth, requireWorkspaceAccess, requireWorkspaceWrite, getMembershipRole } = await import("../auth/guards.js");
    const { getDb, collections } = await import("@dataharvest/core");
    const { eq } = await import("drizzle-orm");
    if (!(await requireAuth(req, reply))) return reply;

    const { id } = req.params as { id: string };
    const rows = await getDb().select({ workspaceId: collections.workspaceId }).from(collections).where(eq(collections.id, id)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "not_found", message: "Collection not found" });
    const role = await getMembershipRole(rows[0].workspaceId, req.wsCtx!.user.id);
    if (!role) return reply.code(403).send({ error: "forbidden" });
    req.wsCtx = { ...req.wsCtx!, workspaceId: rows[0].workspaceId, role };

    if (!(await requireWorkspaceWrite(req, reply))) return reply;

    const parsed = exportBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid export request" });
    }
    const artifact = await requestExport(req.wsCtx!.workspaceId, req.wsCtx!.user, id, parsed.data);
    return reply.code(202).send(artifact);
  });

  app.get("/api/collections/:id/artifacts", async (req, reply) => {
    const { requireAuth, requireWorkspaceAccess, getMembershipRole } = await import("../auth/guards.js");
    const { getDb, collections } = await import("@dataharvest/core");
    const { eq } = await import("drizzle-orm");
    if (!(await requireAuth(req, reply))) return reply;

    const { id } = req.params as { id: string };
    const rows = await getDb().select({ workspaceId: collections.workspaceId }).from(collections).where(eq(collections.id, id)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    const role = await getMembershipRole(rows[0].workspaceId, req.wsCtx!.user.id);
    if (!role) return reply.code(403).send({ error: "forbidden" });
    req.wsCtx = { ...req.wsCtx!, workspaceId: rows[0].workspaceId, role };

    return listArtifacts(req.wsCtx!.workspaceId, id);
  });

  app.get("/api/artifacts/:id/download", async (req, reply) => {
    const { requireAuth, getMembershipRole } = await import("../auth/guards.js");
    const { getDb, artifacts, getArtifactStream, artifactLocalPath } = await import("@dataharvest/core");
    const { eq } = await import("drizzle-orm");
    const { existsSync, createReadStream } = await import("node:fs");
    if (!(await requireAuth(req, reply))) return reply;

    const { id } = req.params as { id: string };
    const rows = await getDb().select().from(artifacts).where(eq(artifacts.id, id)).limit(1);
    const artifact = rows[0];
    if (!artifact || artifact.s3Key.includes("pending") || artifact.fileSizeBytes === 0) {
      return reply.code(404).send({ error: "not_found", message: "Artifact not ready or not found" });
    }
    const role = await getMembershipRole(artifact.workspaceId, req.wsCtx!.user.id);
    if (!role) return reply.code(403).send({ error: "forbidden" });

    const localPath = artifactLocalPath(artifact.s3Key);
    const ext = artifact.format === "parquet" ? "parquet" : artifact.format;
    const filename = `dataharvest-export-${artifact.id.slice(0, 8)}.${ext}`;
    if (existsSync(localPath)) {
      reply.header("content-type", "application/octet-stream");
      reply.header("content-disposition", `attachment; filename="${filename}"`);
      return reply.send(createReadStream(localPath));
    }
    const stream = await getArtifactStream(artifact.s3Key);
    reply.header("content-type", "application/octet-stream");
    reply.header("content-disposition", `attachment; filename="${filename}"`);
    return reply.send(stream);
  });
}
