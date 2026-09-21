import { getDb, collections, sources, runs, extractedRecords, runEvents, enqueueRun, enqueueControl } from "@dataharvest/core";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { SessionUser } from "../auth/session.js";
import { audit } from "../auth/session.js";

export async function createCollection(
  workspaceId: string,
  actor: SessionUser,
  input: { name: string; description?: string; schemaDefinition: unknown }
) {
  const db = getDb();
  const [col] = await db
    .insert(collections)
    .values({
      workspaceId,
      name: input.name,
      description: input.description ?? null,
      schemaDefinition: input.schemaDefinition as Record<string, unknown>
    })
    .returning();
  await audit(workspaceId, actor, "collection.create", "collection", col.id, { name: input.name });
  return col;
}

export async function listCollections(workspaceId: string) {
  const db = getDb();
  const cols = await db
    .select()
    .from(collections)
    .where(eq(collections.workspaceId, workspaceId))
    .orderBy(desc(collections.createdAt));

  const counts = await db
    .select({ collectionId: extractedRecords.collectionId, value: sql<number>`count(*)` })
    .from(extractedRecords)
    .where(eq(extractedRecords.workspaceId, workspaceId))
    .groupBy(extractedRecords.collectionId);

  const countMap = new Map(counts.map((c) => [c.collectionId, Number(c.value)]));
  return cols.map((c) => ({ ...c, recordCount: countMap.get(c.id) ?? 0 }));
}

export async function getCollection(workspaceId: string, collectionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateCollection(
  workspaceId: string,
  actor: SessionUser,
  collectionId: string,
  patch: { name?: string; description?: string; schemaDefinition?: unknown }
) {
  const db = getDb();
  const [col] = await db
    .update(collections)
    .set({
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.schemaDefinition ? { schemaDefinition: patch.schemaDefinition as Record<string, unknown> } : {}),
      updatedAt: new Date()
    })
    .where(and(eq(collections.id, collectionId), eq(collections.workspaceId, workspaceId)))
    .returning();
  if (col) await audit(workspaceId, actor, "collection.update", "collection", col.id, {});
  return col ?? null;
}

export async function deleteCollection(workspaceId: string, actor: SessionUser, collectionId: string) {
  const db = getDb();
  await db.delete(collections).where(and(eq(collections.id, collectionId), eq(collections.workspaceId, workspaceId)));
  await audit(workspaceId, actor, "collection.delete", "collection", collectionId, {});
}

export async function addSource(
  workspaceId: string,
  actor: SessionUser,
  collectionId: string,
  input: { type: string; targetUrl: string; config?: unknown }
) {
  const db = getDb();
  const [src] = await db
    .insert(sources)
    .values({
      collectionId,
      type: input.type as never,
      targetUrl: input.targetUrl,
      config: (input.config ?? {}) as Record<string, unknown>
    })
    .returning();
  await audit(workspaceId, actor, "source.create", "source", src.id, { type: input.type, url: input.targetUrl });
  return src;
}

export async function listSources(workspaceId: string, collectionId: string) {
  const db = getDb();
  const col = await getCollection(workspaceId, collectionId);
  if (!col) return null;
  return db.select().from(sources).where(eq(sources.collectionId, collectionId)).orderBy(desc(sources.createdAt));
}

export async function deleteSource(workspaceId: string, actor: SessionUser, sourceId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: sources.id })
    .from(sources)
    .innerJoin(collections, eq(sources.collectionId, collections.id))
    .where(and(eq(sources.id, sourceId), eq(collections.workspaceId, workspaceId)))
    .limit(1);
  if (!rows[0]) return false;
  await db.delete(sources).where(eq(sources.id, sourceId));
  await audit(workspaceId, actor, "source.delete", "source", sourceId, {});
  return true;
}

