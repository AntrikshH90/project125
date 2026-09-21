# Instant Scraper ⚡

Type what you want. Get the files. One box, zero config, keyless.

**Live:** `npm run dev` → http://localhost:3000

## What it does

| Ask | What you get |
|---|---|
| "20 papers on diffusion models with pdfs" | Real PDF files + `papers.csv` + `papers.bib` (arXiv, OpenAlex, Crossref, Semantic Scholar, Unpaywall) |
| "200000 rows of movie reviews for training" | Full dataset parquet files (native `pd.read_parquet` input) — or CSV + JSONL for small pulls (Hugging Face) |
| "github repos for web scraping, 15" | `repos.csv` (stars/topics/license) + every README as markdown |
| "30 images of neural network art" | Image files + `images.csv` with URLs/licenses (Openverse + Wikimedia, CC-licensed) |
| "scrape https://any-site.com" | Clean markdown of the page (cheerio + turndown) |
| "latest news on X" | DuckDuckGo search → top results scraped to markdown + `search-results.csv` |

## How it works

```
ask ──► intent classifier (pure heuristics, no LLM needed)
          │  papers / dataset / github / images / web + count parsing
          ▼
       job runner (async, file-backed state in downloads/<jobId>/job.json)
          │
          ├── papers:  5 APIs in parallel → merge/dedupe → Unpaywall PDF resolution
          │            → concurrent PDF download (validated %PDF magic bytes)
          ├── dataset: HF search (query cleaned of ML-noise words, both variants searched)
          │            → smart ranking (covers-ask boost, popularity, non-English demotion
          │              unless the user named the language)
          │            → ≥20k rows: direct parquet from HF CDN (no rate limits)
          │            → <20k rows: paged rows API with 429/503 retry → CSV + JSONL
          ├── github:  search API → READMEs (raw) → CSV
          ├── images:  Openverse (paginated) + Wikimedia Commons fallback → concurrent download
          └── web:     DuckDuckGo HTML search or direct URL → cheerio → turndown markdown
          ▼
       downloads/<jobId>/  ← browse + individual downloads, or one-click ZIP
```

## Endpoints

```
POST /api/ask/run           { ask: "..." }  → { jobId, plan, intent }
GET  /api/ask/status?id=…                     → live progress, logs, files, preview
GET  /api/ask/zip?id=…                        → ZIP of everything
GET  /api/ask/download/[id]/[name]            → single file (path-sanitized)
```

## Config

All optional — everything works keyless.

```
GITHUB_TOKEN=…     # GitHub: 60 → 5000 req/hr
HF_TOKEN=…         # Hugging Face: gated datasets + higher row-API limits
OPENAI_API_KEY=…   # any OpenAI-compatible key enables LLM intent parsing
OPENAI_BASE_URL=…  # e.g. https://api.tokenrouter.com/v1
OPENAI_MODEL=…     # e.g. z-ai/glm-5.3-free
```

With an LLM key: fuzzy/Hinglish asks like "mera thesis transformer efficiency ke
liye material chahiye" classify cleanly to topic "transformer efficiency" (verified:
30 PDFs in 50s). Without a key, the heuristic classifier handles keyword-style asks.

## Notes

- Job state is file-backed (`downloads/<id>/job.json`), so progress survives dev-server
  hot reloads and restarts.
- PDFs are validated (`%PDF` magic in first 1KB) before saving; HTML redirect stubs are rejected.
- arXiv's export API rate-limits bursts (429); the runner retries with backoff and falls
  back to the other four sources. Semantic Scholar is keyless-limited too — both are bonus sources.
- Row pulls that fail mid-page retry (429/503) instead of silently truncating.
- File serving blocks path traversal (`..` rejected server-side).

## Verified working (2026-09-12)

- Papers: 4 real PDFs + CSV + BibTeX for "graph neural networks" in ~2 min (arXiv was rate-limiting the test IP; OpenAlex + Unpaywall carried it)
- Dataset: 50k-row IMDB parquet (34MB) for "200000 rows movie reviews" in 18s — correct canonical pick over obscure/non-English alternatives
- GitHub: 15 repos + 15 READMEs + CSV in 3s
- Images: 30 images (5.7MB) + licenses CSV in 8s
- Web: wikipedia page → 53KB markdown in 1s
- ZIP endpoint: valid zip with all artifacts
