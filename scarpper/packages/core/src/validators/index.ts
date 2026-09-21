import { z } from "zod";

export const SOURCE_TYPES = [
  "website",
  "arxiv",
  "huggingface",
  "github",
  "pdf",
  "api_endpoint"
] as const;

export const EXPORT_FORMATS = ["csv", "json", "jsonl", "parquet", "bibtex"] as const;

export const RUN_STATUSES = [
  "queued",
  "running",
  "pausing",
  "paused",
  "cancelling",
  "cancelled",
  "completed",
  "completed_with_errors",
  "failed"
] as const;

export const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;

export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export const exportFormatSchema = z.enum(EXPORT_FORMATS);
export const memberRoleSchema = z.enum(MEMBER_ROLES);

export const schemaFieldSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Field name must be a valid identifier"),
  type: z.enum(["string", "number", "boolean", "array"]),
  description: z.string().optional(),
  required: z.boolean().default(false)
});

export const schemaDefinitionSchema = z.object({
  fields: z.array(schemaFieldSchema).min(1),
  prompt: z.string().optional(),
  itemSelector: z.string().optional()
});

export type SchemaDefinition = z.infer<typeof schemaDefinitionSchema>;
export type SchemaField = z.infer<typeof schemaFieldSchema>;

export const sourceConfigSchema = z.object({
  maxPages: z.number().int().min(1).max(100000).optional(),
  maxDepth: z.number().int().min(0).max(10).optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  useAiExtraction: z.boolean().optional(),
  stealth: z.boolean().optional(),
  proxyUrl: z.string().optional(),
  maxItems: z.number().int().min(1).max(100000).optional()
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100)
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  schemaDefinition: schemaDefinitionSchema
});

export const addSourceSchema = z.object({
  type: sourceTypeSchema,
  targetUrl: z.string().url(),
  config: sourceConfigSchema.optional()
});

export const createRunSchema = z.object({
  sourceIds: z.array(z.string().uuid()).min(1).optional(),
  pageBudget: z.number().int().min(1).max(200000).optional(),
  preview: z.boolean().optional()
});

export const runActionSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"])
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: memberRoleSchema.default("member")
});

export const respondInviteSchema = z.object({
  action: z.enum(["accept", "decline"])
});

export const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: memberRoleSchema
});

export const exportRequestSchema = z.object({
  format: exportFormatSchema,
  runId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500000).optional()
});

export const generateSchemaSchema = z.object({
  url: z.string().url().optional(),
  prompt: z.string().min(10).max(2000)
});

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const workspaceParamSchema = z.object({
  wsId: z.string().uuid()
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const recordsQuerySchema = listQuerySchema.extend({
  search: z.string().optional(),
  runId: z.string().uuid().optional()
});
