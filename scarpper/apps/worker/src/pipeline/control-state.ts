import { Redis } from "ioredis";

let client: Redis | null = null;

function redis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: false
    });
  }
  return client;
}

const key = (runId: string, action: string) => `dh:runctl:${runId}:${action}`;
const TTL_SECONDS = 60 * 60 * 2;

export async function setFlag(runId: string, action: "pause" | "cancel", on: boolean): Promise<void> {
  if (on) await redis().set(key(runId, action), "1", "EX", TTL_SECONDS);
  else await redis().del(key(runId, action));
}

export async function isPaused(runId: string): Promise<boolean> {
  return (await redis().get(key(runId, "pause"))) === "1";
}

export async function isCancelled(runId: string): Promise<boolean> {
  return (await redis().get(key(runId, "cancel"))) === "1";
}

export async function clearFlags(runId: string): Promise<void> {
  await redis().del(key(runId, "pause"), key(runId, "cancel"));
}
