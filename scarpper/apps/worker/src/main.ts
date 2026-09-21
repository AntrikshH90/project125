import { Worker, type Job } from "bullmq";
import { QUEUES, connectionFromUrl, type RunJobPayload, type ControlJobPayload, type ExportJobPayload } from "@dataharvest/core";
import { executeRun } from "./pipeline/run.js";
import { handleControl } from "./pipeline/control.js";
import { handleExport } from "./pipeline/export.js";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = connectionFromUrl(redisUrl);
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

const shutdown = { stopping: false };

const runWorker = new Worker<RunJobPayload>(
  QUEUES.runs,
  async (job: Job<RunJobPayload>) => {
    if (shutdown.stopping) throw new Error("Worker shutting down");
    await executeRun(job.data);
    return { ok: true };
  },
  {
    connection,
    concurrency,
    lockDuration: 5 * 60 * 1000,
    lockRenewTime: 30 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 2
  }
);

const controlWorker = new Worker<ControlJobPayload>(
  QUEUES.controls,
  async (job: Job<ControlJobPayload>) => {
    await handleControl(job.data);
    return { ok: true };
  },
  { connection, concurrency: 4 }
);

const exportWorker = new Worker<ExportJobPayload>(
  QUEUES.exports,
  async (job: Job<ExportJobPayload>) => {
    await handleExport(job.data);
    return { ok: true };
  },
  { connection, concurrency: 2 }
);

runWorker.on("failed", (job, err) => {
  console.error(`[runs] job ${job?.id} failed:`, err.message);
});
controlWorker.on("failed", (job, err) => {
  console.error(`[controls] job ${job?.id} failed:`, err.message);
});
exportWorker.on("failed", (job, err) => {
  console.error(`[exports] job ${job?.id} failed:`, err.message);
});

for (const w of [runWorker, controlWorker, exportWorker]) {
  w.on("error", (err) => console.error(`[worker:${w.name}] error:`, err.message));
}

console.log(`DataHarvest worker cluster online (concurrency=${concurrency})`);
console.log(`  queues: ${Object.values(QUEUES).join(", ")}`);

async function graceful(signal: string) {
  if (shutdown.stopping) return;
  shutdown.stopping = true;
  console.log(`\n${signal} received: draining workers...`);
  await Promise.allSettled([runWorker.close(), controlWorker.close(), exportWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => graceful("SIGINT"));
process.on("SIGTERM", () => graceful("SIGTERM"));
