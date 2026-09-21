import { PlaywrightCrawler, type Request } from "crawlee";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { llmExtractBatch } from "./llm.js";
import { heuristicExtract } from "./heuristic.js";
import { sleep } from "@dataharvest/core";
import type { RawExtractedRecord } from "@dataharvest/core";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.remove(["script", "style", "noscript", "nav", "footer", "aside"]);

export interface WebsiteOptions {
  startUrl: string;
  schemaFields: Array<{ name: string; type: string; description?: string; required?: boolean }>;
  prompt?: string;
  useAi: boolean;
  limit: number;
  onPage?: (url: string, records: RawExtractedRecord[]) => Promise<void>;
}

export async function scrapeWebsite(opts: WebsiteOptions): Promise<{ pages: Array<{ records: RawExtractedRecord[] }>; errors: string[] }> {
  const errors: string[] = [];
  const pages: Array<{ records: RawExtractedRecord[] }> = [];
  const seenUrls = new Set<string>();
  const maxItems = opts.limit;

  let requestCount = 0;

  const crawler = new PlaywrightCrawler({
    maxRequestRetries: 2,
    maxConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 120,
    launchContext: {
      launchOptions: {
        headless: true,
        args: ["--disable-dev-shm-usage", "--no-sandbox"]
      }
    },
    browserPoolOptions: {
      useFingerprints: true
    },
    preNavigationHooks: [
      async (_crawlingContext, gotoOptions) => {
        gotoOptions.waitUntil = "domcontentloaded";
        await sleep(200 + Math.floor(Math.random() * 600));
      }
    ],
    failedRequestHandler: ({ request, error }) => {
      const msg = `failed ${request.url}: ${(error as Error | undefined)?.message ?? "unknown"}`;
      errors.push(msg);
    }
  });

  const collected: Array<{ url: string; html: string; title: string }> = [];
  let stopEnqueuing = false;

  crawler.router.addDefaultHandler(async ({ request, enqueueLinks, $ }) => {
    if (requestCount >= maxItems || stopEnqueuing) return;
    requestCount++;
    seenUrls.add(request.url);

    const cheerioApi = $ as unknown as ReturnType<typeof import("cheerio").load>;
    const html = cheerioApi.html();
    const title = cheerioApi("title").first().text().trim() || request.url;
    collected.push({ url: request.url, html, title });

    if (requestCount < maxItems) {
      try {
        await enqueueLinks({
          strategy: "same-domain"
        });
      } catch {
        // enqueue may fail on non-html responses; ignore
      }
    } else {
      stopEnqueuing = true;
    }
  });

  await crawler.run([opts.startUrl]);

  for (const page of collected) {
    try {
      const records = await extractFromPage(page.url, page.html, opts);
      pages.push({ records });
      if (opts.onPage) await opts.onPage(page.url, records);
    } catch (err) {
      errors.push(`extract ${page.url}: ${(err as Error).message}`);
    }
  }

  return { pages, errors };
}

export async function extractFromPage(
  url: string,
  html: string,
  opts: WebsiteOptions
): Promise<RawExtractedRecord[]> {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const markdown = turndown.turndown($.html());
  const textLength = markdown.length;
  if (textLength < 30) return [];

  if (opts.useAi && hasLlmKey()) {
    const llmRecords = await llmExtractBatch(markdown.slice(0, 24000), opts.schemaFields, opts.prompt ?? "", url);
    if (llmRecords.length > 0) {
      return llmRecords.map((r) => ({
        payload: r,
        sourceUrl: url,
        confidenceScore: 0.9,
        provenance: {
          strategy: "llm",
          renderedAt: new Date().toISOString(),
          markdownChars: textLength
        }
      }));
    }
  }

  const heuristicRecords = heuristicExtract($, url);
  if (heuristicRecords.length > 0) {
    return heuristicRecords.map((r) => ({
      payload: r,
      sourceUrl: url,
      confidenceScore: 0.55,
      provenance: { strategy: "heuristic", renderedAt: new Date().toISOString() }
    }));
  }

  if (markdown.length > 100) {
    return [
      {
        payload: { title: $("title").first().text().trim() || url, content: markdown.slice(0, 8000), url },
        sourceUrl: url,
        confidenceScore: 0.3,
        provenance: { strategy: "markdown_fallback", renderedAt: new Date().toISOString() }
      }
    ];
  }
  return [];
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type { Request };
