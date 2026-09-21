// routes/instant.ts — DataHarvest "instant mode": one-box ask → files.
// Auth-free, DB-free, queue-free: pure in-process pipelines with file-backed job state.
// Same UX as the standalone instant-scraper, wired into the main API.

import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { startJob, zipJob } from "../instant/jobs/runner.js";
import { getJob, publicJob, fileList, listJobs, ROOT } from "../instant/store.js";

const MIME: Record<string, string> = {
  pdf: "application/pdf", csv: "text/csv", json: "application/json",
  jsonl: "application/x-ndjson", txt: "text/plain; charset=utf-8", md: "text/markdown; charset=utf-8",
  bib: "text/plain; charset=utf-8", zip: "application/zip",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
};

export function registerInstantRoutes(app: FastifyInstance) {
  app.post("/api/instant/ask", async (req, reply) => {
    const ask = String((req.body as any)?.ask ?? "").trim();
    if (!ask) return reply.code(400).send({ error: "validation_error", message: "ask is required" });
    const { jobId, plan, intent } = await startJob(ask);
    return reply.code(201).send({ jobId, plan, intent, statusUrl: `/api/instant/ask/${jobId}` });
  });

  app.get("/api/instant/ask/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = getJob(id);
    if (!job) return reply.code(404).send({ error: "not_found", message: "job not found (server may have restarted)" });
    return reply.send({ ...publicJob(job), files: fileList(id) });
  });

  app.get("/api/instant/history", async () => listJobs(30));

  app.get("/api/instant/zip/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!getJob(id)) return reply.code(404).send({ error: "not_found", message: "job not found" });
    try {
      const zipPath = await zipJob(id);
      const buf = fs.readFileSync(zipPath);
      return reply
        .header("content-type", "application/zip")
        .header("content-disposition", `attachment; filename="dataharvest-instant-${id}.zip"`)
        .send(buf);
    } catch (e: any) {
      return reply.code(500).send({ error: "internal_error", message: e?.message ?? "zip failed" });
    }
  });

  app.get("/api/instant/file/:id/:name", async (req, reply) => {
    const { id, name } = req.params as { id: string; name: string };
    // hard sanitize — same rules as the standalone app
    if (!/^[\w-]+$/.test(id) || !/^[\w .@()-]+$/.test(name)) {
      return reply.code(400).send({ error: "validation_error", message: "bad path" });
    }
    const fp = path.join(ROOT, id, name);
    if (!fp.startsWith(ROOT)) return reply.code(403).send({ error: "forbidden" });
    if (!fs.existsSync(fp)) return reply.code(404).send({ error: "not_found", message: "not found" });
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    return reply
      .header("content-type", MIME[ext] ?? "application/octet-stream")
      .header("content-disposition", `attachment; filename="${name}"`)
      .send(fs.readFileSync(fp));
  });
}
