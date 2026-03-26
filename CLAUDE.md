# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Invy** is an invoice processing platform for Guatemala's SAT XML invoices. It accepts individual XML files or ZIP archives, processes them asynchronously via a worker, and exposes a REST API for querying normalized invoice data.

See `docs/` for detailed specs:
- `docs/api/api-spec.md` — REST API specification
- `docs/db/db-spec.md` — PostgreSQL schema and queries
- `docs/worker/worker-spec.md` — Worker processing spec

## Monorepo Structure

```
apps/
  api/      — Fastify 5 HTTP server (TypeScript, Node native strip-types)
  web/      — Next.js 16 frontend (React 19, Tailwind, shadcn/ui)
  worker/   — BullMQ worker that parses SAT XML and writes to PostgreSQL
packages/
  db/       — Shared Drizzle ORM schema and client (@invy/db)
  storage/  — S3-compatible storage client via AWS SDK (@invy/storage)
docker-compose.yml — PostgreSQL 15 + Redis 7 for local development
```

## Commands

### API (`apps/api/`)

```bash
pnpm dev      # Start with auto-reload
pnpm start    # Start in production mode
pnpm test     # Run tests
```

### Web (`apps/web/`)

```bash
pnpm dev      # Start Next.js dev server
pnpm build    # Build for production
pnpm start    # Start production server
```

### Worker (`apps/worker/`)

```bash
pnpm dev      # Start with auto-reload
pnpm start    # Start in production mode
```

From the monorepo root using pnpm workspace filtering:

```bash
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter worker dev
```

To run a single test file:

```bash
node --test apps/api/test/routes/root.test.js
```

## Architecture

### Request Lifecycle

```
Client uploads ZIP/XML
  → POST /v1/batches (API creates batch record, enqueues BullMQ job → 202 Accepted)
  → Worker picks up job, parses XML, populates invoices table via @invy/db, updates batch status
  → Client polls GET /v1/batches/{batch_id} until status is "done" or "failed"
  → Client retrieves results via GET /v1/batches/{batch_id}/invoices
```

### Shared Packages

- **`@invy/db`** — Drizzle ORM schema (`batches`, `invoices` tables) and database client; used by both `api` and `worker`
- **`@invy/storage`** — S3-compatible client (DigitalOcean Spaces) for storing uploaded files; used by `worker`

### Fastify Plugin System (`apps/api/`)

Uses `@fastify/autoload` to register everything in `plugins/` and `routes/`:

- `plugins/sensible.js` — `@fastify/sensible` for HTTP error helpers
- `plugins/support.js` — Custom decorators shared across routes
- `routes/` — File structure mirrors the URL path

## Tech Stack

- **Runtime:** Node.js with native TypeScript strip-types (`--experimental-strip-types`)
- **API framework:** Fastify 5
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Worker queue:** BullMQ + Redis (ioredis)
- **Database:** PostgreSQL 15+ with Drizzle ORM
- **XML parsing:** fast-xml-parser
- **Storage:** AWS SDK v3 (S3-compatible, DigitalOcean Spaces)
- **Package manager:** pnpm 10 (workspaces)
