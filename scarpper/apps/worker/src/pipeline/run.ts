import { getDb, runs, runEvents, extractedRecords, sources, collections, artifacts, sha256, type RawExtractedRecord, type RunStatus, type RunJobPayload } from "@dataharvest/core";
import { eq, inArray } from "drizzle-orm";
import { scrapeWebsite } from "../engines/website.js";
import { scrapeArxiv } from "../connectors/arxiv.js";
import { scrapeGithub } from "../connectors/github.js";
import { scrapeHuggingFace } from "../connectors/huggingface.js";
import { extractPdf } from "../engines/pdf.js";
import { isPaused, isCancelled } from "./control-state.js";
import type { SchemaFieldLike } from "../types.js";

const PROGRESS_EVERY = 5;

export async function executeRun(payload: RunJobPayload): Promise<void> {
  const db = getDb();
  const { runId, collectionId, workspaceId, sourceIds, pageBudget } = payload;

  const runRows = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  const run = runRows[0];
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status === "cancelled") return;

  await db
    .update(runs)
    .set({ status: "running", startedAt: new Date(), errorMessage: null })
    .where(eq(runs.id, runId));

  const colRows = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1);
  const collection = colRows[0];
  if (!collection) throw new Error(`Collection ${collectionId} not found`);

  const srcRows = await db.select().from(sources).where(inArray(sources.id, sourceIds));
  const schemaDef = collection.schemaDefinition as {
    fields: Array<{ name: string; type: string; description?: string; required?: boolean }>;
    prompt?: string;
  };

  await log(runId, "info", `Run started: ${srcRows.length} source(s), budget ${pageBudget} pages`);

  let pagesProcessed = 0;
  let recordsSaved = 0;
  let recordsFailed = 0;
  let hadErrors = false;
  const errors: string[] = [];
  const seenHashes = new Set<string>();

  try {
    for (const source of srcRows) {
      if (await isCancelled(runId)) break;
      if (await isPaused(runId)) {
        await waitWhilePaused(runId);
        if (await isCancelled(runId)) break;
      }
      if (pagesProcessed >= pageBudget) {
        await log(runId, "warn", `Page budget of ${pageBudget} reached; stopping.`);
        break;
      }

      const sourceConfig = (source.config ?? {}) as { maxPages?: number; useAiExtraction?: boolean; maxItems?: number };
      const remainingBudget = pageBudget - pagesProcessed;
      const limit = Math.min(remainingBudget, sourceConfig.maxPages ?? remainingBudget);

      await log(runId, "info", `Source ${source.type}: ${source.targetUrl} (limit ${limit})`);

      try {
        const result = await dispatchSource(source.type, source.targetUrl, schemaDef.fields, sourceConfig, limit, runId);

        for (const page of result.pages) {
          if (await isCancelled(runId)) break;
          if (await isPaused(runId)) await waitWhilePaused(runId);
          pagesProcessed++;

          const records = page.records;
          for (const record of records) {
            try {
              const hash = sha256(JSON.stringify(normalizePayload(record.payload)));
              if (seenHashes.has(hash)) continue;
              seenHashes.add(hash);
              await persistRecord(workspaceId, collectionId, runId, record, hash);
              recordsSaved++;
            } catch (err) {
              recordsFailed++;
              hadErrors = true;
              errors.push(`record: ${(err as Error).message}`);
            }
          }

          if (pagesProcessed % PROGRESS_EVERY === 0 || pagesProcessed === pageBudget) {
            await db
              .update(runs)
              .set({ pagesProcessed, recordsExtracted: recordsSaved, recordsFailed })
              .where(eq(runs.id, runId));
          }
        }

        errors.push(...result.errors);
        if (result.errors.length > 0) hadErrors = true;
        await log(runId, "info", `Source done: ${pagesProcessed} pages so far, ${recordsSaved} records`);
      } catch (err) {
        hadErrors = true;
        errors.push(`source ${source.targetUrl}: ${(err as Error).message}`);
        await log(runId, "error", `Source failed: ${(err as Error).message}`);
      }
    }

    const finalStatus: RunStatus =
      (await isCancelled(runId))
        ? "cancelled"
        : hadErrors
          ? "completed_with_errors"
          : "completed";

    await db
      .update(runs)
      .set({
        status: finalStatus,
        pagesProcessed,
        recordsExtracted: recordsSaved,
        recordsFailed,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? errors.slice(0, 20).join("; ") : null
      })
      .where(eq(runs.id, runId));

    await log(runId, "info", `Run finished: status=${finalStatus} pages=${pagesProcessed} records=${recordsSaved}`);

    if (payload.autoExportFormat && recordsSaved > 0 && finalStatus !== "cancelled") {
      try {
        await log(runId, "info", `Auto-exporting dataset as ${payload.autoExportFormat}...`);
        const { handleExport } = await import("./export.js");
        const { artifactKey } = await import("@dataharvest/core");
        const db2 = getDb();
        const [artifact] = await db2
          .insert(artifacts)
          .values({
            workspaceId,
            collectionId,
            runId,
            format: payload.autoExportFormat,
            s3Key: artifactKey(workspaceId, collectionId, runId, payload.autoExportFormat),
            fileSizeBytes: 0,
            recordCount: 0,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
          })
          .returning();
        await handleExport({
          artifactId: artifact.id,
          workspaceId,
          collectionId,
          format: payload.autoExportFormat,
          runId,
          limit: 500000
        });
        await log(runId, "info", `Dataset export ready: artifact ${artifact.id}`);
      } catch (exportErr) {
        await log(runId, "warn", `Auto-export failed (records are saved): ${(exportErr as Error).message}`);
      }
    }
  } catch (err) {
    await db
      .update(runs)
      .set({
        status: "failed",
        errorMessage: (err as Error).message.slice(0, 1000),
        completedAt: new Date(),
        pagesProcessed,
        recordsExtracted: recordsSaved
      })
      .where(eq(runs.id, runId));
    await log(runId, "error", `Run crashed: ${(err as Error).message}`);
    throw err;
  }
}

