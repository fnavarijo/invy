# Invoice Processing API — Specification

## Overview

This API accepts XML invoice files (individually or bundled in a ZIP archive), processes them asynchronously, and exposes the normalized invoice data for querying.

**Base URL:** `https://api.example.com/v1`
**Authentication:** Bearer token via `Authorization: Bearer <token>` header on all requests.
**Content negotiation:** All responses are `application/json` unless noted otherwise.

---

## Key concepts

- A **batch** is created when a file is uploaded. It tracks the processing lifecycle of that upload.
- An **invoice** is a single record extracted from one XML file. Each invoice belongs to exactly one batch.
- Upload processing is **asynchronous**. The upload endpoint returns `202 Accepted` immediately. Clients must poll the batch status endpoint to track progress.
- A ZIP upload produces one batch and N invoices (one per valid XML entry inside the archive).
- A single XML upload produces one batch and one invoice.
- An invoice row only exists if it was **successfully extracted**. Failures are recorded in `batches.errors`, not as invoice rows.

---

## Data models

### Batch

Represents an upload operation. Created synchronously by the API on `POST /batches`. Updated by the worker as processing progresses.

| Field | Type | Description |
|---|---|---|
| `batch_id` | string | Unique identifier. Prefix: `b_`. |
| `status` | string | One of: `queued`, `processing`, `done`, `failed`. |
| `file_type` | string | `zip` or `xml` — detected from the uploaded file. |
| `file_name` | string | Original filename from the upload. |
| `source` | string \| null | Optional caller-provided label for the upload origin. |
| `invoice_count` | integer \| null | Number of successfully extracted invoices. `null` until processing completes. |
| `failed_count` | integer \| null | Number of XML entries that failed extraction. `null` until processing completes. |
| `errors` | array | List of per-file error objects. Empty array if no errors. |
| `errors[].file_name` | string | Name of the XML file that failed. |
| `errors[].reason` | string | Human-readable failure reason (e.g. XSD violation, parse error). |
| `created_at` | string | ISO 8601 timestamp — when the batch was created. |
| `completed_at` | string \| null | ISO 8601 timestamp — when processing finished. `null` if not yet complete. |

**Batch status lifecycle:**

```
queued → processing → done
                    → failed
```

| Status | Meaning |
|---|---|
| `queued` | File stored in object storage, job waiting in queue. |
| `processing` | Worker is actively parsing and writing invoice rows. |
| `done` | Processing complete. `failed_count` may be > 0 for partial failures. |
| `failed` | Job failed entirely (e.g. corrupt ZIP, unrecoverable worker error). |

---

### Invoice

Represents a single invoice extracted from one XML file. Fields map directly to the SAT Guatemala XML invoice format. No payment lifecycle state is tracked — if a row exists, it was successfully processed.

| Field | Type | Description |
|---|---|---|
| `invoice_id` | string | Unique identifier. Prefix: `inv_`. |
| `batch_id` | string | The batch this invoice was extracted from. |
| `invoice_number` | string | Invoice number as extracted from the XML. |
| `type` | string | SAT document type code extracted verbatim from the XML. Common values: `FACT` (factura), `NCRE` (nota de crédito), `NDEB` (nota de débito). |
| `currency` | string | ISO 4217 currency code (e.g. `GTQ`, `USD`). |
| `total_amount` | string | Sum of all line item totals, as a decimal string (e.g. `"30.00"`). |
| `issued_at` | string | ISO 8601 timestamp — invoice issue date with UTC offset preserved. |
| `issuer_name` | string | Legal name of the issuing entity. |
| `issuer_nit` | string | NIT (Número de Identificación Tributaria) of the issuer. |
| `client_name` | string | Legal name of the client. |
| `client_nit` | string | NIT of the client. |
| `line_items` | array | Raw line item objects extracted verbatim from the XML. See line item shape below. |
| `source_file` | string | Name of the XML file this invoice was extracted from. |
| `raw_payload` | object | Full extracted XML data as JSON before normalization. Use for debugging or reprocessing. |
| `created_at` | string | ISO 8601 timestamp — when this row was written to the database. |

**Line item shape** — stored and returned exactly as extracted, without normalization:

