import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export function heuristicExtract($: CheerioAPI, pageUrl: string): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];

  const jsonLd = extractJsonLd($);
  for (const item of jsonLd) {
    const rec = flattenJsonLd(item);
    if (rec && Object.keys(rec).length >= 2) {
      rec._source = "json-ld";
      records.push(rec);
    }
  }

  if (records.length > 0) return records.slice(0, 100);

  const tableRecords = extractTables($);
  if (tableRecords.length > 0) {
    for (const rec of tableRecords) rec._source = "table";
    return tableRecords.slice(0, 200);
  }

  const listRecords = extractRepeatingLists($);
  for (const rec of listRecords) rec._source = "list";
  if (listRecords.length > 0) return listRecords.slice(0, 200);

  const article = extractArticle($, pageUrl);
  return article ? [article] : [];
}

function extractJsonLd($: CheerioAPI): unknown[] {
  const items: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text().trim();
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) items.push(...parsed);
      else if (typeof parsed === "object" && parsed !== null) {
        if ("@graph" in (parsed as Record<string, unknown>) && Array.isArray((parsed as Record<string, unknown>)["@graph"])) {
          items.push(...((parsed as Record<string, unknown>)["@graph"] as unknown[]));
        } else items.push(parsed);
      }
    } catch {
      // malformed json-ld; skip
    }
  });
  return items;
}

function flattenJsonLd(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof obj.name === "string") out.title = obj.name;
  if (typeof obj.headline === "string") out.title ??= obj.headline;
  if (typeof obj.description === "string") out.description = obj.description;
  if (typeof obj.abstract === "string") out.abstract = obj.abstract;
  if (typeof obj.datePublished === "string") out.published = obj.datePublished;
  if (typeof obj.url === "string") out.url = obj.url;
  if (typeof obj.price === "number" || typeof obj.price === "string") out.price = obj.price;
  if (Array.isArray(obj.author)) {
    out.authors = obj.author.map((a) =>
      typeof a === "string" ? a : typeof a === "object" && a !== null && "name" in (a as Record<string, unknown>) ? String((a as Record<string, unknown>).name) : String(a)
    );
  } else if (typeof obj.author === "object" && obj.author !== null && "name" in (obj.author as Record<string, unknown>)) {
    out.authors = [String((obj.author as Record<string, unknown>).name)];
  } else if (typeof obj.author === "string") {
    out.authors = [obj.author];
  }

  return Object.keys(out).length >= 2 ? out : null;
}

function extractTables($: CheerioAPI): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  $("table").each((_, table) => {
    const $table = $(table);
    const headers: string[] = [];
    $table.find("thead th, thead td").each((_i, th) => {
      headers.push(normalizeKey($(th).text()));
    });
    if (headers.length === 0) {
      $table.find("tr").first().find("th, td").each((_i, th) => {
        headers.push(normalizeKey($(th).text()));
        return true;
      });
    }
    const cleanHeaders = headers.filter(Boolean);
    if (cleanHeaders.length < 2) return;

    const bodyRows = headers.length > 0 ? $table.find("tbody tr") : $table.find("tr").slice(1);
    if (bodyRows.length === 0) return;

    bodyRows.each((_, tr) => {
      const cells: string[] = [];
      $(tr).find("td, th").each((_i, td) => {
        cells.push($(td).text().trim());
        return true;
      });
      if (cells.every((c) => !c)) return;
      const rec: Record<string, unknown> = {};
      cleanHeaders.forEach((h, i) => {
        if (h) rec[h] = cells[i] ?? null;
      });
      if (Object.keys(rec).length >= 2) records.push(rec);
    });
  });
  return records;
}

function extractRepeatingLists($: CheerioAPI): Array<Record<string, unknown>> {
  const candidates = [
    "article",
    "[class*='card']",
    "[class*='product']",
    "[class*='item']",
    "[class*='result']",
    "[class*='post']",
    "li[class]"
  ];

  for (const selector of candidates) {
    const nodes = $(selector);
    if (nodes.length < 3) continue;

    const records: Array<Record<string, unknown>> = [];
    nodes.slice(0, 150).each((_, node) => {
      const $n = $(node);
      const title =
        $n.find("h1, h2, h3, h4, [class*='title']").first().text().trim() ||
        $n.find("a").first().text().trim();
      if (!title || title.length < 3) return;
      const rec: Record<string, unknown> = {
        title,
        description: $n.find("p, [class*='description'], [class*='summary']").first().text().trim().slice(0, 1000) || null,
        url: absolutize($n.find("a[href]").first().attr("href"), $)
      };
      if (Object.values(rec).filter((v) => v).length >= 2) records.push(rec);
    });
    if (records.length >= 3) return records;
  }
  return [];
}

function extractArticle($: CheerioAPI, pageUrl: string): Record<string, unknown> | null {
  const title = $("h1").first().text().trim() || $("title").text().trim();
  if (!title) return null;
  const paragraphs = $("article p, main p, p")
    .map((_, p) => $(p).text().trim())
    .get()
    .filter((t) => t.length > 40)
    .slice(0, 10);
  if (paragraphs.length === 0) return null;
  return {
    title,
    description: paragraphs.join("\n\n").slice(0, 4000),
    url: pageUrl,
    _source: "article"
  };
}

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function absolutize(href: string | undefined, $: CheerioAPI): string | null {
  if (!href) return null;
  try {
    return new URL(href, $("base[href]").attr("href") ?? undefined).toString();
  } catch {
    return null;
  }
}