export async function startRun(
  workspaceId: string,
  actor: SessionUser,
  collectionId: string,
  input: { sourceIds?: string[]; pageBudget?: number; preview?: boolean; autoExportFormat?: "csv" | "json" | "jsonl" | "parquet" | "bibtex" | null }
) {
  const db = getDb();
  const col = await getCollection(workspaceId, collectionId);
  if (!col) return null;

  const srcs = await db
    .select()
    .from(sources)
    .where(eq(sources.collectionId, collectionId));
  const chosen = input.sourceIds?.length ? srcs.filter((s) => input.sourceIds!.includes(s.id)) : srcs;
  if (chosen.length === 0) {
    throw Object.assign(new Error("No sources configured for this collection"), { statusCode: 400 });
  }

  const [run] = await db
    .insert(runs)
    .values({
      workspaceId,
      collectionId,
      sourceId: chosen[0].id,
      status: "queued",
      totalPagesBudget: input.pageBudget ?? 500
    })
    .returning();

  await db.insert(runEvents).values({
    runId: run.id,
    level: "info",
    message: `Run queued for ${chosen.length} source(s)${input.preview ? " (preview mode)" : ""}`,
    meta: { sourceIds: chosen.map((s) => s.id) }
  });

  await enqueueRun({
    runId: run.id,
    workspaceId,
    collectionId,
    sourceIds: chosen.map((s) => s.id),
    pageBudget: input.pageBudget ?? 500,
    preview: input.preview ?? false,
    autoExportFormat: input.autoExportFormat ?? null
  });

  await audit(workspaceId, actor, "run.start", "run", run.id, { preview: !!input.preview });
  return run;
}

export async function controlRun(
  workspaceId: string,
  actor: SessionUser,
  runId: string,
  action: "pause" | "resume" | "cancel"
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.workspaceId, workspaceId)))
    .limit(1);
  const run = rows[0];
  if (!run) return null;

  const transitional = action === "pause" ? "pausing" : action === "cancel" ? "cancelling" : null;
  if (transitional) {
    await db.update(runs).set({ status: transitional as never }).where(eq(runs.id, runId));
  }
  await enqueueControl({ runId, action });
  await audit(workspaceId, actor, `run.${action}`, "run", runId, {});
  return { ok: true };
}

export async function listRuns(workspaceId: string, opts: { limit?: number; offset?: number; collectionId?: string } = {}) {
  const db = getDb();
  const where = opts.collectionId
    ? and(eq(runs.workspaceId, workspaceId), eq(runs.collectionId, opts.collectionId))
    : eq(runs.workspaceId, workspaceId);
  const rows = await db
    .select({
      run: runs,
      collectionName: collections.name
    })
    .from(runs)
    .innerJoin(collections, eq(runs.collectionId, collections.id))
    .where(where)
    .orderBy(desc(runs.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  return rows.map((r) => ({ ...r.run, collectionName: r.collectionName }));
}

export async function getRun(workspaceId: string, runId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function runEventsList(workspaceId: string, runId: string, limit = 200) {
  const db = getDb();
  const run = await getRun(workspaceId, runId);
  if (!run) return null;
  return db
    .select()
    .from(runEvents)
    .where(eq(runEvents.runId, runId))
    .orderBy(desc(runEvents.createdAt))
    .limit(limit);
}

export async function listRecords(
  workspaceId: string,
  collectionId: string,
  opts: { limit?: number; offset?: number; runId?: string; search?: string } = {}
) {
  const db = getDb();
  const conds = [
    eq(extractedRecords.workspaceId, workspaceId),
    eq(extractedRecords.collectionId, collectionId)
  ];
  if (opts.runId) conds.push(eq(extractedRecords.runId, opts.runId));
  if (opts.search) {
    conds.push(sql`${extractedRecords.payload}::text ilike ${"%" + opts.search + "%"}`);
  }
  const rows = await db
    .select()
    .from(extractedRecords)
    .where(and(...conds))
    .orderBy(desc(extractedRecords.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
  return rows;
}
