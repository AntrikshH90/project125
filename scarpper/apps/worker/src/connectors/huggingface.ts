import type { SchemaFieldLike } from "../types.js";

const HF_API = "https://datasets-server.huggingface.co";
const HF_HUB = "https://huggingface.co/api/datasets";

export async function scrapeHuggingFace(
  targetUrl: string,
  _fields: SchemaFieldLike[],
  limit: number
): Promise<{ pages: Array<{ records: Array<Record<string, unknown>> }>; errors: string[] }> {
  const errors: string[] = [];
  try {
    const datasetId = parseDatasetId(targetUrl);
    if (!datasetId) throw new Error("URL is not a Hugging Face dataset (expected huggingface.co/datasets/{id})");

    const headers: Record<string, string> = { "User-Agent": "DataHarvest/1.0" };
    if (process.env.HUGGINGFACE_TOKEN) headers.Authorization = `Bearer ${process.env.HUGGINGFACE_TOKEN}`;

    const metaRes = await fetch(`${HF_HUB}/${datasetId}`, { headers });
    const meta = metaRes.ok ? ((await metaRes.json()) as Record<string, unknown>) : {};

    const rowsRes = await fetch(`${HF_API}/rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=train&offset=0&length=${Math.min(limit, 100)}`, { headers });

    let records: Array<Record<string, unknown>> = [];
    if (rowsRes.ok) {
      const rowsBody = (await rowsRes.json()) as { rows?: Array<{ row: Record<string, unknown> }> };
      records = (rowsBody.rows ?? []).map((r) => scalarize(r.row, datasetId));
    } else {
      errors.push(`datasets-server rows: HTTP ${rowsRes.status} (dataset may need streaming config)`);
    }

    const metaRecord: Record<string, unknown> = {
      kind: "dataset_info",
      dataset_id: datasetId,
      description: meta.description ?? null,
      downloads: meta.downloads ?? null,
      likes: meta.likes ?? null,
      tags: meta.tags ?? [],
      url: `https://huggingface.co/datasets/${datasetId}`,
      _source: "huggingface"
    };

    return { pages: [{ records: [metaRecord, ...records] }], errors };
  } catch (err) {
    errors.push(`huggingface: ${(err as Error).message}`);
    return { pages: [{ records: [] }], errors };
  }
}

function parseDatasetId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("huggingface.co")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const dsIdx = parts.indexOf("datasets");
    if (dsIdx >= 0 && parts.length > dsIdx + 1) return parts.slice(dsIdx + 1, dsIdx + 3).join("/");
    return null;
  } catch {
    return null;
  }
}

function scalarize(row: Record<string, unknown>, datasetId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { dataset_id: datasetId, _source: "huggingface" };
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = null;
    else if (typeof v === "object") out[k] = JSON.stringify(v).slice(0, 2000);
    else out[k] = v;
  }
  return out;
}
