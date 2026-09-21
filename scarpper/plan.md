Here is the complete, consolidated architecture plan formatted as a single, clean Markdown (.md) document that you can copy and save directly as STRATUM-AI-PLAN.md.

Markdown
# `STRATUM-AI` Architecture & Engineering Plan

===================================================================================================
STRATUM-AI: HYBRID AI-DRIVEN DATA HARVESTING ENGINE

---

## 1. System Vision & Architecture

Stratum-AI is built to solve a specific problem: **extracting clean, structured datasets from any website or source without manual CSS selectors or fragile web-scraping rules.**

The system uses a hybrid execution model:
1. **Deterministic Mode:** Standard HTML/API parsing (arXiv, Crossref, GitHub, Hugging Face, static CSV/JSON endpoints) for predictable data formats.
2. **AI Vision & Heuristic Mode (Crawl4AI + VLM):** Browser rendering with dynamic Playwright sessions, converting pages into clean Markdown and using AI models to extract structured JSON based on user schemas or natural-language prompts.

### Technical Stack Topology
* **Frontend UI/UX:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (Base UI + Lucide), TanStack Table v8, Recharts.
* **API Service:** Fastify (TypeScript) with Zod validation and OpenAPI documentation.
* **Worker Queue Engine:** Node.js + Python Crawl4AI worker service backed by Redis + BullMQ and `pg-boss`.
* **Database & Storage:** PostgreSQL (Drizzle ORM) + AWS S3 / MinIO Object Storage.
* **Auth & Workspace Management:** Better Auth (Email/Password + Organization Plugin).

+-----------------------------------------------------------------------------------------------+
|                                NEXT.JS 16 DASHBOARD UI                                        |
|                       (Workbench / Schema Builder / Data Explorer)                            |
+----------------------------------------------+------------------------------------------------+
|
[ REST / WebSockets ]
|
+----------------------------------------------v------------------------------------------------+
|                                  FASTIFY API SERVICE                                          |
|                      (Auth, Workspaces, Rate Limits, Schema Validation)                        |
+-----------------------+-----------------------------------------------+-----------------------+
|                                               |
[ Job Dispatch / Events ]                               [ State Persist ]
|                                               |
+-----------------------v-----------------------+               +-------v-----------------------+
|               REDIS + BULLMQ                  |               |       POSTGRESQL DB           |
|           (Task & Job Queues)                 |               | (Drizzle ORM + Vector State)  |
+-----------------------+-----------------------+               +-------------------------------+
|
+-----------------------v-----------------------------------------------------------------------+
|                              WORKER CLUSTER (PYTHON / CRAWL4AI)                               |
|   +------------------------------------+    +---------------------------------------------+   |
|   |        Playwright Engine           |    |            AI Parsing Layer                 |   |
|   |  (JS Execution, Stealth, Proxies)  |    | (Crawl4AI, Heuristic Pruning, Schema LLM)  |   |
|   +------------------------------------+    +---------------------------------------------+   |
+----------------------------------------------+------------------------------------------------+
|
[ Output Storage ]
|
+----------------------------------------------v------------------------------------------------+
|                               AWS S3 / MINIO OBJECT STORAGE                                   |
|                        (Raw Artifacts, Parquet, CSV, JSON, BibTeX)                            |
+-----------------------------------------------------------------------------------------------+


---

## 2. Directory & Workspace Structure

