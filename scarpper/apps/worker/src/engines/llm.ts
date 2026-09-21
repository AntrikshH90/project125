import type { SchemaField } from "@dataharvest/core";

const SYSTEM_PROMPT = `You are a precise data extraction engine. You receive page content (markdown) and a target schema.
Extract ALL items matching the schema from the content.

Rules:
- Output ONLY JSON: {"records": [ {field: value, ...}, ... ]}
- Use exactly the field names given. Missing values => null.
- numbers: plain numbers without currency symbols. arrays: list of strings.
- If the page contains a list/table of similar items, extract every item as one record.
- If nothing matches, output {"records": []}. Never invent data.`;

export interface SchemaFieldLike {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export async function llmExtractBatch(
  markdown: string,
  fields: SchemaFieldLike[],
  contextPrompt: string,
  sourceUrl: string
): Promise<Array<Record<string, unknown>>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const maxRecords = Number(process.env.EXTRACTION_LLM_MAX_RECORDS ?? 40);

  const schemaDescription = fields
    .map((f) => `- ${f.name} (${f.type})${f.description ? `: ${f.description}` : ""}${f.required ? " [required]" : ""}`)
    .join("\n");

  const userContent = `TARGET FIELDS:\n${schemaDescription}\n\nCONTEXT: ${contextPrompt || "Extract the main structured items from this page."}\nSOURCE_URL: ${sourceUrl}\n\nPAGE CONTENT (markdown):\n"""\n${markdown}\n"""`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      console.warn(`[llm] extraction failed: HTTP ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as { records?: unknown };
    if (!Array.isArray(parsed.records)) return [];

    return parsed.records
      .slice(0, maxRecords)
      .map((r) => coerceRecord(r as Record<string, unknown>, fields))
      .filter((r): r is Record<string, unknown> => r !== null);
  } catch (err) {
    console.warn(`[llm] extraction error: ${(err as Error).message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function coerceRecord(raw: Record<string, unknown>, fields: SchemaFieldLike[]): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, unknown> = {};
  let filled = 0;
  for (const f of fields) {
    const v = raw[f.name];
    if (v === undefined || v === null || v === "") {
      out[f.name] = null;
      continue;
    }
    switch (f.type) {
      case "number": {
        const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
        if (Number.isFinite(n)) {
          out[f.name] = n;
          filled++;
        } else out[f.name] = null;
        break;
      }
      case "boolean":
        out[f.name] = Boolean(v);
        filled++;
        break;
      case "array":
        if (Array.isArray(v)) {
          out[f.name] = v.map((x) => String(x));
          filled++;
        } else {
          const parts = String(v).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
          out[f.name] = parts.length > 1 ? parts : [String(v)];
          filled++;
        }
        break;
      default:
        out[f.name] = String(v);
        filled++;
    }
  }
  const requiredMissing = fields.some((f) => f.required && (out[f.name] === null || out[f.name] === undefined));
  if (requiredMissing || filled === 0) return null;
  return out;
}
