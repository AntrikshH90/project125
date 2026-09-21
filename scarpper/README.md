# DataHarvest

AI-powered web scraping and dataset collection platform. Point it at any website, PDF, GitHub repo, arXiv listing, Hugging Face dataset, or JSON API — get back clean, schema-conforming records you can explore and export to CSV / JSON / JSONL / Parquet / BibTeX.

## Instant mode ⚡

One box, type what you want, get the files — no workspace/source setup:
`POST /api/instant/ask { "ask": "20 papers on diffusion models with pdfs" }` → live progress →
PDFs / parquet / images / markdown in `apps/api/downloads/<jobId>/` + one-click ZIP.
Pipelines: papers (arXiv+OpenAlex+Crossref+SemanticScholar+Unpaywall), datasets
(HF parquet direct-pull for big asks), GitHub, images (Openverse+Wikimedia), web
scrape. LLM intent parsing (any OpenAI-compatible key) with keyless heuristic
fallback. See `/instant` in the web UI.

## Architecture

```
Next.js 16 (React 19, Tailwind v4, TanStack Table, Recharts)   →  apps/web
        │  REST + cookies
Fastify 5 API (Zod validation, session auth, RBAC)             →  apps/api
        │  BullMQ jobs                                    │
Redis 7 (queues + run control flags)     PostgreSQL 16 (Drizzle ORM)
        │                                        │
Worker cluster (Crawlee + Playwright,                    │
  LLM extraction, connectors, PDF)  ──────────────────────┘
        │
S3 / MinIO (export artifacts)
```

Monorepo layout (npm workspaces):

```
apps/
  web/       Next.js 16 workbench UI
  api/       Fastify REST API
  worker/    BullMQ consumers + Crawlee/Playwright pipeline
packages/
  core/      Drizzle schema, Zod validators, queue defs, serializers
docker/      docker-compose + images
```

## Quickstart (local dev)

Prereqs: Node 20+, Docker, (optional) an OpenAI API key for LLM extraction.

```bash
# 1. install
npm install

# 2. infra (postgres + redis + minio)
npm run infra:up

# 3. environment
cp .env.example .env
#    set OPENAI_API_KEY to enable LLM extraction (optional — heuristic mode works without)

# 4. database schema
npm run db:push

# 5. run everything (three terminals)
npm run dev:api      # Fastify API        → http://localhost:4000
npm run dev:worker   # worker cluster
npm run dev:web      # Next.js dashboard  → http://localhost:3000
```

Sign up at http://localhost:3000 — the first user gets an Owner workspace with a demo collection preconfigured.

## Full stack via Docker

```bash
docker compose -f docker/docker-compose.yml --env-file .env up --build
```

## How extraction works

| Source type | Pipeline |
|---|---|
| `website` | Playwright renders JS → Turndown markdown → LLM schema extraction (if key set) → heuristic fallback (JSON-LD, tables, repeating lists, article) |
| `arxiv` | arXiv Atom API → normalized paper metadata |
| `github` | GitHub REST: repo card + issues + releases |
| `huggingface` | datasets-server rows + dataset meta |
| `pdf` | pdf-parse text + heuristic table detection |
| `api_endpoint` | Direct JSON fetch, array auto-discovery |

Every record is content-hashed (SHA-256 of the normalized payload) and deduplicated per collection. Provenance (strategy, URL, confidence, timestamps) is stored alongside each record and surfaced in the Data Explorer side panel.

Runs are pausable/resumable/cancellable live: the API sets Redis control flags, and the worker checks them between pages, updating run status (`queued → running → pausing → paused → … → completed_with_errors`).

## Key API surface

```
POST   /api/auth/sign-up | sign-in | sign-out     GET /api/auth/me
GET    /api/workspaces                            POST /api/workspaces
GET    /api/workspaces/:wsId/overview | members | audit
POST   /api/workspaces/:wsId/invitations          POST /api/invitations/respond
PATCH  /api/workspaces/:wsId/members/role         DELETE /api/workspaces/:wsId/members/:userId
POST   /api/workspaces/:wsId/collections          GET  /api/workspaces/:wsId/runs
GET    /api/collections/:id                       PATCH/DELETE /api/collections/:id
POST   /api/collections/:id/sources               GET  /api/collections/:id/sources
POST   /api/collections/:id/runs                  GET  /api/collections/:id/records
POST   /api/runs/:id/control                      GET  /api/runs/:id | /api/runs/:id/events
POST   /api/collections/:id/exports               GET  /api/collections/:id/artifacts
GET    /api/artifacts/:id/download
POST   /api/studio/generate-schema                (LLM schema design from a prompt)
GET    /health
```

All collection/run/artifact routes enforce workspace membership and role:
`owner > admin > member > viewer` (viewer is read-only).

## Worker tuning

| Env var | Default | Purpose |
|---|---|---|
| `WORKER_CONCURRENCY` | 2 | Parallel run jobs per worker process |
| `EXTRACTION_LLM_MAX_RECORDS` | 40 | Cap on records per LLM call |
| `OPENAI_MODEL` | gpt-4o-mini | Extraction model |
| `GITHUB_TOKEN` | — | Raises GitHub API rate limits |
| `HUGGINGFACE_TOKEN` | — | Gated dataset access |
| `DEFAULT_PAGE_BUDGET` | 500 | Fallback page budget |

## Notes

- Sessions: bcrypt (cost 12) + SHA-256 hashed opaque tokens, httpOnly cookies, 14-day TTL, pruned hourly.
- Passwords are never logged; only status/paths hit the audit trail.
- If MinIO is unreachable, artifact writes fall back to `LOCAL_ARTIFACT_DIR` and are served by the API directly.
- `npm run typecheck` validates all four packages.
