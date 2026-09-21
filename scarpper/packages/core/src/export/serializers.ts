import Papa from "papaparse";
import { flattenRecord, unionColumns } from "./flatten.js";

export interface ExportRow {
  [key: string]: unknown;
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const flat = rows.map((r) => flattenRecord(r));
  const columns = unionColumns(flat);
  const normalized = flat.map((r) => {
    const out: Record<string, unknown> = {};
    for (const c of columns) out[c] = r[c] ?? "";
    return out;
  });
  return Papa.unparse(normalized, { header: true, quotes: true });
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function toJsonl(rows: ExportRow[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function asAuthors(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(" and ");
  return String(v);
}

function extractYear(row: Record<string, unknown>): string {
  const raw = pick(row, ["year", "publication_date", "published", "date", "created_at"]);
  if (raw === undefined) return String(new Date().getFullYear());
  const m = String(raw).match(/(19|20)\d{2}/);
  return m ? m[0] : String(new Date().getFullYear());
}

export function toBibtex(rows: ExportRow[]): string {
  return rows
    .map((row, i) => {
      const title = String(pick(row, ["title", "name", "headline", "paper_title"]) ?? `Untitled record ${i + 1}`);
      const author = asAuthors(pick(row, ["authors", "author", "creators"]) ?? "Unknown");
      const year = extractYear(row);
      const url = pick(row, ["url", "source_url", "link", "sourceUrl"]);
      const abstract = pick(row, ["abstract", "summary", "description", "findings"]);
      const key = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "entry"}${year}`;
      const lines = [
        `@misc{${key},`,
        `  title        = {${String(title).replace(/[{}]/g, "")}},`,
        `  author       = {${author.replace(/[{}]/g, "")}},`,
        `  year         = {${year}}`
      ];
      if (url) lines.push(`  url          = {${String(url)}}`);
      if (abstract) lines.push(`  abstract     = {${String(abstract).replace(/[{}]/g, "").slice(0, 500)}}`);
      lines.push(`  note         = {Harvested via DataHarvest}`, `}`);
      return lines.join("\n");
    })
    .join("\n\n") + "\n";
}

export function serialize(
  format: "csv" | "json" | "jsonl" | "parquet" | "bibtex",
  rows: ExportRow[]
): Buffer {
  switch (format) {
    case "csv":
      return Buffer.from(toCsv(rows), "utf-8");
    case "json":
      return Buffer.from(toJson(rows), "utf-8");
    case "jsonl":
      return Buffer.from(toJsonl(rows), "utf-8");
    case "bibtex":
      return Buffer.from(toBibtex(rows), "utf-8");
    case "parquet":
      throw new Error("Parquet must be generated via buildParquet()");
  }
}
