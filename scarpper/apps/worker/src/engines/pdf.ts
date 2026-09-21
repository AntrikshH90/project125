import pdfParse from "pdf-parse";
import { heuristicTableFromText } from "./pdf-tables.js";

export async function extractPdf(
  targetUrl: string,
  fields: Array<{ name: string; type: string; description?: string; required?: boolean }>
): Promise<{ pages: Array<{ records: Array<Record<string, unknown>> }>; errors: string[] }> {
  const errors: string[] = [];
  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "DataHarvest/1.0" }
    });
    if (!res.ok) throw new Error(`PDF download failed: HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdfParse(buffer);
    const text: string = parsed.text ?? "";
    const info = parsed.info ?? {};

    const record: Record<string, unknown> = {
      title: info.Title ?? guessTitleFromUrl(targetUrl),
      author: info.Author ?? null,
      pages: parsed.numpages,
      content_preview: text.slice(0, 5000),
      url: targetUrl,
      _source: "pdf"
    };

    const tables = heuristicTableFromText(text);
    const records: Array<Record<string, unknown>> = [record, ...tables.map((t, i) => ({ ...t, _table_index: i, _source: "pdf_table" }))];

    void fields;
    return { pages: [{ records }], errors };
  } catch (err) {
    errors.push(`pdf: ${(err as Error).message}`);
    return { pages: [{ records: [] }], errors };
  }
}

function guessTitleFromUrl(url: string): string {
  try {
    const name = new URL(url).pathname.split("/").pop() ?? url;
    return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
  } catch {
    return url;
  }
}