stratum-ai/
├── apps/
│   ├── web/                         # Next.js 16 App Router UI
│   │   ├── app/
│   │   │   ├── (auth)/             # Auth routes (Login, Signup, Reset)
│   │   │   ├── (dashboard)/        # Workspace layout & routes
│   │   │   │   ├── overview/       # Analytics dashboard
│   │   │   │   ├── studio/         # Run builder & prompt schema generator
│   │   │   │   ├── runs/           # Execution status & live log inspector
│   │   │   │   ├── collections/    # Data explorer & exports
│   │   │   │   └── settings/       # Team, API keys, proxy config
│   │   │   └── api/                # Edge/Next server proxy routes
│   │   ├── components/             # UI components
│   │   │   ├── ui/                 # shadcn base primitives
│   │   │   ├── workspace/          # Workspace switcher & navigation
│   │   │   ├── studio/             # Schema Builder & JSON preview
│   │   │   └── collections/        # TanStack dynamic tables
│   │   ├── lib/                    # Next.js runtime utilities
│   │   └── package.json
│   └── api/                         # Fastify High-Performance REST API
│       ├── src/
│       │   ├── routes/             # Workspace, run, and export endpoints
│       │   ├── services/           # Business logic & authorization
│       │   ├── plugins/            # Auth, CORS, Redis, DB connections
│       │   └── index.ts
│       └── package.json
├── services/
│   └── worker/                     # Python + Crawl4AI Extraction Microservice
│       ├── crawler/
│       │   ├── engine.py           # Crawl4AI AsyncWebCrawler runner
│       │   ├── strategies.py       # Heuristic & LLM Schema extraction
│       │   └── adapters/           # Dedicated APIs (arXiv, HF, GitHub)
│       ├── queue/                  # Redis consumer handlers
│       ├── main.py                 # FastAPI/Worker bootstrapper
│       └── requirements.txt
├── packages/
│   ├── core/                       # Shared Types, Zod Schemas, Database client
│   │   ├── src/
│   │   │   ├── db/                 # Drizzle Schema & Migrations
│   │   │   │   ├── schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/              # Job, Record, & Extraction types
│   │   │   └── validators/         # Universal Zod payloads
│   │   └── package.json
│   └── config/                     # Shared TypeScript & Tailwind configs
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   ├── Dockerfile.worker
│   └── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json


---

## 3. Database Schema (`packages/core/src/db/schema.ts`)

