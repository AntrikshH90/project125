import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://dataharvest:dataharvest@localhost:5432/dataharvest"
  },
  strict: false,
  verbose: true
});
