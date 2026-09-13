// ── HTTP API: create runs, stream events (SSE), fetch results ──────────

import express from "express";
import { config } from "./config.js";
import { Engine } from "./engine.js";
import type { RunEvent } from "./types.js";

export function createServer(): express.Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // SSE fan-out per run
  const subscribers = new Map<string, Set<(ev: RunEvent) => void>>();
  const engine = new Engine((runId, ev) => {
    for (const fn of subscribers.get(runId) || []) {
      try { fn(ev); } catch { /* dead client */ }
    }
  });

  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  // CORS preflight
  app.options("/*splat", (_req, res) => res.sendStatus(204));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      providers: engine.providersInfo(),
      github: !!config.githubToken,
      nebius: !!config.nebiusApiKey,
    });
  });

  app.get("/api/runs", (_req, res) => {
    res.json(engine.listRuns());
  });

  app.post("/api/runs", (req, res) => {
    const { task, repoUrl, ref, baseBranch } = req.body || {};
    if (!task || !repoUrl) {
      res.status(400).json({ error: "task and repoUrl required" });
      return;
    }
    if (!/^https?:\/\/(www\.)?github\.com\//.test(repoUrl)) {
      res.status(400).json({ error: "repoUrl must be a GitHub https url" });
      return;
    }
    // launch in background; client polls /api/runs/:id (or SSE) for live events
    const rec = engine.start(task, repoUrl, { ref, baseBranch });
    res.status(202).json({ id: rec.id, status: rec.status });
  });

  // SSE: stream a run's events (replay + live)
  app.get("/api/runs/:id/events", (req, res) => {
    const id = req.params.id;
    const rec = engine.getRun(id);
    if (!rec) { res.status(404).json({ error: "run not found" }); return; }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify({ run: sanitizeSnapshot(rec) })}\n\n`);
    for (const ev of rec.events) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }
    if (rec.status !== "running" && rec.status !== "queued") {
      res.write(`event: done\ndata: ${JSON.stringify({ status: rec.status })}\n\n`);
      res.end();
      return;
    }
    const fn = (ev: RunEvent) => {
      try {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
        if (ev.type === "run_finished") {
          res.write(`event: done\ndata: ${JSON.stringify({ status: ev.status })}\n\n`);
          res.end();
        }
      } catch { /* ignore */ }
    };
    let subs = subscribers.get(id);
    if (!subs) { subs = new Set(); subscribers.set(id, subs); }
    subs.add(fn);
    req.on("close", () => subs?.delete(fn));
  });

  app.get("/api/runs/:id", (req, res) => {
    const rec = engine.getRun(req.params.id);
    if (!rec) { res.status(404).json({ error: "run not found" }); return; }
    // full record INCLUDING events (dashboard timeline needs them)
    const { branchTree, events, stats, ...rest } = rec;
    res.json({
      ...rest,
      events: events.map(trimEvent),
      branchTree,
      stats,
    });
  });

  return app;
}

/** snapshot for SSE replay: light version without heavy stdout blobs */
function sanitizeSnapshot(rec: import("./types.js").RunRecord) {
  const { events, ...rest } = rec;
  return { ...rest, eventCount: events.length };
}

/** keep events small enough for a snappy payload but rich enough for the UI */
function trimEvent(ev: RunEvent): RunEvent {
  if (ev.type === "test_run") {
    return {
      ...ev,
      outcome: {
        ...ev.outcome,
        stdout: ev.outcome.stdout.slice(0, 400),
        stderr: ev.outcome.stderr.slice(0, 400),
      },
    } as RunEvent;
  }
  if (ev.type === "sandbox_ready") {
    return { ...ev, detail: String(ev.detail || "").slice(0, 200) } as RunEvent;
  }
  return ev;
}

export { config };
