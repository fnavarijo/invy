# Invoice Worker — Implementation Specification

## Overview

The worker is a standalone Node.js process that consumes jobs from a Redis queue (BullMQ) and processes uploaded invoice files end-to-end. It is the only component that reads from object storage, parses XML, and writes invoice rows to the database.

The worker has no HTTP server and no public interface. It communicates exclusively through Redis (job queue) and PostgreSQL (database reads and writes). It shares the `packages/shared` package with the API process — the database client, Zod schemas, extractor, and normalizer all live there.

---

## Monorepo location

```
apps/
  worker/
    src/
      index.ts          ← process entry point, registers the queue worker
      processor.ts      ← main job handler, orchestrates all steps
      unzip.ts          ← ZIP extraction logic
      xml.ts            ← XSD validation + field extraction
      normalizer.ts     ← field normalization (dates, amounts)
packages/
  shared/
    src/
      db/
        client.ts       ← Drizzle ORM client
        schema.ts       ← batches + invoices table definitions
      schemas/
        invoice.ts      ← Zod schema for the normalized invoice shape
      ids.ts            ← generateId() utility
```

---

## Entry point

`apps/worker/src/index.ts` registers a BullMQ `Worker` against the `invoice-processing` queue. It does not start an HTTP server.

```typescript
import { Worker } from 'bullmq'
import { connection } from './redis'
import { processJob } from './processor'

const worker = new Worker('invoice-processing', processJob, {
  connection,
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 1),  // fixed at 1 for the 512 MB / 1 vCPU box
  lockDuration: 60_000, // 60s lock — extend if processing large ZIPs
})

worker.on('failed', (job, err) => {
  console.error({ jobId: job?.id, batchId: job?.data?.batchId, err })
})
```

**Concurrency:** Set to 1 by default via `WORKER_CONCURRENCY`. Each job fetches and processes one file. The default is fixed at 1 for the current 512 MB / 1 vCPU worker instance size — see "Memory tunables" below. Only raise it if the instance is upsized accordingly.

---

## Job payload

The API enqueues this payload when a batch is created. The worker receives it as `job.data`.

```typescript
type JobPayload = {
  batchId:  string   // e.g. 'b_01j9z3kabc'
  fileKey:  string   // e.g. 'batches/b_01j9z3kabc/invoices-oct.zip'
}
```

The worker must not derive any behavior from the `fileKey` string format. File type is read from the database (`batches.file_type`), not inferred from the key.

---

## Processor — step by step

`apps/worker/src/processor.ts` exports `processJob`, which is the BullMQ job handler. It executes all steps in sequence. If any step throws an unrecoverable error, BullMQ retries the job according to the retry policy defined below.

### Step 1 — Mark batch as processing

Before doing any work, update the batch status to `processing`. This prevents the `DELETE /batches` API endpoint from deleting the batch while the worker is running.

```typescript
await db
  .update(batches)
  .set({ status: 'processing' })
  .where(eq(batches.batchId, batchId))
```

**If this UPDATE affects 0 rows**, the batch was deleted before the worker started. Exit silently — do not throw, do not retry.

```typescript
const result = await db.update(batches).set(...)
if (result.rowCount === 0) return  // batch was deleted, nothing to do
```

---

### Step 2 — Fetch file from object storage

Stream the file from DO Spaces using the `fileKey` from the job payload.

```typescript
const object = await spaces.getObject({
  Bucket: process.env.SPACES_BUCKET,
  Key:    fileKey,
})
const fileStream = object.Body as Readable
```

**If Spaces returns a 404**, stamp `batches.file_deleted_at = NOW()` and fail the job without retrying. The file is gone and retrying will not help.

```typescript
if (err.name === 'NoSuchKey') {
  await db.update(batches)
    .set({ file_deleted_at: new Date() })
    .where(eq(batches.batchId, batchId))
  throw new NonRetryableError('File not found in object storage')
}
```

**Do not buffer the entire file into memory.** Use the stream directly in the next step.

---

### Step 3 — Read file type from database

Read `file_type` from the `batches` row. Do not infer file type from the `fileKey` extension.

```typescript
const batch = await db.query.batches.findFirst({
  where: eq(batches.batchId, batchId),
  columns: { fileType: true }
})

// file_type is either 'zip' or 'xml'
```

