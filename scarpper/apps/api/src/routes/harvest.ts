import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SOURCE_TYPES, type MemberRole } from "@dataharvest/core";
import { generateSchemaFromPrompt } from "../services/schema-gen.js";
import { createCollection, addSource, startRun, getCollection, listRuns } from "../services/collections.js";
import { listArtifacts } from "../services/exports.js";
import { getMembershipRole } from "../auth/guards.js";
import { getSessionUser } from "../auth/session.js";

const fieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(64),
  type: z.enum(["string", "number", "boolean", "array"]),
  description: z.string().max(500).optional(),
  required: z.boolean().optional()
});

const harvestBody = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  prompt: z.string().max(2000).optional(),
  fields: z.array(fieldSchema).min(1).max(60).optional(),
  sourceType: z.enum(SOURCE_TYPES).optional(),
  format: z.enum(["csv", "json", "jsonl", "parquet", "bibtex"]).default("csv"),
  pageBudget: z.number().int().min(1).max(100000).optional(),
  name: z.string().max(200).optional()
});

export function detectSourceType(url: string): (typeof SOURCE_TYPES)[number] {
  const u = url.toLowerCase();
  if (u.includes("github.com/")) return "github";
  if (u.includes("arxiv.org")) return "arxiv";
  if (u.includes("huggingface.co")) return "huggingface";
  if (u.includes("/api/") || u.includes("api.") || u.endsWith(".json")) return "api_endpoint";
  if (u.endsWith(".pdf") || u.includes(".pdf?")) return "pdf";
  return "website";
}

export function registerHarvestRoutes(app: FastifyInstance) {
  app.post("/api/harvest", async (req, reply) => {
    const user = await getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized", message: "Sign in first" });

    const parsed = harvestBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "url and workspaceId are required; fields or a 10+ char prompt needed",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      });
    }
    const body = parsed.data;

    const role = (await getMembershipRole(body.workspaceId, user.id)) as MemberRole | null;
    if (!role) return reply.code(403).send({ error: "forbidden", message: "Not a member of this workspace" });

    let fields = body.fields;
    let schemaSource: "provided" | "llm" | "heuristic" = "provided";
    if (!fields) {
      if (!body.prompt || body.prompt.length < 10) {
        return reply.code(400).send({
          error: "validation_error",
          message: "Provide fields or a prompt describing what to extract"
        });
      }
      const generated = await generateSchemaFromPrompt(body.prompt, body.url);
      fields = generated.fields;
      schemaSource = generated.source;
    }

    const sourceType = body.sourceType ?? detectSourceType(body.url);
    const name = body.name ?? `Harvest ${new Date().toLocaleDateString()} — ${sourceType}`;

    const collection = await createCollection(body.workspaceId, user, {
      name,
      description: body.prompt,
      schemaDefinition: { fields, prompt: body.prompt, mode: "auto" }
    });

    await addSource(body.workspaceId, user, collection.id, {
      type: sourceType,
      targetUrl: body.url,
      config: { maxPages: body.pageBudget ?? 100 }
    });

    const run = await startRun(body.workspaceId, user, collection.id, {
      pageBudget: body.pageBudget ?? 100,
      autoExportFormat: body.format
    });

    return reply.code(201).send({
      collectionId: collection.id,
      runId: run?.id,
      sourceType,
      schemaSource,
      fields,
      format: body.format,
      statusUrl: `/api/harvest/${collection.id}`
    });
  });

  app.get("/api/harvest/:id", async (req, reply) => {
    const user = await getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });

    const { id } = req.params as { id: string };
    const { getDb, collections } = await import("@dataharvest/core");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const rows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
    const col = rows[0];
    if (!col) return reply.code(404).send({ error: "not_found", message: "Collection not found" });

    const role = (await getMembershipRole(col.workspaceId, user.id)) as MemberRole | null;
    if (!role) return reply.code(403).send({ error: "forbidden" });

    const [latestRun] = await listRuns(col.workspaceId, { collectionId: id, limit: 1 });
    const artifacts = await listArtifacts(col.workspaceId, id);
    const ready = artifacts.find((a) => a.fileSizeBytes > 0);

    return reply.send({
      collection: col,
      run: latestRun ?? null,
      artifacts,
      downloadArtifactId: ready?.id ?? null,
      done: Boolean(latestRun && ready)
    });
  });
}
