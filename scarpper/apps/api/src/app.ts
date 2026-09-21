import "dotenv/config";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { registerCollectionRoutes } from "./routes/collections.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerStudioRoutes } from "./routes/studio.js";
import { registerArtifactRoutes } from "./routes/artifacts.js";
import { registerHarvestRoutes } from "./routes/harvest.js";
import { registerInstantRoutes } from "./routes/instant.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024
  });

  await app.register(cookie, { secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret" });

  await app.register(cors, {
    origin: (process.env.WEB_URL ?? "http://localhost:3000").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  app.get("/health", async () => {
    return { status: "ok", service: "dataharvest-api", time: new Date().toISOString() };
  });

  await registerAuthRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerCollectionRoutes(app);
  await registerRunRoutes(app);
  await registerStudioRoutes(app);
  await registerArtifactRoutes(app);
  await registerHarvestRoutes(app);
  await registerInstantRoutes(app);

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) req.log.error(err);
    else req.log.warn(String(err));
    reply.code(statusCode).send({
      error: statusCode >= 500 ? "internal_error" : "request_error",
      message: statusCode >= 500 ? "Something went wrong" : err.message
    });
  });

  return app;
}
