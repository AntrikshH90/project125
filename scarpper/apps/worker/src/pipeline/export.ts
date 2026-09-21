import { getDb, artifacts, extractedRecords, putArtifact, artifactKey, buildParquet, serialize } from "@dataharvest/core";
import { and, desc, eq } from "drizzle-orm";
import type { ExportJobPayload } from "@dataharvest/core";

export async function handleExport(payload: ExportJobPayload): Promise<void> {
  const db = getDb();
  const { artifactId, workspaceId, collectionId, format, runId, limit = 100000 } = payload;

  const rows = await db.select().from(artifacts).where(eq(artifacts.id, artifactId)).limit(1);
  const artifact = rows[0];
  if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

  try {
    const conds = [
      eq(extractedRecords.workspaceId, workspaceId),
      eq(extractedRecords.collectionId, collectionId)
    ];
    if (runId) conds.push(eq(extractedRecords.runId, runId));

    const records = await db
      .select()
      .from(extractedRecords)
      .where(and(...conds))
      .orderBy(desc(extractedRecords.createdAt))
      .limit(limit);

    const exportRows = records.map((r) => ({
      ...(r.payload as Record<string, unknown>),
      _source_url: r.sourceUrl,
      _confidence: r.confidenceScore,
      _collected_at: r.createdAt.toISOString()
    }));

    let buffer: Buffer;
    if (format === "parquet") {
      buffer = await buildParquet(exportRows);
    } else {
      buffer = serialize(format, exportRows);
    }

    const key = artifactKey(workspaceId, collectionId, artifactId, format);
    await putArtifact(key, buffer);

    await db
      .update(artifacts)
      .set({ s3Key: key, fileSizeBytes: buffer.length, recordCount: exportRows.length })
      .where(eq(artifacts.id, artifactId));

    console.log(`[export] ${artifactId.slice(0, 8)} ${format}: ${exportRows.length} rows, ${buffer.length} bytes`);
  } catch (err) {
    console.error(`[export] ${artifactId.slice(0, 8)} failed:`, (err as Error).message);
    throw err;
  }
}
