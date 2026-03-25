import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import type { Readable } from 'node:stream';
import { type DB, batches, invoices } from '@invy/db';
import { type StorageClient, StorageError } from '@invy/storage';
import { NonRetryableError } from './errors.ts';
import { extractXmlsFromZip } from './unzip.ts';
import { validateXsd, extractInvoiceFields } from './xml.ts';
import { normalizeInvoice } from './normalizer.ts';
import { ulid } from 'ulid';

export type JobPayload = { batchId: string; fileKey: string };
type NewInvoice = InferInsertModel<typeof invoices>;
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
  const invoiceRows: NewInvoice[] = [];
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

    invoiceRows.push({
      invoice_id: generateId('inv'),
      batch_id: batchId,
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
      source_file: entry.fileName,
      raw_payload: extracted.rawPayload,
    });
  }

  // Step 6 — insert in chunks of 100
  for (let i = 0; i < invoiceRows.length; i += CHUNK_SIZE) {
    await db.insert(invoices).values(invoiceRows.slice(i, i + CHUNK_SIZE));
  }

  // Step 7 — finalize batch
  await db
    .update(batches)
    .set({
      status: 'done',
      invoice_count: invoiceRows.length,
      failed_count: errors.length,
      errors,
      completed_at: new Date(),
    })
    .where(eq(batches.batch_id, batchId));
}
