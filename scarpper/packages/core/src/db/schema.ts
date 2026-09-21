import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
export type RunStatus = (typeof RUN_STATUSES)[number];

export const SOURCE_TYPES = [
  "website",
  "arxiv",
  "huggingface",
  "github",
  "pdf",
  "api_endpoint"
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const EXPORT_FORMATS = ["csv", "json", "jsonl", "parquet", "bibtex"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  password: text("password"),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: MEMBER_ROLES })
      .$type<MemberRole>()
      .default("member")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("user_workspace_unique").on(t.workspaceId, t.userId)]
);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: MEMBER_ROLES })
    .$type<MemberRole>()
    .default("member")
    .notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  status: text("status", { enum: ["pending", "accepted", "revoked"] })
    .$type<"pending" | "accepted" | "revoked">()
    .default("pending")
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    schemaDefinition: jsonb("schema_definition").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("collections_ws_idx").on(t.workspaceId)]
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    type: text("type", { enum: SOURCE_TYPES }).$type<SourceType>().notNull(),
    targetUrl: text("target_url").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("sources_collection_idx").on(t.collectionId)]
);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
    status: text("status", { enum: RUN_STATUSES })
      .$type<RunStatus>()
      .default("queued")
      .notNull(),
    totalPagesBudget: integer("total_pages_budget").default(500).notNull(),
    pagesProcessed: integer("pages_processed").default(0).notNull(),
    recordsExtracted: integer("records_extracted").default(0).notNull(),
    recordsFailed: integer("records_failed").default(0).notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("runs_ws_status_idx").on(t.workspaceId, t.status),
    index("runs_collection_idx").on(t.collectionId)
  ]
);

export const runEvents = pgTable(
  "run_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    level: text("level", { enum: ["debug", "info", "warn", "error"] })
      .$type<"debug" | "info" | "warn" | "error">()
      .default("info")
      .notNull(),
    message: text("message").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("run_events_run_idx").on(t.runId, t.createdAt)]
);

export const extractedRecords = pgTable(
  "extracted_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    contentHash: text("content_hash").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    confidenceScore: real("confidence_score"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("records_coll_hash_idx").on(t.collectionId, t.contentHash),
    index("records_ws_idx").on(t.workspaceId),
    index("records_run_idx").on(t.runId)
  ]
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
    format: text("format", { enum: EXPORT_FORMATS }).$type<ExportFormat>().notNull(),
    s3Key: text("s3_key").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    recordCount: integer("record_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("artifacts_collection_idx").on(t.collectionId)]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("audit_ws_idx").on(t.workspaceId, t.createdAt)]
);

export const rateLimits = pgTable("rate_limits", {
  domain: text("domain").primaryKey(),
  minDelayMs: integer("min_delay_ms").default(1000).notNull(),
  maxConcurrent: integer("max_concurrent").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull()
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunEvent = typeof runEvents.$inferSelect;
export type ExtractedRecord = typeof extractedRecords.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
