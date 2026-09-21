import {
  getDb,
  artifacts,
  extractedRecords,
  enqueueExport,
  artifactKey
} from "@dataharvest/core";
import { and, desc, eq } from "drizzle-orm";
import { audit } from "../auth/session.js";
import type { SessionUser } from "../auth/session.js";

export async function requestExport(
  workspaceId: string,
  actor: SessionUser,
  collectionId: string,
  input: { format: "csv" | "json" | "jsonl" | "parquet" | "bibtex"; runId?: string; limit?: number }
) {
  const db = getDb();
  const [artifact] = await db
    .insert(artifacts)
    .values({
      workspaceId,
      collectionId,
      runId: input.runId ?? null,
      format: input.format,
      s3Key: artifactKey(workspaceId, collectionId, "pending", input.format),
      fileSizeBytes: 0,
      recordCount: 0,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    })
    .returning();

  const finalKey = artifactKey(workspaceId, collectionId, artifact.id, input.format);
  await db.update(artifacts).set({ s3Key: finalKey }).where(eq(artifacts.id, artifact.id));

  await enqueueExport({
    artifactId: artifact.id,
    workspaceId,
    collectionId,
    format: input.format,
    runId: input.runId,
    limit: input.limit ?? 100000,
    requestedBy: actor.id
  });

  await audit(workspaceId, actor, "artifact.request", "artifact", artifact.id, { format: input.format });
  return { ...artifact, s3Key: finalKey };
}

export async function listArtifacts(workspaceId: string, collectionId?: string) {
  const db = getDb();
  const where = collectionId
    ? and(eq(artifacts.workspaceId, workspaceId), eq(artifacts.collectionId, collectionId))
    : eq(artifacts.workspaceId, workspaceId);
  return db.select().from(artifacts).where(where).orderBy(desc(artifacts.createdAt)).limit(50);
}

export async function fetchExportRows(
  workspaceId: string,
  collectionId: string,
  runId: string | undefined,
  limit: number
) {
  const db = getDb();
  const conds = [
    eq(extractedRecords.workspaceId, workspaceId),
    eq(extractedRecords.collectionId, collectionId)
  ];
  if (runId) conds.push(eq(extractedRecords.runId, runId));
  const rows = await db
    .select()
    .from(extractedRecords)
    .where(and(...conds))
    .orderBy(desc(extractedRecords.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...(r.payload as Record<string, unknown>),
    _source_url: r.sourceUrl,
    _confidence: r.confidenceScore,
    _collected_at: r.createdAt.toISOString()
  }));
}
