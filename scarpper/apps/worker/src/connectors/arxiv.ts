import type { SchemaFieldLike } from "../types.js";

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: Array<{ name: string }>;
  links: Array<{ href: string; type?: string; rel?: string }>;
  "arxiv:primary_category": { term: string };
  categories: Array<{ term: string }>;
}

export async function scrapeArxiv(
  targetUrl: string,
  _fields: SchemaFieldLike[],
  limit: number
): Promise<{ pages: Array<{ records: Array<Record<string, unknown>> }>; errors: string[] }> {
  const errors: string[] = [];
  try {
    const { searchQuery, maxResults } = parseArxivUrl(targetUrl, limit);
    const api = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${Math.min(maxResults, 200)}&sortBy=submittedDate&sortOrder=descending`;

    const res = await fetch(api, { headers: { "User-Agent": "DataHarvest/1.0 (research tool)" } });
    if (!res.ok) throw new Error(`arXiv API responded ${res.status}`);
    const xml = await res.text();
    const entries = parseAtomFeed(xml);

    const records = entries.slice(0, limit).map((entry) => ({
      title: entry.title.replace(/\s+/g, " ").trim(),
      authors: entry.authors.map((a) => a.name),
      abstract: entry.summary.replace(/\s+/g, " ").trim(),
      published: entry.published,
      updated: entry.updated,
      primary_category: entry["arxiv:primary_category"]?.term ?? null,
      categories: entry.categories?.map((c) => c.term) ?? [],
      pdf_url: entry.links?.find((l) => l.type === "application/pdf")?.href ?? null,
      url: entry.id,
      _source: "arxiv"
    }));

    return { pages: [{ records }], errors };
  } catch (err) {
    errors.push(`arxiv: ${(err as Error).message}`);
    return { pages: [{ records: [] }], errors };
  }
}

function parseArxivUrl(targetUrl: string, limit: number): { searchQuery: string; maxResults: number } {
  try {
    const u = new URL(targetUrl);
    const q = u.searchParams.get("q") ?? u.searchParams.get("search_query");
    if (q) return { searchQuery: q, maxResults: limit };
    const listMatch = targetUrl.match(/arxiv\.org\/list\/([a-z-]+)\/?(?:\d{4})?/i);
    if (listMatch) return { searchQuery: `cat:${listMatch[1].toUpperCase().replace("-", ".")}`, maxResults: limit };
    const absMatch = targetUrl.match(/arxiv\.org\/(?:abs|pdf)\/([0-9v.]+)/i);
    if (absMatch) return { searchQuery: `id_list=${absMatch[1]}`, maxResults: 1 };
  } catch {
    // fallthrough
  }
  return { searchQuery: "cat:cs.AI", maxResults: Math.min(limit, 100) };
}

function parseAtomFeed(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryBlocks = xml.split("<entry>").slice(1);
  for (const block of entryBlocks) {
    const text = block.split("</entry>")[0];
    const tag = (name: string): string => {
      const m = text.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
      return m ? m[1].trim() : "";
    };
    const authors = [...text.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map((m) => ({
      name: m[1].trim()
    }));
    const categories = [...text.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => ({ term: m[1] }));
    const links = [...text.matchAll(/<link[^>]*href="([^"]+)"(?:[^>]*type="([^"]+)")?[^>]*\/>/g)].map((m) => ({
      href: m[1],
      type: m[2]
    }));
    const primary = text.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
    entries.push({
      id: tag("id"),
      title: tag("title"),
      summary: tag("summary"),
      published: tag("published"),
      updated: tag("updated"),
      authors,
      links,
      "arxiv:primary_category": { term: primary ? primary[1] : "" },
      categories
    });
  }
  return entries;
}