---

### Step 4 — Get XML entries

Produce an array of `{ fileName: string, content: Buffer }` objects — one per XML to process.

**If `file_type` is `xml`:**

```typescript
const entries = [{
  fileName: batch.fileName,
  content:  await streamToBuffer(fileStream)
}]
```

**If `file_type` is `zip`:**

Call `extractXmlsFromZip(fileStream)` from `apps/worker/src/unzip.ts`. See the ZIP extraction section below.

```typescript
const entries = await extractXmlsFromZip(fileStream)
```

---

### Step 5 — Process each XML entry

Iterate over `entries`. For each one, run validation, extraction, and normalization. Collect results into two local arrays: `invoiceRows` (successful) and `errors` (failed).

```typescript
const invoiceRows: NewInvoice[] = []
const errors: BatchError[]      = []

for (const entry of entries) {

  // 5a. Validate against XSD
  const validationResult = validateXsd(entry.content)
  if (!validationResult.ok) {
    errors.push({ fileName: entry.fileName, reason: validationResult.error })
    continue   // do not halt — move to next entry
  }

  // 5b. Extract fields from XML
  const extracted = extractInvoiceFields(entry.content)

  // 5c. Normalize fields
  const normalized = normalizeInvoice(extracted)

  // 5d. Build invoice row
  invoiceRows.push({
    invoiceId:     generateId('inv'),
    batchId:       batchId,
    invoiceNumber: normalized.invoiceNumber,
    type:          normalized.type,
    currency:      normalized.currency,
    totalAmount:   normalized.totalAmount,
    issuedAt:      normalized.issuedAt,
    issuerName:    normalized.issuerName,
    issuerNit:     normalized.issuerNit,
    clientName:    normalized.clientName,
    clientNit:     normalized.clientNit,
    lineItems:     normalized.lineItems,   // stored verbatim — not normalized
    sourceFile:    entry.fileName,
    rawPayload:    extracted,              // full pre-normalization object
    createdAt:     new Date(),
  })
}
```

**A single XML failure must not stop the loop.** Push to `errors` and `continue`.

---

### Step 6 — Insert invoice rows

Insert all successful invoice rows into the database. Use batched inserts if the count is large.

```typescript
if (invoiceRows.length > 0) {
  // Batch INSERTs into chunks of CHUNK_SIZE rows to keep each query a
  // reasonable size. invoiceRows was already fully populated in step 5,
  // so this alone doesn't bound memory — the real worker's CHUNK_SIZE-
  // based incremental flush does that; see "Memory tunables" below.
  const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 25)
  for (let i = 0; i < invoiceRows.length; i += CHUNK_SIZE) {
    await db.insert(invoices).values(invoiceRows.slice(i, i + CHUNK_SIZE))
  }
}
```

**Insert rows as they are processed (step 5d), not in a bulk insert at the end.** This allows the API to return partial results via `GET /batches/{batch_id}/invoices` while the batch is still `processing`. Revise the loop in step 5 to insert each row immediately after normalization rather than collecting into `invoiceRows` first, if partial visibility is a requirement.

---

### Step 7 — Update batch record

After all entries are processed, update the batch row with the final summary. This is the only place `invoice_count`, `failed_count`, `errors`, and `completed_at` are written.

```typescript
await db
  .update(batches)
  .set({
    status:        'done',
    invoiceCount:  invoiceRows.length,
    failedCount:   errors.length,
    errors:        errors,             // JSONB array
    completedAt:   new Date(),
  })
  .where(eq(batches.batchId, batchId))
```

**Do not update `invoice_count` incrementally inside the loop.** Compute it once at the end from the lengths of `invoiceRows` and `errors`.

**If the entire job fails** (unrecoverable error before step 7), BullMQ retries. If retries are exhausted, mark the batch as `failed` in the `failed` event handler:

```typescript
worker.on('failed', async (job, err) => {
  if (job && isExhausted(job)) {
    await db.update(batches)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(batches.batchId, job.data.batchId))
  }
})
```

---

## ZIP extraction — `unzip.ts`

`extractXmlsFromZip` accepts a readable stream and returns an array of `{ fileName, content }` objects for every `.xml` entry in the archive. It must stream entries — do not extract the entire ZIP into memory or disk at once.

