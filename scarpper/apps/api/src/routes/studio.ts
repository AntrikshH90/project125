import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateSchemaFromPrompt } from "../services/schema-gen.js";

const genBody = z.object({
  prompt: z.string().min(10).max(2000),
  url: z.string().url().optional()
});

export function registerStudioRoutes(app: FastifyInstance) {
  app.post("/api/studio/generate-schema", async (req, reply) => {
    const { requireAuth } = await import("../auth/guards.js");
    if (!(await requireAuth(req, reply))) return reply;

    const parsed = genBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Provide a prompt of at least 10 characters describing what to extract"
      });
    }
    const result = await generateSchemaFromPrompt(parsed.data.prompt, parsed.data.url);
    return reply.send(result);
  });
}
