# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Invy** is an invoice processing API for Guatemala's SAT (Sistema de Administración Tributaria) XML invoices. It accepts individual XML files or ZIP archives, processes them asynchronously, and exposes a REST API for querying normalized invoice data.

## Commands

All commands run from `apps/api/`:

```bash
pnpm dev      # Start with auto-reload (development)
pnpm start    # Start in production mode
pnpm test     # Run tests
```

Or from the monorepo root using pnpm workspace filtering:

```bash
pnpm --filter api dev
pnpm --filter api test
```

To run a single test file:

```bash
node --test apps/api/test/routes/root.test.js
```

## Architecture

### Monorepo Structure

- `apps/api/` — Fastify 5 HTTP server (the only active workspace)
- `packages/` — Shared packages (currently empty, reserved for future use)
- `docs/api/api-spec.md` — Complete REST API specification
- `docs/db/db-spec.md` — PostgreSQL schema, indexes, and analytics queries

### Request Lifecycle

```
Client uploads ZIP/XML
  → POST /batches (API creates batch record, enqueues job → 202 Accepted)
  → Worker picks up job, parses XML, populates invoices table, updates batch status
  → Client polls GET /batches/{batch_id} until status is "done" or "failed"
  → Client retrieves results via GET /batches/{batch_id}/invoices
```

### Fastify Plugin System

The app uses `@fastify/autoload` to automatically register everything in `plugins/` and `routes/`:

- `plugins/sensible.js` — Registers `@fastify/sensible` for HTTP error helpers (`reply.notFound()`, etc.)
- `plugins/support.js` — Custom decorators shared across routes
- `routes/` — Each file or subdirectory becomes an API route; the file structure mirrors the URL path

### Data Model

Two core PostgreSQL tables (not yet implemented, defined in `docs/db/db-spec.md`):

- **batches** — One record per upload; tracks `status` (queued → processing → done/failed), file metadata, and error summary
- **invoices** — One record per invoice in a batch; contains normalized fields plus `line_items` (JSONB) and `raw_payload`

Cascade delete: deleting a batch removes all its invoices.

### Async Processing (Not Yet Implemented)

The spec calls for:
- **Object storage** (DigitalOcean Spaces) for uploaded files
- **Job queue** for worker coordination
- **Worker process** that parses SAT XML, validates invoices, and writes to PostgreSQL

### API Conventions

- Base path: `/v1` (not yet enforced in code)
- Authentication: Bearer token (specified but not yet implemented)
- Pagination: keyset-based (cursor pagination)
- File uploads: `multipart/form-data` on `POST /batches`
- Batch creation returns `202 Accepted` with `Location` header

## Tech Stack

- **Runtime:** Node.js with native `node:test` for testing (no external test runner)
- **Framework:** Fastify 5
- **Database:** PostgreSQL 15+ (not yet wired up)
- **Package manager:** pnpm 10 (workspaces)
