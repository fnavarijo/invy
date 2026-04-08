import type { Job } from 'bullmq';
import type { InferInsertModel } from 'drizzle-orm';
import type { Readable } from 'node:stream';
import { eq, inArray } from 'drizzle-orm';
import { type DB, batches, invoices, batchInvoices } from '@invy/db';
import { type StorageClient, StorageError } from '@invy/storage';
import { NonRetryableError } from './errors.ts';
import { streamXmlsFromZip } from './unzip.ts';
import { validateXsd, extractInvoiceFields } from './xml.ts';
import { normalizeInvoice } from './normalizer.ts';
import { ulid } from 'ulid';

export type JobPayload = { batchId: string; fileKey: string };
type NewInvoice = InferInsertModel<typeof invoices>;
type NewBatchInvoice = InferInsertModel<typeof batchInvoices>;
type BatchError = { file_name: string; reason: string };

const CHUNK_SIZE = 100;
const MAX_ERRORS = 500;

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

type PendingInvoice = { invoiceRow: NewInvoice; sourceFile: string };

async function flushChunk(
  chunk: PendingInvoice[],
  batchId: string,
  db: DB,
): Promise<void> {
  const invoiceRows = chunk.map((p) => p.invoiceRow);
  await db.insert(invoices).values(invoiceRows).onConflictDoNothing();

  const invoiceNumbers = invoiceRows.map((r) => r.invoice_number);
  const resolved = await db
    .select({
      invoice_id: invoices.invoice_id,
      invoice_number: invoices.invoice_number,
    })
    .from(invoices)
    .where(inArray(invoices.invoice_number, invoiceNumbers));

  const idByNumber = new Map(
    resolved.map((r) => [r.invoice_number, r.invoice_id]),
  );

  const batchInvoiceRows: NewBatchInvoice[] = chunk
    .filter((p) => idByNumber.has(p.invoiceRow.invoice_number))
    .map((p) => ({
      batch_id: batchId,
      invoice_id: idByNumber.get(p.invoiceRow.invoice_number)!,
      source_file: p.sourceFile,
    }));

  if (batchInvoiceRows.length > 0) {
    await db
      .insert(batchInvoices)
      .values(batchInvoiceRows)
      .onConflictDoNothing();
  }
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

  // Steps 4–6 — stream entries, validate/normalize, flush to DB in chunks
  const chunkBuffer: PendingInvoice[] = [];
  const errors: BatchError[] = [];
  let errorCount = 0;
  let totalSuccessCount = 0;

  async function* entrySource() {
    if (batch.file_type === 'xml') {
      const content = await streamToBuffer(fileStream);
      yield { fileName: batch.file_name, content };
    } else {
      yield* streamXmlsFromZip(fileStream);
    }
  }

  try {
    for await (const entry of entrySource()) {
      const validation = validateXsd(entry.content);
      if (!validation.ok) {
        errorCount++;
        if (errors.length < MAX_ERRORS) {
          errors.push({ file_name: entry.fileName, reason: validation.error });
        }
        continue;
      }

      let extracted;
      try {
        extracted = extractInvoiceFields(entry.content);
      } catch (err) {
        errorCount++;
        if (errors.length < MAX_ERRORS) {
          errors.push({ file_name: entry.fileName, reason: String(err) });
        }
        continue;
      }

      let normalized;
      try {
        normalized = normalizeInvoice(extracted);
      } catch (err) {
        errorCount++;
        if (errors.length < MAX_ERRORS) {
          errors.push({ file_name: entry.fileName, reason: String(err) });
        }
        continue;
      }

      chunkBuffer.push({
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

      if (chunkBuffer.length === CHUNK_SIZE) {
        await flushChunk(chunkBuffer, batchId, db);
        totalSuccessCount += chunkBuffer.length;
        chunkBuffer.length = 0;
        await job.extendLock((job as any).token ?? '', 30000);
      }
    }

    if (chunkBuffer.length > 0) {
      await flushChunk(chunkBuffer, batchId, db);
      totalSuccessCount += chunkBuffer.length;
      chunkBuffer.length = 0;
    }
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

  // Step 7 — finalize batch
  await db
    .update(batches)
    .set({
      status: 'done',
      invoice_count: totalSuccessCount,
      failed_count: errorCount,
      errors,
      completed_at: new Date(),
    })
    .where(eq(batches.batch_id, batchId));
}
