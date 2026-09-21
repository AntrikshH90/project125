import { getDb, users, workspaces, workspaceMemberships, collections, sources, runs, extractedRecords, runEvents, artifacts, auditLogs, sources as sourcesTable } from "@dataharvest/core";
import { eq, and, count, desc, gte, sql } from "drizzle-orm";
import { slugify } from "@dataharvest/core";

export async function signUpUser(name: string, email: string, password: string) {
  const db = getDb();
  const { hashPassword } = await import("../auth/session.js");
  const passwordHash = await hashPassword(password);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name, email: email.toLowerCase(), passwordHash })
      .returning();

    const baseSlug = slugify(name || "workspace");
    let slug = baseSlug;
    let attempt = 1;
    while (attempt < 10) {
      const existing = await tx.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
      if (existing.length === 0) break;
      slug = `${baseSlug}-${attempt++}`;
    }

    const [ws] = await tx
      .insert(workspaces)
      .values({ name: `${name.split(" ")[0]}'s Workspace`, slug, ownerId: user.id })
      .returning();

    await tx.insert(workspaceMemberships).values({
      workspaceId: ws.id,
      userId: user.id,
      role: "owner"
    });

    await tx.insert(collections).values({
      workspaceId: ws.id,
      name: "Demo: arXiv ML Papers",
      description: "Sample collection showing AI-assisted paper metadata extraction.",
      schemaDefinition: {
        fields: [
          { name: "title", type: "string", required: true, description: "Paper title" },
          { name: "authors", type: "array", description: "Author names" },
          { name: "published", type: "string", description: "Publication date" },
          { name: "abstract", type: "string", description: "Full abstract" },
          { name: "primary_category", type: "string", description: "arXiv category" }
        ],
        prompt: "Extract research paper metadata including title, authors, publication date, abstract and primary category."
      }
    });

    return { user, workspace: ws };
  });
}

export async function signInUser(email: string, password: string) {
  const db = getDb();
  const { verifyPassword } = await import("../auth/session.js");
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const user = rows[0];
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function workspaceOverview(workspaceId: string) {
  const db = getDb();
  const dayAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);

  const [activeRuns] = await db
    .select({ value: count() })
    .from(runs)
    .where(and(eq(runs.workspaceId, workspaceId), sql`${runs.status} in ('queued','running','pausing','paused')`));

  const [records24h] = await db
    .select({ value: count() })
    .from(extractedRecords)
    .where(and(eq(extractedRecords.workspaceId, workspaceId), gte(extractedRecords.createdAt, dayAgo)));

  const [totalRecords] = await db
    .select({ value: count() })
    .from(extractedRecords)
    .where(eq(extractedRecords.workspaceId, workspaceId));

  const [collectionsCount] = await db
    .select({ value: count() })
    .from(collections)
    .where(eq(collections.workspaceId, workspaceId));

  const [sourcesCount] = await db
    .select({ value: count() })
    .from(sourcesTable)
    .innerJoin(collections, eq(sourcesTable.collectionId, collections.id))
    .where(eq(collections.workspaceId, workspaceId));

  const statusRows = await db
    .select({ status: runs.status, value: count() })
    .from(runs)
    .where(eq(runs.workspaceId, workspaceId))
    .groupBy(runs.status);

  const recentRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.workspaceId, workspaceId))
    .orderBy(desc(runs.createdAt))
    .limit(8);

  const recentEvents = await db
    .select({
      id: runEvents.id,
      runId: runEvents.runId,
      level: runEvents.level,
      message: runEvents.message,
      createdAt: runEvents.createdAt
    })
    .from(runEvents)
    .innerJoin(runs, eq(runEvents.runId, runs.id))
    .where(eq(runs.workspaceId, workspaceId))
    .orderBy(desc(runEvents.createdAt))
    .limit(25);

  const throughput = await db
    .select({
      hour: sql<string>`date_trunc('hour', ${extractedRecords.createdAt})`,
      value: count()
    })
    .from(extractedRecords)
    .where(and(eq(extractedRecords.workspaceId, workspaceId), gte(extractedRecords.createdAt, dayAgo)))
    .groupBy(sql`date_trunc('hour', ${extractedRecords.createdAt})`)
    .orderBy(sql`date_trunc('hour', ${extractedRecords.createdAt})`);

  const errorRuns = statusRows.find((r) => r.status === "failed")?.value ?? 0;
  const completedRuns = (statusRows.find((r) => r.status === "completed")?.value ?? 0) +
    (statusRows.find((r) => r.status === "completed_with_errors")?.value ?? 0);
  const totalRuns = statusRows.reduce((acc, r) => acc + Number(r.value), 0);
  const successRate = totalRuns === 0 ? 100 : Math.round(((completedRuns) / totalRuns) * 100);

  return {
    activeRuns: Number(activeRuns?.value ?? 0),
    records24h: Number(records24h?.value ?? 0),
    totalRecords: Number(totalRecords?.value ?? 0),
    collections: Number(collectionsCount?.value ?? 0),
    sources: Number(sourcesCount?.value ?? 0),
    successRate,
    runsByStatus: statusRows.map((r) => ({ status: r.status, count: Number(r.value) })),
    recentRuns,
    recentEvents,
    throughput: throughput.map((t) => ({ hour: t.hour, count: Number(t.value) }))
  };
}

export async function workspaceAudit(workspaceId: string, limit = 100) {
  const db = getDb();
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function workspaceArtifacts(workspaceId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.workspaceId, workspaceId))
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);
}