```typescript
import unzipper from 'unzipper'

type XmlEntry = { fileName: string; content: Buffer }

export async function extractXmlsFromZip(stream: Readable): Promise<XmlEntry[]> {
  const results: XmlEntry[] = []

  const zip = stream.pipe(unzipper.Parse({ forceStream: true }))

  for await (const entry of zip) {
    const entryPath: string = entry.path

    // Security: reject zip-slip paths
    if (entryPath.includes('..') || entryPath.startsWith('/')) {
      entry.autodrain()
      continue
    }

    // Only process .xml files — skip directories and other types
    if (!entryPath.toLowerCase().endsWith('.xml')) {
      entry.autodrain()
      continue
    }

    const content = await entry.buffer()
    results.push({ fileName: entryPath, content })
  }

  return results
}
```

**Rules enforced during extraction:**

| Rule | Reason |
|---|---|
| Reject paths containing `..` | Zip-slip attack prevention — path traversal outside intended directory |
| Reject paths starting with `/` | Absolute path injection prevention |
| Skip non-`.xml` entries | Only invoice XMLs are relevant; other files are ignored silently |
| Call `entry.autodrain()` on skipped entries | Required by unzipper — un-drained entries stall the stream |
| Do not write entries to disk | Process in memory only — no temp file cleanup required |

**Maximum entry count:** Enforce a limit to prevent ZIP bombs.

```typescript
if (results.length >= MAX_XML_ENTRIES) {
  throw new NonRetryableError(`ZIP exceeds maximum entry limit of ${MAX_XML_ENTRIES}`)
}
```

Set `MAX_XML_ENTRIES` via environment variable. Default: `1000`.

### Size and decompression guards

- **Per-XML cap (`MAX_XML_BYTES`, default 1 MB).** Every individual XML —
  standalone file or decompressed ZIP entry — is read with a streaming byte
  counter and rejected the instant it exceeds the cap. Rejected files are
  recorded in the batch `errors[]` as `{ file_name, reason: "exceeds N MB limit" }`
  and skipped; the batch continues.
- **Total decompression backstop (`MAX_TOTAL_DECOMPRESSED_BYTES`, default 512 MB).**
  Cumulative decompressed bytes across all ZIP entries; exceeding it fails the
  whole job with a non-retryable error.
- **Expansion-ratio guard (`MAX_DECOMPRESSION_RATIO`, default 30×).** Aborts the
  job when cumulative decompressed exceeds 30× the compressed bytes consumed —
  the early zip-bomb detector.
- **Entry-count cap (`MAX_XML_ENTRIES`, default 1000).** Unchanged.

### Memory tunables (512 MB / 1 vCPU worker)

- `WORKER_CONCURRENCY = 1`, `CHUNK_SIZE = 25`, Node started with
  `--max-old-space-size=384`. See the env table below.

---

## XML validation — `xml.ts`

### XSD validation

Validate the raw XML buffer against the SAT Guatemala invoice XSD schema before extracting any fields. If validation fails, the entry is skipped and the error is recorded in `batches.errors`.

```typescript
import { XMLValidator } from 'fast-xml-parser'
import { DOMParser } from '@xmldom/xmldom'
import { validateXML } from 'xsd-schema-validator'

type ValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export function validateXsd(content: Buffer): ValidationResult {
  try {
    await validateXML(content.toString(), XSD_SCHEMA_PATH)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
```

`XSD_SCHEMA_PATH` points to the SAT Guatemala invoice XSD file bundled with the worker. This file does not change at runtime — it is committed to the repository.

### Field extraction

After XSD validation passes, extract fields from the XML into a plain object. Use `fast-xml-parser` for parsing.

```typescript
import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export function extractInvoiceFields(content: Buffer): RawInvoice {
  const parsed = parser.parse(content.toString())

  // Navigate to the root invoice element
  const root = parsed['dte:GTDocumento']['dte:SAT']['dte:DTE']['dte:DatosEmision']

  return {
    invoiceNumber: root['@_ID'],
    type:          root['dte:DatosGenerales']['@_Tipo'],
    currency:      root['dte:DatosGenerales']['@_CodigoMoneda'],
    issuedDate:    root['dte:DatosGenerales']['@_FechaHoraEmision'],
    issuerName:    root['dte:Emisor']['@_NombreComercial'],
    issuerNit:     root['dte:Emisor']['@_NITEmisor'],
    clientName:    root['dte:Receptor']['@_NombreReceptor'],
    clientNit:     root['dte:Receptor']['@_IDReceptor'],
    lineItems:     extractLineItems(root['dte:Items']['dte:Item']),
  }
}
```

