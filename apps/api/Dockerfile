# syntax=docker/dockerfile:1
#
# Build context: repo root
#   docker build -f apps/api/Dockerfile -t invy-api .
#
# Uses pnpm deploy to produce a self-contained production directory that
# includes @invy/db and @invy/storage source files as real files (not
# symlinks), making the final image fully standalone.

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pin the exact pnpm version declared in package.json#packageManager
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# 1. Workspace manifest + lockfile — copied first so the install layer is only
#    invalidated when dependencies change, not when source code changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml ./

# 2. package.json files for every workspace member pnpm needs to resolve the
#    graph. Worker's package.json is included because pnpm reads the full
#    workspace graph at install time.
COPY apps/api/package.json     ./apps/api/
COPY apps/worker/package.json  ./apps/worker/
COPY packages/db/package.json      ./packages/db/
COPY packages/storage/package.json ./packages/storage/

# 3. Install all workspace deps. The cache mount persists the pnpm content-
#    addressable store across builds so unchanged packages are never re-fetched.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 4. Copy source only after install — preserves the cache above on code changes.
COPY apps/api     ./apps/api
COPY packages/db      ./packages/db
COPY packages/storage ./packages/storage

# 5. Produce a standalone deployment directory for the API.
#    pnpm deploy --prod:
#      • copies the app's source files
#      • copies workspace deps (@invy/db, @invy/storage) as real files into
#        node_modules (no symlinks — works in any runtime environment)
#      • installs only production npm deps, no devDependencies
RUN pnpm deploy --filter=./apps/api --prod /prod/api

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

COPY --from=builder /prod/api .

# 'node' user (uid 1000) ships with the official node images — no root needed.
USER node

EXPOSE 3000

# Uses a node one-liner so no extra tools (curl/wget) need to be installed.
# Adjust the path if the root route moves.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/',r=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"

# Mirrors the `start` script: node --experimental-strip-types server.ts
CMD ["node", "--experimental-strip-types", "server.ts"]
