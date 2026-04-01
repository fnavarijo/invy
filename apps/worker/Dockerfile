# syntax=docker/dockerfile:1
#
# Build context: repo root
#   docker build -f apps/worker/Dockerfile -t invy-worker .

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY apps/api/package.json     ./apps/api/
COPY apps/worker/package.json  ./apps/worker/
COPY packages/db/package.json      ./packages/db/
COPY packages/storage/package.json ./packages/storage/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY apps/worker  ./apps/worker
COPY packages/db      ./packages/db
COPY packages/storage ./packages/storage

# Compile shared packages to JS before deploying.
RUN pnpm --filter @invy/db build && pnpm --filter @invy/storage build

RUN pnpm deploy --filter=./apps/worker --prod /prod/worker

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

COPY --from=builder /prod/worker .

USER node

# No EXPOSE — the worker pulls jobs from Redis; it does not listen on any port.
# Graceful shutdown on SIGTERM is handled in src/index.ts (worker.close() +
# dbClient.end() + destroyStorage()).

CMD ["node", "--experimental-strip-types", "src/index.ts"]
