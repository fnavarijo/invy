# Deploying 100 MB Uploads

## Ingress / reverse proxy (REQUIRED before the code change takes effect)

Whatever fronts the API (nginx, DO App Platform / load balancer) rejects a
100 MB body with its own 413 before it reaches Fastify unless raised.

- nginx: `client_max_body_size 110m;` (100 MB + headroom).
- Confirm request/upload timeouts tolerate a 100 MB upload over slow links
  (e.g. nginx `client_body_timeout`, proxy read/send timeouts).

## Worker container (fixed at 512 MB RAM · 1 shared vCPU)

The software fits the box — do not raise concurrency:

- `WORKER_CONCURRENCY=1`
- `CHUNK_SIZE=25`
- Node started with `--max-old-space-size=384` (already in `apps/worker/package.json`
  scripts and `apps/worker/Dockerfile` CMD).

## Bandwidth (50 GB)

The worker downloads each file from Spaces to process it (~100 MB egress per
full-size ZIP → ~500 full jobs before the cap). Every BullMQ retry
re-downloads the file. If the worker and Spaces are same-region, egress may be
exempt — confirm with the provider.

## Fastify note

No `bodyLimit` change is needed — multipart file streams bypass Fastify's 1 MB
`bodyLimit`. The 100 MB cap is enforced by `@fastify/multipart` `limits.fileSize`
(`MAX_ZIP_BYTES`) and the `part.file.truncated` check.