**The XSD validation in the previous step guarantees structure.** Do not add defensive null checks for every field — if XSD passes, the required fields are present.

---

## Normalization — `normalizer.ts`

Accepts the raw extracted object and returns a normalized invoice object that matches the database schema. This is the only place type coercions happen.

```typescript
export function normalizeInvoice(raw: RawInvoice): NormalizedInvoice {
  return {
    invoiceNumber: raw.invoiceNumber,
    type:          raw.type,                          // stored verbatim
    currency:      raw.currency,                      // stored verbatim
    issuedAt:      new Date(raw.issuedDate),          // parse ISO 8601 with offset
    issuerName:    raw.issuerName.trim(),
    issuerNit:     raw.issuerNit.trim(),               // keep as string — no parseInt
    clientName:    raw.clientName.trim(),
    clientNit:     raw.clientNit.trim(),               // keep as string — no parseInt
    lineItems:     raw.lineItems,                      // stored verbatim — no normalization
    totalAmount:   computeTotal(raw.lineItems),        // sum of line item totals
  }
}
```

**Normalization rules:**

| Field | Rule |
|---|---|
| `type` | Store verbatim. Do not map to a fixed enum. |
| `currency` | Store verbatim. Do not validate against ISO 4217 list. |
| `issuedAt` | Parse with `new Date()`. The `-06:00` offset in Guatemala timestamps is handled correctly by the JS Date constructor and preserved by PostgreSQL `TIMESTAMPTZ`. |
| `issuerNit`, `clientNit` | Trim whitespace. Store as string. Never cast to number. |
| `issuerName`, `clientName` | Trim whitespace only. Do not uppercase, lowercase, or reformat. |
| `lineItems` | Store exactly as extracted. No field renaming. No type coercion. |
| `totalAmount` | Compute as `SUM(line_items[].total)` using a decimal library. Do not use `parseFloat`. |

**Computing `totalAmount`** — use `decimal.js` or equivalent to avoid floating point errors:

```typescript
import Decimal from 'decimal.js'

function computeTotal(lineItems: RawLineItem[]): string {
  const total = lineItems.reduce(
    (sum, item) => sum.plus(new Decimal(item.total)),
    new Decimal(0)
  )
  return total.toFixed(2)   // returns string e.g. '30.00'
}
```

Return `totalAmount` as a string from the normalizer. Drizzle maps it to `NUMERIC(15,2)` on insert.

---

## Error classification

The worker distinguishes between two error categories that drive different behaviors.

### Per-entry errors (non-fatal)

Failures on a single XML file. The job continues processing remaining entries.

| Condition | Behavior |
|---|---|
| XSD validation fails | Push `{ fileName, reason }` to `errors[]`, `continue` loop |
| Field extraction throws | Push `{ fileName, reason }` to `errors[]`, `continue` loop |
| Normalization throws | Push `{ fileName, reason }` to `errors[]`, `continue` loop |
| DB insert for one invoice fails | Push `{ fileName, reason }` to `errors[]`, `continue` loop |

### Job-level errors (fatal — trigger retry or failure)

Failures that make the entire job unable to proceed.

| Condition | Behavior |
|---|---|
| Spaces returns 404 on file fetch | Stamp `file_deleted_at`, throw `NonRetryableError` |
| Spaces returns 5xx | Throw retryable error — BullMQ will retry |
| ZIP is corrupt / cannot be opened | Throw retryable error up to max attempts, then mark batch `failed` |
| Database is unreachable | Throw retryable error — BullMQ will retry |
| Batch row not found (0 rows updated in step 1) | Exit silently — batch was deleted |
| ZIP exceeds `MAX_XML_ENTRIES` | Throw `NonRetryableError` — retrying won't fix this |

---

## Retry policy

Configure on the BullMQ queue definition, not on individual jobs.