| Field | Type | Description |
|---|---|---|
| `name` | string | Product or service name verbatim from the XML. |
| `quantity` | number | Quantity. |
| `type` | string | SAT item type code (e.g. `BIEN` for goods, `SERV` for services). |
| `unit_price` | string | Unit price as decimal string. |
| `total` | string | Line total as decimal string. |

**Example invoice object:**

```json
{
  "invoice_id":     "inv_01j9z3kxyz",
  "batch_id":       "b_01j9z3kabc",
  "invoice_number": "2f3a91bc-4401-4e2a-9f1d-000012345678",
  "type":           "FACT",
  "currency":       "GTQ",
  "total_amount":   "30.00",
  "issued_at":      "2026-03-18T14:23:21-06:00",
  "issuer_name":    "COMERCIALIZADORA ASTRAB SOCIEDAD ANONIMA",
  "issuer_nit":     "8194025",
  "client_name":    "LESTER JOSE ALEXANDER , CARRANZA GUZMAN",
  "client_nit":     "93394497",
  "line_items": [
    {
      "name":       "COFIA BLANCA (1 FUERA 2 INVENT)",
      "quantity":   3,
      "type":       "BIEN",
      "unit_price": "10.00",
      "total":      "30.00"
    }
  ],
  "source_file":  "invoice_001.xml",
  "raw_payload":  {},
  "created_at":   "2026-03-24T10:00:44Z"
}
```

---

### Analytics response shapes

All analytics endpoints return:

```json
{
  "batch_id": "b_01j9...",
  "data": [ /* array of result objects, ordered by the ranking metric descending */ ]
}
```

**TopProductByQuantity**

| Field | Type | Description |
|---|---|---|
| `product_name` | string | Product name verbatim from `line_items[].name`. |
| `total_quantity` | string | Sum of `line_items[].quantity` for this product, as a decimal string. |

**TopProductByRevenue**

| Field | Type | Description |
|---|---|---|
| `product_name` | string | Product name verbatim from `line_items[].name`. |
| `total_revenue` | string | Sum of `line_items[].total` for this product, as a decimal string. |

**TopBuyer**

| Field | Type | Description |
|---|---|---|
| `client_name` | string | Legal name of the buyer. |
| `client_nit` | string | NIT of the buyer. |
| `total_spent` | string | Sum of `total_amount` across all the buyer's invoices in the batch, as a decimal string. |
| `invoice_count` | integer | Number of invoices this buyer has in the batch. |

---

## Amount and ID conventions

**Amounts** are returned as **decimal strings** (e.g. `"1250.00"`), never as floats. Parse with a decimal library. Do not cast to JavaScript `number` or Python `float`.

**IDs** use a prefixed string format:
- Batch IDs: `b_` prefix — e.g. `b_01j9z3kabc`
- Invoice IDs: `inv_` prefix — e.g. `inv_01j9z3kxyz`

**NIT values** are stored and returned as strings. Do not cast to integer — NITs may have leading zeros.

---

## Pagination

All list endpoints use **keyset pagination**. Pass the value of `next_cursor` from a response as the `cursor` query parameter to fetch the next page. If `next_cursor` is `null`, there are no more results.

---

## Endpoints

---

### POST /batches

Upload a ZIP archive or a single XML file for async processing. Creates a batch row synchronously and enqueues a processing job.

**Request**

- Method: `POST`
- Path: `/batches`
- Content-Type: `multipart/form-data`

**Request fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | yes | ZIP archive or single XML file. |
| `source` | string | no | Caller-provided label stored on the batch (e.g. `"finance-team"`). |

**Accepted file content types:** `application/zip`, `application/xml`, `text/xml`. Any other type returns `415`.

**Upload size limit.** A single multipart ceiling of **100 MB** applies to both
ZIP archives and standalone XML uploads (env `MAX_ZIP_BYTES`, default
`104857600`). Uploads over the ceiling return `413 FILE_TOO_LARGE` with a
message derived from the limit (e.g. `"File exceeds the 100 MB limit."`).

The API does **not** enforce the 1 MB per-XML rule — an oversized standalone
XML uploads successfully (under 100 MB) and is rejected downstream by the
worker, surfacing as an entry in the batch's `errors[]`.

**Response — 202 Accepted**

```json
{
  "batch_id":   "b_01j9z3kabc",
  "status":     "queued",
  "file_type":  "zip",
  "file_name":  "invoices-oct.zip",
  "created_at": "2026-03-24T10:00:00Z"
}
```

