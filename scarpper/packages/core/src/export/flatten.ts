export function flattenRecord(
  input: unknown,
  prefix = "",
  out: Record<string, unknown> = {}
): Record<string, unknown> {
  if (input === null || input === undefined) return out;
  if (Array.isArray(input)) {
    if (input.every((v) => typeof v !== "object" || v === null)) {
      out[prefix || "value"] = input.map((v) => String(v)).join(" | ");
    } else if (prefix) {
      out[prefix] = JSON.stringify(input);
    } else {
      input.forEach((v, i) => flattenRecord(v, prefix ? `${prefix}.${i}` : String(i), out));
    }
    return out;
  }
  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object") flattenRecord(v, key, out);
      else out[key] = v;
    }
    return out;
  }
  out[prefix || "value"] = input;
  return out;
}

export function unionColumns(flatRows: Array<Record<string, unknown>>): string[] {
  const cols: string[] = [];
  for (const r of flatRows) {
    for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  }
  return cols;
}

export function coerceScalars(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = null;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = String(v);
  }
  return out;
}