```typescript
const queue = new Queue('invoice-processing', {
  connection,
  defaultJobOptions: {
    attempts:  3,
    backoff: {
      type:  'exponential',
      delay: 5_000,        // 5s, 10s, 20s
    },
    removeOnComplete: { age: 86_400 },   // keep completed jobs 24h
    removeOnFail:     { age: 604_800 },  // keep failed jobs 7 days
  },
})
```

`NonRetryableError` must bypass the retry policy. Throw it with `{ attempts: 1 }` override or check `job.attemptsMade` in the `failed` handler.

```typescript
export class NonRetryableError extends Error {
  readonly nonRetryable = true
}

worker.on('failed', async (job, err) => {
  if (err instanceof NonRetryableError || isExhausted(job)) {
    await db.update(batches)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(batches.batchId, job?.data?.batchId))
  }
})

function isExhausted(job: Job): boolean {
  return job.attemptsMade >= (job.opts.attempts ?? 1)
}
```

---

## Environment variables

| Env var | Default | Purpose |
|---|---|---|
| `MAX_XML_BYTES` | `1048576` (1 MB) | Per-XML guard (standalone + each ZIP entry) |
| `MAX_TOTAL_DECOMPRESSED_BYTES` | `536870912` (512 MB) | Archive decompression backstop |
| `MAX_DECOMPRESSION_RATIO` | `30` | Expansion-ratio bomb guard |
| `MAX_XML_ENTRIES` | `1000` | Entry-count cap |
| `WORKER_CONCURRENCY` | `1` | Concurrent jobs (fixed at 1 for this box) |
| `CHUNK_SIZE` | `25` | Invoices retained before DB flush |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string (DO Managed Redis) |
| `SPACES_BUCKET` | — | DO Spaces bucket name |
| `SPACES_ENDPOINT` | — | DO Spaces endpoint e.g. `https://nyc3.digitaloceanspaces.com` |
| `SPACES_KEY` | — | DO Spaces access key ID |
| `SPACES_SECRET` | — | DO Spaces secret access key |
| `SPACES_REGION` | — | DO Spaces region e.g. `nyc3` |
| `XSD_SCHEMA_PATH` | — | Absolute path to SAT invoice XSD file |

---

## DO App Platform configuration

The worker runs as a `worker` process type in the same App Platform app as the API. It has no public port.

```yaml
# .do/app.yaml (relevant section)
workers:
  - name: invoice-worker
    run_command: node dist/apps/worker/src/index.js
    instance_size_slug: professional-xs   # more CPU than basic — XML parsing is CPU-bound
    instance_count: 1                     # scale up for higher throughput
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: REDIS_URL
        scope: RUN_TIME
        type: SECRET
```

Scaling `instance_count` increases parallel job processing. Each instance runs `WORKER_CONCURRENCY` jobs concurrently, so with the default `WORKER_CONCURRENCY: 1`, `instance_count: 2` = 2 parallel jobs. Raising `WORKER_CONCURRENCY` above 1 is an override, not the default — only do so on an upsized instance (see "Memory tunables" above).

---

## Invariants — what must always be true after a job completes

The following conditions must hold after `processJob` returns or throws its final error. Any implementation must satisfy all of them.

| Invariant | Description |
|---|---|
| Batch status is terminal | `batches.status` is `done` or `failed` — never left as `processing` |
| `invoice_count` + `failed_count` = total entries | Must equal the number of XML entries in the file |
| Every successful entry has a DB row | An invoice row exists for every entry not in `batches.errors` |
| No invoice row exists for failed entries | Entries in `batches.errors` have no corresponding row in `invoices` |
| `raw_payload` is populated | Every invoice row has the pre-normalization object stored in `raw_payload` |
| `line_items` is verbatim | `invoices.line_items` matches the XML exactly — no field renaming |
| `totalAmount` is a sum | `invoices.total_amount` equals `SUM(line_items[].total)` for that invoice |
| NIT fields are strings | `issuer_nit` and `client_nit` are never cast to integers at any point |

> `raw_payload` (jsonb) is unchanged. With the 1 MB per-XML cap and
> `CHUNK_SIZE = 25`, retained payload volume stays bounded; `raw_payload`
> trimming remains optional and is not implemented here.