**Error responses**

| Status | When |
|---|---|
| `400 Bad Request` | `file` field is missing. |
| `413 Content Too Large` | File exceeds the 100 MB limit. |
| `415 Unsupported Media Type` | File is not ZIP or XML. |

---

### GET /batches

List all batches. Ordered by `created_at` descending.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | no | Filter by status: `queued`, `processing`, `done`, `failed`. |
| `limit` | integer | no | Default: `20`. Maximum: `100`. |
| `cursor` | string | no | Keyset pagination cursor. |

**Response — 200 OK**

```json
{
  "data": [
    {
      "batch_id":      "b_01j9z3kabc",
      "status":        "done",
      "file_type":     "zip",
      "file_name":     "invoices-oct.zip",
      "invoice_count": 142,
      "failed_count":  2,
      "created_at":    "2026-03-24T10:00:00Z",
      "completed_at":  "2026-03-24T10:00:45Z"
    }
  ],
  "next_cursor": "b_01j8xyzabc"
}
```

**Error responses**

| Status | When |
|---|---|
| `400 Bad Request` | Invalid query parameter value. |

---

### GET /batches/{batch_id}

Retrieve full detail for a single batch including processing summary and per-file errors.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch ID returned from `POST /batches`. |

**Response — 200 OK**

```json
{
  "batch_id":      "b_01j9z3kabc",
  "status":        "done",
  "file_type":     "zip",
  "file_name":     "invoices-oct.zip",
  "source":        "finance-team",
  "invoice_count": 142,
  "failed_count":  2,
  "created_at":    "2026-03-24T10:00:00Z",
  "completed_at":  "2026-03-24T10:00:45Z",
  "errors": [
    {
      "file_name": "inv_0091.xml",
      "reason":    "XSD validation failed: missing <currency> element"
    }
  ]
}
```

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |

---

### DELETE /batches/{batch_id}

Delete a batch, all its invoices, and the original file from object storage. Irreversible.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch to delete. |

**Behavior**
- All invoices referencing this `batch_id` are cascade-deleted from the database.
- The original file is deleted from DO Spaces.
- Rejected if batch status is `processing`.

**Response — 204 No Content.** Empty body.

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |
| `409 Conflict` | Batch status is `processing`. Wait for `done` or `failed` before deleting. |

---

### GET /batches/{batch_id}/invoices

List all invoices belonging to a specific batch. Ordered by `created_at` ascending.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch whose invoices to list. |

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | no | Default: `50`. Maximum: `200`. |
| `cursor` | string | no | Keyset pagination cursor. |

**Response — 200 OK**

```json
{
  "batch_id": "b_01j9z3kabc",
  "data": [
    {
      "invoice_id":     "inv_01j9z3kxyz",
      "batch_id":       "b_01j9z3kabc",
      "invoice_number": "2f3a91bc-4401-4e2a-9f1d-000012345678",
      "type":           "FACT",
      "currency":       "GTQ",
      "total_amount":   "30.00",
      "issued_at":      "2026-03-18T14:23:21-06:00",
      "issuer_name":    "COMERCIALIZADORA ASTRAB SOCIEDAD ANONIMA",
      "issuer_nit":     "8194025",
      "client_name":    "LESTER JOSE ALEXANDER , CARRANZA GUZMAN",
      "client_nit":     "93394497",
      "source_file":    "invoice_001.xml",
      "created_at":     "2026-03-24T10:00:44Z"
    }
  ],
  "next_cursor": "inv_01j8xyzabc"
}
```

Note: `line_items` and `raw_payload` are excluded from list responses. Fetch the full invoice via `GET /invoices/{invoice_id}`.

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |

---

### GET /invoices

List invoices across all batches with filtering. Ordered by `issued_at` descending.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `type` | string | no | Filter by SAT document type code (e.g. `FACT`, `NCRE`, `NDEB`). |
| `currency` | string | no | Filter by ISO 4217 code (e.g. `GTQ`, `USD`). |
| `issuer_nit` | string | no | Filter by issuer NIT. |
| `client_nit` | string | no | Filter by client NIT. |
| `issued_from` | string | no | ISO 8601 date — invoices issued on or after this date. |
| `issued_to` | string | no | ISO 8601 date — invoices issued on or before this date. |
| `limit` | integer | no | Default: `50`. Maximum: `200`. |
| `cursor` | string | no | Keyset pagination cursor. |

