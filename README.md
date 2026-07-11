# GrowEasy CRM — AI CSV Importer

An intelligent CSV import pipeline for GrowEasy CRM that accepts arbitrary lead export files (Facebook Ads, Google Ads, real estate CRMs, manual spreadsheets) and maps them onto a fixed CRM schema using a two-stage LLM pipeline — with real-time streaming progress, batch retry, and a full results dashboard.

---

## Table of Contents

- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [AI Pipeline Flow](#ai-pipeline-flow)
  - [Data Flow Diagram](#data-flow-diagram)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup: Cloning & Running Locally](#setup-cloning--running-locally)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Install](#1-clone--install)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Run Development Servers](#3-run-development-servers)
- [Setup: Docker Compose](#setup-docker-compose)
- [Key Features](#key-features)
- [CRM Schema Reference](#crm-schema-reference)

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Browser["Browser / Client"]
        UI["Next.js 15 Frontend\n(shadcn · Tailwind v3 · Recharts)"]
        PP["PapaParse\nClient-side CSV Preview"]
    end

    subgraph API["Express 5 API Server (Railway)"]
        UP["POST /api/import/upload\nMulter · csv-parse"]
        SSE["GET /api/import/:id/stream\nSSE Manager\n(heartbeat · X-Accel-Buffering)"]
        RES["GET /api/import/:id/result"]
        RETRY["POST /api/import/:id/retry"]
        LEADS["GET /api/leads · /api/analytics"]
    end

    subgraph AIPipeline["AI Pipeline"]
        S1["Stage 1 — Schema Mapping\nGemini 2.5 Flash · Groq Fallback\nCached by header SHA-256"]
        S2["Stage 2 — Batch Extraction\n25 rows / batch\nGemini 2.5 Flash · Groq Fallback"]
        VAL["CRM Validator\nZod · Enum re-check · Date normalise"]
    end

    subgraph Storage["Storage (dual-mode)"]
        PG["PostgreSQL\nNeon Serverless"]
        MEM["In-memory Maps\n(stateless fallback)"]
        CACHE["column_mappings\nheader_hash cache"]
    end

    UI -->|"drag-drop upload"| PP
    PP -->|"preview & confirm"| UI
    UI -->|"FormData POST"| UP
    UP -->|"uuid importId"| UI
    UI -->|"EventSource"| SSE
    SSE -->|"stage / batch progress"| UI
    UP --> S1
    S1 -->|"ColumnMapping[]"| S2
    S2 --> VAL
    VAL -->|"ValidatedRecord[]"| PG
    VAL -->|"stateless mode"| MEM
    S1 <-->|"read/write"| CACHE
    CACHE --> PG
    CACHE --> MEM
    UI -->|"GET result"| RES
    RES --> PG
    RES --> MEM
    UI -->|"retry failed batches"| RETRY
    UI -->|"manage leads / dashboard"| LEADS
    LEADS --> PG
    LEADS --> MEM
```

---

### AI Pipeline Flow

```mermaid
sequenceDiagram
    participant C  as Client
    participant API as Express API
    participant S1  as Stage 1 (Mapping)
    participant S2  as Stage 2 (Extraction)
    participant DB  as PostgreSQL / Memory

    C->>API: POST /api/import/upload (CSV file)
    API->>API: csv-parse → headers + rows
    API-->>C: 200 { importId }
    C->>API: GET /api/import/:id/stream (SSE)

    API->>S1: inferColumnMapping(headers, sample[0..4])
    Note over S1: SHA-256(sorted headers) → cache lookup
    alt Cache HIT
        S1-->>API: cached MappingResult
    else Cache MISS
        S1->>S1: Gemini 2.5 Flash (attempt 1)
        alt Gemini fails
            S1->>S1: Gemini 2.5 Flash (retry)
            alt Still fails
                S1->>S1: Groq Llama 3.3-70B (fallback)
            end
        end
        S1->>DB: save mapping to column_mappings
        S1-->>API: MappingResult
    end

    API-->>C: SSE { stage: "extracting", totalBatches }

    loop For each batch of 25 rows
        API->>S2: extractBatch(mapping, batchRows, startIndex)
        S2->>S2: Gemini 2.5 Flash (attempt 1)
        alt Gemini fails
            S2->>S2: Gemini 2.5 Flash (retry)
            alt Still fails
                S2->>S2: Groq Llama 3.3-70B (fallback)
            end
        end
        S2->>S2: crmValidator (Zod · enum · date)
        S2->>DB: INSERT import_records
        API-->>C: SSE { batchesDone: i+1 }
    end

    API-->>C: SSE { stage: "done" }
    C->>API: GET /api/import/:id/result
    API-->>C: ImportResult { records[], skipped[] }
```

---

### Data Flow Diagram

```mermaid
flowchart LR
    CSV["📄 Arbitrary CSV\n(any column names)"]
    PARSE["csv-parse\nbom:true · relax_quotes"]
    PREVIEW["Client Preview\n(TanStack Table\n+ Virtual scroll)"]
    HASH["SHA-256\n(sorted headers)"]
    CACHE{{"Cache\nHit?"}}
    GEMINI1["Gemini 2.5 Flash\nSchema Mapping"]
    GROQ1["Groq Llama 3.3\nFallback"]
    MAP["ColumnMapping[]\nsourceColumn → targetField"]
    CHUNKS["chunkArray\n25 rows / batch"]
    GEMINI2["Gemini 2.5 Flash\nData Extraction"]
    GROQ2["Groq Llama 3.3\nFallback"]
    ZOD["Zod Validation\n+ CRM Validator"]
    SUCCESS["✅ CrmRecord[]"]
    SKIPPED["⚠️ SkippedRecord[]\n(no email + no phone)"]
    DB[("PostgreSQL\nor Memory")]
    DASHBOARD["Results Dashboard\n+ Leads Table\n+ Analytics"]

    CSV --> PARSE --> PREVIEW
    PREVIEW -->|confirm| HASH
    HASH --> CACHE
    CACHE -->|miss| GEMINI1
    GEMINI1 -->|fail ×2| GROQ1
    GEMINI1 --> MAP
    GROQ1 --> MAP
    CACHE -->|hit| MAP
    MAP --> CHUNKS
    CHUNKS --> GEMINI2
    GEMINI2 -->|fail ×2| GROQ2
    GEMINI2 --> ZOD
    GROQ2 --> ZOD
    ZOD --> SUCCESS
    ZOD --> SKIPPED
    SUCCESS --> DB
    SKIPPED --> DB
    DB --> DASHBOARD
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | Turborepo · pnpm workspaces |
| **Frontend** | Next.js 15 · React 19 · TypeScript |
| **UI** | Tailwind CSS v3 · shadcn/ui tokens · lucide-react |
| **Charts** | Recharts 2 |
| **Tables** | TanStack Table v8 · TanStack Virtual v3 |
| **CSV (client)** | PapaParse |
| **Backend** | Express 5 · TypeScript · tsx |
| **CSV (server)** | csv-parse |
| **AI Primary** | Gemini 2.5 Flash (`@google/generative-ai`) |
| **AI Fallback** | Groq — Llama 3.3 70B Versatile |
| **Validation** | Zod |
| **Database** | PostgreSQL via Neon (serverless) |
| **Streaming** | Server-Sent Events (SSE) |
| **File uploads** | Multer (memory storage) |
| **Deployment** | Vercel / Render (Web) |

---

## Project Structure

```
groweasy-csv-importer/
├── apps/
│   ├── api/                        # Express 5 backend
│   │   └── src/
│   │       ├── routes/
│   │       │   └── import.ts       # All import endpoints + SSE
│   │       ├── services/
│   │       │   ├── ai/
│   │       │   │   ├── extractor.ts        # Stage 1 + Stage 2 orchestration
│   │       │   │   ├── geminiClient.ts     # Gemini 2.5 Flash client + schemas
│   │       │   │   ├── groqClient.ts       # Groq Llama fallback client
│   │       │   │   ├── validation.ts       # Zod schemas
│   │       │   │   └── prompts/
│   │       │   │       ├── mappingPrompt.ts
│   │       │   │       └── extractionPrompt.ts
│   │       │   ├── csv/
│   │       │   │   └── parser.ts           # csv-parse wrapper + chunkArray
│   │       │   ├── crmValidator.ts         # Post-AI enum + date normalisation
│   │       │   ├── importStore.ts          # DB/memory CRUD + analytics
│   │       │   └── sseManager.ts           # EventEmitter-based SSE broadcaster
│   │       └── db/
│   │           ├── pool.ts                 # pg Pool (Neon SSL auto-detect)
│   │           └── migrate.ts              # CREATE TABLE IF NOT EXISTS
│   └── web/                        # Next.js 15 frontend
│       ├── app/
│       │   ├── dashboard/page.tsx
│       │   ├── leads/page.tsx
│       │   └── sources/page.tsx
│       ├── components/
│       │   ├── import/ImportWizard.tsx     # 4-step import flow
│       │   ├── DropzoneUpload.tsx
│       │   ├── PreviewTable.tsx
│       │   ├── ProgressPanel.tsx
│       │   ├── ResultsTable.tsx
│       │   ├── SummaryCards.tsx
│       │   ├── dashboard/
│       │   └── leads/
│       └── hooks/
│           └── useImportStream.ts          # SSE hook + polling fallback
├── packages/
│   ├── shared-types/               # CrmRecord, ImportResult, ProgressEvent …
│   └── typescript-config/          # Shared tsconfig bases
├── Dockerfile.api
├── Dockerfile.web
├── docker-compose.yml
└── turbo.json
```

---

## Setup: Cloning & Running Locally

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 11 — install with `npm install -g pnpm`
- A **Gemini API key** — [Google AI Studio](https://aistudio.google.com/app/apikey)
- A **Groq API key** — [console.groq.com](https://console.groq.com)
- *(Optional)* A **Neon PostgreSQL** connection string — [neon.tech](https://neon.tech). Without it the API runs in stateless in-memory mode.

---

### 1. Clone & Install

```bash
git clone https://github.com/your-org/groweasy-csv-importer.git
cd groweasy-csv-importer

pnpm install
```

> **Note:** If you see a build-script approval error (`ERR_PNPM_IGNORED_BUILDS`), run:
> ```bash
> pnpm approve-builds
> ```

---

### 2. Configure Environment Variables

**API** — create `apps/api/.env` (copy from the example):

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit `apps/api/.env`:

```env
# Port for the Express server
PORT=4000

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:3000

# Neon PostgreSQL connection string (optional — omit for in-memory mode)
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/dbname?sslmode=require

# Google Gemini — primary AI model
GEMINI_API_KEY=your_gemini_api_key_here

# Groq — fallback AI model
GROQ_API_KEY=your_groq_api_key_here
```

**Web** — create `apps/web/.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

### 3. Run Development Servers

Start both the API and the web app concurrently via Turborepo:

```bash
pnpm dev
```

This runs:
- **API** → `http://localhost:4000`
- **Web** → `http://localhost:3000`

To run them individually:

```bash
# API only
pnpm --filter api dev

# Web only
pnpm --filter web dev
```

**Verify the API is running:**

```bash
curl http://localhost:4000/
# → { "status": "ok", "databaseConnected": true|false }
```

**Run tests (API):**

```bash
pnpm --filter api test
```

**Type-check everything:**

```bash
pnpm check-types
```

---

## Setup: Docker Compose

> ⚠️ **Note: Docker setup currently needs debugging.** The Dockerfiles and `docker-compose.yml` are included in the repository as a starting point, but have not been fully validated end-to-end. Known areas that may need attention include pnpm workspace hoisting inside multi-stage builds and the Next.js standalone output path in `Dockerfile.web`. Treat the Docker setup as a work-in-progress — the **cloning method above is the recommended path** for local development.

### Steps

**1. Set API keys in your shell environment (or a root `.env` file):**

```bash
export GEMINI_API_KEY=your_gemini_api_key_here
export GROQ_API_KEY=your_groq_api_key_here
```

**2. Build and start all services:**

```bash
docker compose up --build
```

This starts three containers:

| Container | Port | Description |
|---|---|---|
| `crm_postgres` | 5432 | PostgreSQL 15 |
| `crm_api` | 4000 | Express 5 API |
| `crm_web` | 3000 | Next.js frontend |

**3. Verify:**

```bash
curl http://localhost:4000/
# → { "status": "ok", "databaseConnected": true }
```

Then open `http://localhost:3000` in your browser.

**Stop all containers:**

```bash
docker compose down
```

**Wipe volumes (reset database):**

```bash
docker compose down -v
```

---

## Key Features

**Smart Column Mapping (Stage 1)**
- Infers column mappings from arbitrary CSV headers using Gemini 2.5 Flash
- Results are cached by a SHA-256 hash of sorted headers — identical column sets never pay the LLM cost twice
- Automatic retry + Groq Llama 3.3 fallback on failure

**Batch Extraction (Stage 2)**
- Rows are chunked into batches of 25 for parallel-safe sequential processing
- Per-batch retry support — failed batches can be re-run independently via the UI without reprocessing successful ones
- AI maps ambiguous enum values (`"follow up"` → `GOOD_LEAD_FOLLOW_UP`, `"eden park campaign"` → `eden_park`)

**Real-time Streaming**
- Progress events are pushed over SSE with a 15-second heartbeat to prevent proxy timeouts
- `X-Accel-Buffering: no` header ensures Railway / nginx does not buffer the stream
- Automatic polling fallback if the SSE connection drops

**Dual Storage Modes**
- **Postgres mode**: Full persistence via Neon serverless (auto-resumes from cold start in ~400–750 ms)
- **In-memory mode**: Fully functional stateless mode when `DATABASE_URL` is unset — ideal for fast local testing

**Results Dashboard**
- Virtualised results table (TanStack Virtual) handles thousands of records without jank
- Tabbed view for successful leads vs. skipped leads (with skip reasons and raw row data)
- Summary cards, status pie chart, 7-day activity trend chart

---

## CRM Schema Reference

Every row is mapped to the following target schema:

| Field | Type | Notes |
|---|---|---|
| `created_at` | ISO-8601 string | Falls back to `new Date()` if unparseable |
| `name` | string | Contact full name |
| `email` | string | Primary email; extras appended to `crm_note` |
| `country_code` | string | Numeric only, no `+` prefix |
| `mobile_without_country_code` | string | No spaces; extras appended to `crm_note` |
| `company` | string | |
| `city` | string | |
| `state` | string | |
| `country` | string | |
| `lead_owner` | string | |
| `crm_status` | enum | `GOOD_LEAD_FOLLOW_UP` · `DID_NOT_CONNECT` · `BAD_LEAD` · `SALE_DONE` · `""` |
| `crm_note` | string | Free text; overflow emails/phones appended here |
| `data_source` | enum | `leads_on_demand` · `meridian_tower` · `eden_park` · `varah_swamy` · `sarjapur_plots` · `""` |
| `possession_time` | string | |
| `description` | string | |

> **Skip rule:** Any row with neither a valid email nor a mobile number is placed in the `skipped` array with a reason string. This check runs both inside the AI prompt and again in the `crmValidator` post-processing step.
