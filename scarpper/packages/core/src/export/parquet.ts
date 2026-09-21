import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { Writable } from "node:stream";
import { flattenRecord, unionColumns } from "./flatten.js";

function inferParquetType(values: unknown[]): string {
  const nonNull = values.filter((v) => v !== null && v !== undefined);
  if (nonNull.length === 0) return "UTF8";
  const allBool = nonNull.every((v) => typeof v === "boolean");
  if (allBool) return "BOOLEAN";
  const allNum = nonNull.every((v) => typeof v === "number" && Number.isFinite(v));
  if (allNum) return "DOUBLE";
  return "UTF8";
}

export async function buildParquet(rows: Record<string, unknown>[]): Promise<Buffer> {
  const flat = rows.map((r) => flattenRecord(r));
  const columns = unionColumns(flat);
  const schemaMap: Record<string, { type: string; optional: boolean }> = {};
  for (const col of columns) {
    const values = flat.map((r) => r[col]);
    schemaMap[col] = { type: inferParquetType(values), optional: true };
  }
  const schema = new ParquetSchema(schemaMap as never);

  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk);
      cb();
    }
  });

  const writer = await ParquetWriter.openStream(schema, sink as never, { useDataPageV2: false } as never);

  for (const row of flat) {
    const normalized: Record<string, unknown> = {};
    for (const col of columns) {
      const v = row[col];
      if (v === undefined) continue;
      normalized[col] = typeof v === "object" ? JSON.stringify(v) : v;
    }
    await writer.appendRow(normalized);
  }
  await writer.close();
  return Buffer.concat(chunks);
}