**Response — 200 OK**

Same structure as `GET /batches/{batch_id}/invoices` without the top-level `batch_id` field. Each invoice object includes `batch_id` for reference. `line_items` and `raw_payload` excluded.

**Error responses**

| Status | When |
|---|---|
| `400 Bad Request` | Invalid filter parameter. |

---

### GET /invoices/{invoice_id}

Retrieve full detail for a single invoice including line items and raw payload.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `invoice_id` | string | The invoice ID. |

**Response — 200 OK**

Full invoice object as described in the Invoice data model section, including `line_items` and `raw_payload`.

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No invoice with this `invoice_id` exists. |

---

### GET /batches/{batch_id}/analytics/top-products-by-quantity

Top products in a batch ranked by **total units sold** (sum of `line_items[].quantity` across all invoices).

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch to analyse. |

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | no | Default: `10`. Maximum: `50`. |

**Response — 200 OK**

```json
{
  "batch_id": "b_01j9z3kabc",
  "data": [
    { "product_name": "COFIA BLANCA (1 FUERA 2 INVENT)", "total_quantity": "42.00" }
  ]
}
```

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |

---

### GET /batches/{batch_id}/analytics/top-products-by-revenue

Top products in a batch ranked by **total revenue** (sum of `line_items[].total` across all invoices).

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch to analyse. |

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | no | Default: `10`. Maximum: `50`. |

**Response — 200 OK**

```json
{
  "batch_id": "b_01j9z3kabc",
  "data": [
    { "product_name": "COFIA BLANCA (1 FUERA 2 INVENT)", "total_revenue": "420.00" }
  ]
}
```

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |

---

### GET /batches/{batch_id}/analytics/top-buyers

Top buyers in a batch ranked by **total amount spent** (sum of `total_amount` across all invoices per buyer). Returns both spend total and invoice count.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `batch_id` | string | The batch to analyse. |

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | no | Default: `10`. Maximum: `50`. |

**Response — 200 OK**

```json
{
  "batch_id": "b_01j9z3kabc",
  "data": [
    {
      "client_name":    "EMPRESA XYZ SOCIEDAD ANONIMA",
      "client_nit":     "12345678",
      "total_spent":    "1500.00",
      "invoice_count":  3
    }
  ]
}
```

**Error responses**

| Status | When |
|---|---|
| `404 Not Found` | No batch with this `batch_id` exists. |

---

## Common error response shape

```json
{
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "The file field is required.",
    "details": {}
  }
}
```

| Field | Type | Description |
|---|---|---|
| `error.code` | string | Machine-readable code in SCREAMING_SNAKE_CASE. |
| `error.message` | string | Human-readable description. |
| `error.details` | object | Additional context (e.g. which fields failed). May be empty. |

**Common error codes**

| Code | HTTP status | Description |
|---|---|---|
| `MISSING_FIELD` | 400 | A required request field is absent. |
| `INVALID_PARAM` | 400 | A query or path parameter has an invalid value. |
| `UNSUPPORTED_FILE_TYPE` | 415 | File is not ZIP or XML. |
| `FILE_TOO_LARGE` | 413 | File exceeds the 100 MB limit. |
| `NOT_FOUND` | 404 | Resource does not exist. |
| `CONFLICT` | 409 | Operation not allowed given current resource state. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

---

## Async upload polling pattern

After uploading, poll `GET /batches/{batch_id}` until status is `done` or `failed`.

**Recommended intervals:** every 2 seconds for the first 30 seconds, then back off to every 10 seconds.

```
POST /batches
  → 202 { batch_id: "b_01j9..." }

GET /batches/b_01j9...
  → { status: "queued" }      — wait

GET /batches/b_01j9...
  → { status: "processing" }  — wait

GET /batches/b_01j9...
  → { status: "done" }        — proceed

GET /batches/b_01j9.../invoices?limit=200
  → paginate through results
```

If status is `failed`, read the top-level `errors` array for the failure reason. Individual XML validation failures populate `errors` but do not fail the whole batch — the batch reaches `done` with a non-zero `failed_count`.