```typescript
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core';

// --- AUTHENTICATION & WORKSPACES ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const workspaceMemberships = pgTable('workspace_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).default('member').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userWsUnq: uniqueIndex('user_workspace_unique').on(table.workspaceId, table.userId)
}));

// --- COLLECTIONS & SOURCES ---
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  schemaDefinition: jsonb('schema_definition').notNull(), // Target extraction fields JSON Schema
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  type: text('type', { enum: ['website', 'arxiv', 'huggingface', 'github', 'pdf', 'api_endpoint'] }).notNull(),
  targetUrl: text('target_url').notNull(),
  config: jsonb('config').default({}).notNull(), // Crawl depth, path rules, rate limits
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// --- EXECUTION RUNS & TASKS ---
export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  status: text('status', { 
    enum: ['queued', 'running', 'pausing', 'paused', 'cancelling', 'cancelled', 'completed', 'completed_with_errors', 'failed'] 
  }).default('queued').notNull(),
  totalPagesBudget: integer('total_pages_budget').default(1000).notNull(),
  pagesProcessed: integer('pages_processed').default(0).notNull(),
  recordsExtracted: integer('records_extracted').default(0).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  wsStatusIdx: index('runs_ws_status_idx').on(table.workspaceId, table.status)
}));

// --- EXTRACTED DATA RECORDS ---
export const extractedRecords = pgTable('extracted_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  runId: uuid('run_id').references(() => runs.id, { onDelete: 'cascade' }).notNull(),
  sourceUrl: text('source_url').notNull(),
  contentHash: text('content_hash').notNull(),
  payload: jsonb('payload').notNull(), // The extracted structured data matching user schema
  confidenceScore: text('confidence_score'),
  provenance: jsonb('provenance').notNull(), // Extraction metadata (timestamp, HTTP status, rendering strategy)
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  collHashIdx: index('records_coll_hash_idx').on(table.collectionId, table.contentHash),
  wsIdx: index('records_ws_idx').on(table.workspaceId)
}));

// --- ARTIFACTS & EXPORTS ---
export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  format: text('format', { enum: ['csv', 'json', 'jsonl', 'parquet', 'bibtex'] }).notNull(),
  s3Key: text('s3_key').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
4. Extraction Worker (services/worker/crawler/engine.py)
This Python module uses Crawl4AI to crawl dynamic web pages, convert them into fit Markdown, and run schema-based AI extraction.

Python
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import LLMExtractionStrategy, JsonCssExtractionStrategy
from crawl4ai.content_filter_strategy import PruningContentFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StratumWorker")

class ExtractionEngine:
    def __init__(self, openai_api_key: Optional[str] = None):
        self.browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            extra_args=["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"]
        )
        self.openai_api_key = openai_api_key

    async def execute_scrape_task(
        self,
        url: str,
        schema_prompt: str,
        target_schema: Dict[str, Any],
        use_ai_extraction: bool = True
    ) -> Dict[str, Any]:
        """
        Executes a dynamic scrape task using Crawl4AI.
        Converts the target website into LLM-ready markdown and extracts structured JSON.
        """
        
        # Configure Extraction Strategy
        if use_ai_extraction and self.openai_api_key:
            extraction_strategy = LLMExtractionStrategy(
                provider="openai/gpt-4o-mini",
                api_token=self.openai_api_key,
                schema=target_schema,
                extraction_type="schema",
                instruction=f"Extract structured data conforming strictly to the provided JSON Schema. Context: {schema_prompt}"
            )
        else:
            # Fallback to Heuristic / Heuristic Pruning without costly LLM calls
            extraction_strategy = None

        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            word_threshold=10,
            extraction_strategy=extraction_strategy,
            markdown_generator=PruningContentFilter(threshold=0.45) # Heuristic cleanup of ads/nav
        )

        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            logger.info(f"Navigating to {url}...")
            result = await crawler.arun(url=url, config=run_config)

            if not result.success:
                logger.error(f"Failed to crawl {url}: {result.error_message}")
                return {
                    "success": False,
                    "error": result.error_message,
                    "url": url
                }

            # Extracted structured payload
            extracted_data = []
            if result.extracted_content:
                try:
                    extracted_data = json.loads(result.extracted_content)
                except json.JSONDecodeError:
                    extracted_data = [{"raw_text": result.markdown.fit_markdown}]
            else:
                extracted_data = [{"raw_text": result.markdown.fit_markdown}]

            return {
                "success": True,
                "url": result.url,
                "status_code": result.status_code,
                "data": extracted_data,
                "fit_markdown": result.markdown.fit_markdown,
                "word_count": result.markdown.word_count
            }

# Example CLI Invocation
if __name__ == "__main__":
    test_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "authors": {"type": "array", "items": {"type": "string"}},
            "publication_date": {"type": "string"},
            "abstract": {"type": "string"}
        }
    }
    
    engine = ExtractionEngine()
    output = asyncio.run(
        engine.execute_scrape_task(
            url="[https://arxiv.org/abs/2401.00001](https://arxiv.org/abs/2401.00001)",
            schema_prompt="Extract research paper metadata",
            target_schema=test_schema,
            use_ai_extraction=False
        )
    )
    print(json.dumps(output, indent=2))
5. Next.js Workbench UI (apps/web/app/(dashboard)/studio/page.tsx)
This interface gives users an interactive studio to input target URLs, define JSON schema using a prompt or field builder, and run a live preview.

TypeScript
'use client';

import React, { useState } from 'react';
import { Sparkles, Play, Database, FileCode, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DatasetStudioPage() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('Extract all research paper titles, authors, dosage tables, and clinical findings.');
  const [fields, setFields] = useState([
    { name: 'title', type: 'string', required: true },
    { name: 'dosage_mg', type: 'number', required: false },
    { name: 'findings', type: 'string', required: true }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewOutput, setPreviewOutput] = useState<any>(null);

  const handleRunPreview = async () => {
    setIsExecuting(true);
    setPreviewOutput(null);

    // Mock API trigger to Fastify endpoint
    setTimeout(() => {
      setPreviewOutput([
        {
          title: "Efficacy of Novel Compound X in Phase II Trials",
          dosage_mg: 250,
          findings: "Observed 42% reduction in target biomarkers over 12 weeks with minimal adverse events."
        },
        {
          title: "Comparative Analysis of Secondary Endpoints",
          dosage_mg: 500,
          findings: "Higher dosage threshold yielded no significant statistical variance in overall tolerance."
        }
      ]);
      setIsExecuting(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E2E8F0] p-8 font-sans">
      {/* HEADER */}
      <header className="mb-8 border-b border-zinc-800 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-500"/> Dataset Extraction Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure dynamic web, PDF, or research sources into structured datasets without CSS selectors.
          </p>
        </div>
        <button 
          onClick={handleRunPreview}
          disabled={isExecuting || !url}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold px-5 py-2.5 rounded-md text-sm transition-all shadow-lg"
        >
          {isExecuting ? (
            <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-zinc-950"/>
          )}
          {isExecuting ? 'Extracting Preview...' : 'Run Extraction Preview'}
        </button>
      </header>

      {/* WORKBENCH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: CONFIGURATION */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* SOURCE CONFIGURATION */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
              Source URL / Data Origin
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="[https://clinicaltrials.gov/study/NCT045](https://clinicaltrials.gov/study/NCT045)... or arXiv/GitHub URL"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* NATURAL LANGUAGE SCHEMA BUILDER */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5"/> AI Schema Generation Prompt
              </label>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* STRUCTURED SCHEMA FIELDS */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5"/> Target Data Schema
              </span>
              <button 
                onClick={() => setFields([...fields, { name: '', type: 'string', required: false }])}
                className="text-xs text-amber-500 hover:text-amber-400 font-medium"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-zinc-950/80 p-2 rounded border border-zinc-800/80">
                  <input
                    type="text"
                    value={field.name}
                    placeholder="field_key"
                    onChange={(e) => {
                      const updated = [...fields];
                      updated[idx].name = e.target.value;
                      setFields(updated);
                    }}
                    className="flex-1 bg-transparent text-xs font-mono text-zinc-200 focus:outline-none"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const updated = [...fields];
                      updated[idx].type = e.target.value;
                      setFields(updated);
                    }}
                    className="bg-zinc-900 text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: LIVE PREVIEW & INSPECTOR */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-500"/> Live Extraction Preview
            </span>
            {previewOutput && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                2 Records Extracted
              </span>
            )}
          </div>

          <div className="flex-1 bg-zinc-950 rounded-md border border-zinc-800 p-4 font-mono text-xs overflow-auto">
            {isExecuting ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p>Rendering web page & parsing schema via Crawl4AI Engine...</p>
              </div>
            ) : previewOutput ? (
              <pre className="text-emerald-400/90 whitespace-pre-wrap">
                {JSON.stringify(previewOutput, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p>Enter a target URL and click "Run Extraction Preview" to inspect output.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
6. Docker Deployment Configuration
Docker Compose (docker/docker-compose.yml)
YAML
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: stratum_postgres
    environment:
      POSTGRES_USER: stratum_user
      POSTGRES_PASSWORD: stratum_password
      POSTGRES_DB: stratum_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stratum_user -d stratum_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: stratum_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    container_name: stratum_minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_password
    command: server /data --console-address ":9001"

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    container_name: stratum_api
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://stratum_user:stratum_password@postgres:5432/stratum_db
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    container_name: stratum_worker
    environment:
      DATABASE_URL: postgresql://stratum_user:stratum_password@postgres:5432/stratum_db
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - api
      - redis

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    container_name: stratum_web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    depends_on:
      - api

volumes:
  pgdata:
7. Delivery & Execution Plan
Step 1: Core Setup
Run database migrations via pnpm --filter core db:push.

Start local services via docker-compose -f docker/docker-compose.yml up -d.

Step 2: Verification Suite
Crawl Verification: Verify services/worker/crawler/engine.py against dynamic pages to ensure Playwright renders JS and outputs clean Markdown.

Deduplication Check: Confirm content_hash matching prevents duplicate database rows.

Format Export Validation: Test exporting selected records into valid CSV, JSON, and BibTeX files.


***
