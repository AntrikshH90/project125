import "dotenv/config";
import { buildApp } from "./app.js";
import { pruneExpiredSessions } from "./auth/session.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`DataHarvest API listening on http://${HOST}:${PORT}`);

  setInterval(() => {
    pruneExpiredSessions().catch((err) => app.log.error({ err }, "session prune failed"));
  }, 1000 * 60 * 60).unref();
}

main().catch((err) => {
  console.error("Fatal: API failed to start", err);
  process.exit(1);
});