interface PageResult {
  records: RawExtractedRecord[];
}

interface SourceResult {
  pages: PageResult[];
  errors: string[];
}

async function dispatchSource(
  type: string,
  targetUrl: string,
  schemaDef: SchemaFieldLike[],
  config: { useAiExtraction?: boolean; maxItems?: number },
  limit: number,
  runId: string
): Promise<SourceResult> {
  switch (type) {
    case "website":
      return scrapeWebsite({
        startUrl: targetUrl,
        schemaFields: schemaDef,
        prompt: "",
        useAi: config.useAiExtraction ?? true,
        limit,
        onPage: async (url, records) => {
          await log(runId, "debug", `page ${url}: ${records.length} records`);
        }
      });
    case "arxiv":
      return wrapRecords(await scrapeArxiv(targetUrl, schemaDef, limit), "arxiv");
    case "github":
      return wrapRecords(await scrapeGithub(targetUrl, schemaDef, limit), "github");
    case "huggingface":
      return wrapRecords(await scrapeHuggingFace(targetUrl, schemaDef, limit), "huggingface");
    case "pdf":
      return wrapRecords(await extractPdf(targetUrl, schemaDef), "pdf");
    case "api_endpoint":
      return genericApi(targetUrl, limit);
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

function wrapRecords(
  result: { pages: Array<{ records: Array<Record<string, unknown>> }>; errors: string[] },
  sourceType: string
): SourceResult {
  return {
    pages: result.pages.map((page) => ({
      records: page.records.map((payload) => ({
        payload,
        sourceUrl: String(payload.url ?? payload.sourceUrl ?? ""),
        confidenceScore: 1,
        provenance: { strategy: sourceType, extractedAt: new Date().toISOString() }
      }))
    })),
    errors: result.errors
  };
}

async function genericApi(targetUrl: string, limit: number): Promise<SourceResult> {
  const res = await fetch(targetUrl, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  const body = (await res.json()) as unknown;
  const items = Array.isArray(body) ? body : typeof body === "object" && body !== null ? findArray((body as Record<string, unknown>)) : [];
  const pages: PageResult[] = [];
  const records: RawExtractedRecord[] = items.slice(0, limit).map((item) => ({
    payload: item as Record<string, unknown>,
    sourceUrl: targetUrl,
    confidenceScore: 1,
    provenance: { strategy: "api_endpoint", fetchedAt: new Date().toISOString() }
  }));
  pages.push({ records });
  return { pages, errors: [] };
}

function findArray(obj: Record<string, unknown>): unknown[] {
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const nested = findArray(v as Record<string, unknown>);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = Array.isArray(v) ? [...v].map(String).sort().join("|") : v;
  }
  return out;
}

async function persistRecord(
  workspaceId: string,
  collectionId: string,
  runId: string,
  record: RawExtractedRecord,
  hash: string
) {
  const db = getDb();
  await db.insert(extractedRecords).values({
    workspaceId,
    collectionId,
    runId,
    sourceUrl: record.sourceUrl,
    contentHash: hash,
    payload: record.payload,
    confidenceScore: record.confidenceScore ?? null,
    provenance: record.provenance ?? {}
  });
}

async function waitWhilePaused(runId: string, maxWaitMs = 30 * 60 * 1000): Promise<void> {
  const start = Date.now();
  while ((await isPaused(runId)) && Date.now() - start < maxWaitMs) {
    if (await isCancelled(runId)) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export async function log(runId: string, level: "debug" | "info" | "warn" | "error", message: string, meta: Record<string, unknown> = {}) {
  try {
    const db = getDb();
    await db.insert(runEvents).values({ runId, level, message, meta });
    const icon = { debug: "·", info: "→", warn: "!", error: "✗" }[level];
    console.log(`[run ${runId.slice(0, 8)}] ${icon} ${message}`);
  } catch {
    console.log(`[run ${runId.slice(0, 8)}] (log-fail) ${message}`);
  }
}
