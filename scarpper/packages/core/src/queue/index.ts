import { Queue, QueueEvents, type ConnectionOptions } from "bullmq";
import type {
  ControlJobPayload,
  ExportJobPayload,
  JobType,
  RunJobPayload
} from "../types/index.js";

export const QUEUES = {
  runs: "dataharvest-runs",
  exports: "dataharvest-exports",
  controls: "dataharvest-controls"
} as const;

export function connectionFromUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null
  };
}

function getRedisUrl(): string {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return url;
}

export function createQueue<T>(name: string) {
  const connection = connectionFromUrl(getRedisUrl());
  return new Queue<T>(name, { connection });
}

export function createQueueEvents(name: string) {
  const connection = connectionFromUrl(getRedisUrl());
  return new QueueEvents(name, { connection });
}

export async function enqueueRun(payload: RunJobPayload) {
  const queue = createQueue<RunJobPayload>(QUEUES.runs);
  try {
    const job = await queue.add("run:execute", payload, {
      jobId: `run-${payload.runId}`,
      attempts: 1,
      removeOnComplete: 500,
      removeOnFail: 500
    });
    return job;
  } finally {
    await queue.close();
  }
}

export async function enqueueExport(payload: ExportJobPayload) {
  const queue = createQueue<ExportJobPayload>(QUEUES.exports);
  try {
    const job = await queue.add("export:generate", payload, {
      jobId: `exp-${payload.artifactId}`,
      attempts: 2,
      removeOnComplete: 500,
      removeOnFail: 500
    });
    return job;
  } finally {
    await queue.close();
  }
}

export async function enqueueControl(payload: ControlJobPayload) {
  const queue = createQueue<ControlJobPayload>(QUEUES.controls);
  try {
    const job = await queue.add("run:control", payload, {
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 200
    });
    return job;
  } finally {
    await queue.close();
  }
}

export type { JobType };
