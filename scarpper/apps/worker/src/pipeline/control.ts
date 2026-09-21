import { getDb, runs, runEvents } from "@dataharvest/core";
import { eq } from "drizzle-orm";
import { setFlag, isPaused, isCancelled, clearFlags } from "./control-state.js";
import type { ControlJobPayload } from "@dataharvest/core";

export async function handleControl(payload: ControlJobPayload): Promise<void> {
  const { runId, action } = payload;
  const db = getDb();

  const rows = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  const run = rows[0];
  if (!run) return;

  switch (action) {
    case "pause":
      await setFlag(runId, "pause", true);
      await db.update(runs).set({ status: "paused" }).where(eq(runs.id, runId));
      await db.insert(runEvents).values({ runId, level: "warn", message: "Run paused by user" });
      break;
    case "resume":
      await setFlag(runId, "pause", false);
      await db.update(runs).set({ status: "running" }).where(eq(runs.id, runId));
      await db.insert(runEvents).values({ runId, level: "info", message: "Run resumed" });
      break;
    case "cancel":
      await setFlag(runId, "cancel", true);
      await setFlag(runId, "pause", false);
      await db.insert(runEvents).values({ runId, level: "warn", message: "Cancellation requested" });
      break;
  }
}

export { isPaused, isCancelled, clearFlags };
