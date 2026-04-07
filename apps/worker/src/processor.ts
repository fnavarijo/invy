import type { Job } from 'bullmq';
import type { InferInsertModel } from 'drizzle-orm';
import type { Readable } from 'node:stream';
import { eq, inArray } from 'drizzle-orm';
import { type DB, batches, invoices, batchInvoices } from '@invy/db';
import { type StorageClient, StorageError } from '@invy/storage';
import { NonRetryableError } from './errors.ts';
import { extractXmlsFromZip } from './unzip.ts';
import { validateXsd, extractInvoiceFields } from './xml.ts';
import { normalizeInvoice } from './normalizer.ts';
import { ulid } from 'ulid';

export type JobPayload = { batchId: string; fileKey: string };
type NewInvoice = InferInsertModel<typeof invoices>;
type NewBatchInvoice = InferInsertModel<typeof batchInvoices>;
type BatchError = { file_name: string; reason: string };

const CHUNK_SIZE = 100;

function generateId(prefix: string): string {
  return `${prefix}_${ulid().toLowerCase()}`;
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function processJob(
  job: Job<JobPayload>,
  db: DB,
  storage: StorageClient,
): Promise<void> {
  console.log('Processing?');
  const { batchId, fileKey } = job.data;

  // Steps 1 + 3 merged: mark processing and read file metadata in one query.
  // If 0 rows returned, the batch was deleted before the worker started — exit silently.
  const [batch] = await db
    .update(batches)
    .set({ status: 'processing' })
    .where(eq(batches.batch_id, batchId))
    .returning({
      batch_id: batches.batch_id,
      file_type: batches.file_type,
      file_name: batches.file_name,
      user_id: batches.user_id,
    });

  if (!batch) return;

  // Step 2 — fetch file stream from object storage
  let fileStream: Readable;
  try {
    fileStream = await storage.getStream(fileKey);
  } catch (err) {
    if (
      err instanceof StorageError &&
      (err as StorageError).code === 'NOT_FOUND'
    ) {
      await db
        .update(batches)
        .set({
          status: 'failed',
          file_deleted_at: new Date(),
          completed_at: new Date(),
        })
        .where(eq(batches.batch_id, batchId));
      throw new NonRetryableError(`File not found in storage: ${fileKey}`);
    }
    throw err;
  }

  // Step 4 — produce XML entries
  type XmlEntry = { fileName: string; content: Buffer };
  let entries: XmlEntry[];

  if (batch.file_type === 'xml') {
    const content = await streamToBuffer(fileStream);
    entries = [{ fileName: batch.file_name, content }];
  } else {
    try {
      entries = await extractXmlsFromZip(fileStream);
    } catch (err) {
      if (err instanceof NonRetryableError) {
        await db
          .update(batches)
          .set({ status: 'failed', completed_at: new Date() })
          .where(eq(batches.batch_id, batchId));
        throw err;
      }
      throw err;
    }
  }

  // Step 5 — validate, extract, and normalize each entry
  type PendingInvoice = { invoiceRow: NewInvoice; sourceFile: string };
  const pending: PendingInvoice[] = [];
  const errors: BatchError[] = [];

  for (const entry of entries) {
    const validation = validateXsd(entry.content);
    if (!validation.ok) {
      errors.push({ file_name: entry.fileName, reason: validation.error });
      continue;
    }

    let extracted;
    try {
      extracted = extractInvoiceFields(entry.content);
    } catch (err) {
      errors.push({ file_name: entry.fileName, reason: String(err) });
      continue;
    }

    let normalized;
    try {
      normalized = normalizeInvoice(extracted);
    } catch (err) {
      errors.push({ file_name: entry.fileName, reason: String(err) });
      continue;
    }

    pending.push({
      sourceFile: entry.fileName,
      invoiceRow: {
        invoice_id: generateId('inv'),
        user_id: batch.user_id,
        invoice_number: normalized.invoiceNumber,
        type: normalized.type,
        currency: normalized.currency,
        total_amount: normalized.totalAmount,
        issued_at: normalized.issuedAt,
        issuer_name: normalized.issuerName,
        issuer_nit: normalized.issuerNit,
        client_name: normalized.clientName,
        client_nit: normalized.clientNit,
        line_items: normalized.lineItems,
        raw_payload: extracted.rawPayload,
      },
    });
  }

  // Step 6 — upsert invoices (skip duplicates) then link to this batch
  //
  // For each chunk: insert invoices with ON CONFLICT DO NOTHING, then resolve
  // the actual invoice_ids (new or pre-existing) by invoice_number, and insert
  // into batch_invoices.
  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);
    const invoiceRows = chunk.map((p) => p.invoiceRow);

    // Insert new invoices, skip duplicates silently
    await db.insert(invoices).values(invoiceRows).onConflictDoNothing();

    // Resolve invoice_ids for all invoice_numbers in this chunk (new + existing)
    const invoiceNumbers = invoiceRows.map((r) => r.invoice_number);
    const resolved = await db
      .select({ invoice_id: invoices.invoice_id, invoice_number: invoices.invoice_number })
      .from(invoices)
      .where(inArray(invoices.invoice_number, invoiceNumbers));

    const idByNumber = new Map(resolved.map((r) => [r.invoice_number, r.invoice_id]));

    const batchInvoiceRows: NewBatchInvoice[] = chunk.map((p) => ({
      batch_id: batchId,
      invoice_id: idByNumber.get(p.invoiceRow.invoice_number)!,
      source_file: p.sourceFile,
    }));

    await db.insert(batchInvoices).values(batchInvoiceRows).onConflictDoNothing();
  }

  // Step 7 — finalize batch
  await db
    .update(batches)
    .set({
      status: 'done',
      invoice_count: pending.length,
      failed_count: errors.length,
      errors,
      completed_at: new Date(),
    })
    .where(eq(batches.batch_id, batchId));
}
