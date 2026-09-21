import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>;

export function createDb(url: string) {
  const client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = createDb(url);
  }
  return _db;
}

export { schema };
