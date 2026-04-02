import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import multipart, { type MultipartFile } from '@fastify/multipart';
import { ulid } from 'ulid';
import { eq, and, ne, desc, asc, sql } from 'drizzle-orm';
import { batches, invoices } from '@invy/db';
import { getAuth } from '@clerk/fastify';
import ExcelJS from 'exceljs';
import type {
  FileType,
  TopProductByQuantity,
  TopProductByRevenue,
  TopBuyer,
  AnalyticsResponse,
} from '../../../types/index.ts';
import { buildError, encodeCursor, decodeCursor } from '../../../lib/http.ts';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const VALID_STATUSES = new Set(['queued', 'processing', 'done', 'failed']);

function mimeToFileType(mime: string): FileType | null {
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed')
    return 'zip';
  if (mime === 'application/xml' || mime === 'text/xml') return 'xml';
  return null;
}

// Columns returned in batch list responses (no errors, no internal fields)
const batchListColumns = {
  batch_id: batches.batch_id,
  status: batches.status,
  file_type: batches.file_type,
  file_name: batches.file_name,
  source: batches.source,
  invoice_count: batches.invoice_count,
  failed_count: batches.failed_count,
  created_at: batches.created_at,
  completed_at: batches.completed_at,
};

// Columns returned in batch detail response (adds errors, still no internal fields)
const batchDetailColumns = {
  ...batchListColumns,
  errors: batches.errors,
};

// Columns returned in invoice list responses (no line_items, no raw_payload)
const invoiceListColumns = {
  invoice_id: invoices.invoice_id,
  batch_id: invoices.batch_id,
  invoice_number: invoices.invoice_number,
  type: invoices.type,
  currency: invoices.currency,
  total_amount: invoices.total_amount,
  issued_at: invoices.issued_at,
  issuer_name: invoices.issuer_name,
  issuer_nit: invoices.issuer_nit,
  client_name: invoices.client_name,
  client_nit: invoices.client_nit,
  source_file: invoices.source_file,
  created_at: invoices.created_at,
};

interface BatchListQuery {
  status?: string;
  limit?: string;
  cursor?: string;
}

interface InvoiceListQuery {
  limit?: string;
  cursor?: string;
}

interface AnalyticsQuery {
  limit?: string;
}

async function drainPart(part: { toBuffer(): Promise<Buffer> }): Promise<void> {
  await part.toBuffer().catch(() => {});
}

async function assertBatchOwner(
  db: FastifyInstance['db'],
  batch_id: string,
  user_id: string,
): Promise<boolean> {
  const [row] = await db
    .select({ batch_id: batches.batch_id })
    .from(batches)
    .where(and(eq(batches.batch_id, batch_id), eq(batches.user_id, user_id)))
    .limit(1);
  return row !== undefined;
}

async function processFilePart(
  fastify: FastifyInstance,
  part: MultipartFile,
  source: string | null,
  userId: string,
  reply: FastifyReply,
): Promise<object | null> {
  const fileName = part.filename ?? 'upload';
  const mimeType = part.mimetype ?? '';

  const fileType = mimeToFileType(mimeType);
  if (!fileType) {
    await drainPart(part);
    return reply
      .status(415)
      .send(
        buildError(
          'UNSUPPORTED_FILE_TYPE',
          `Unsupported file type "${mimeType}". Accepted: application/zip, application/xml, text/xml.`,
        ),
      );
  }

  const batchId = `b_${ulid().toLowerCase()}`;
  const now = new Date();
  const fileKey = `batches/${batchId}/${fileName}`;

  const upload = fastify.storage.createUpload({
    key: fileKey,
    body: part.file,
    contentType: mimeType,
  });

  try {
    await upload.done();
  } catch (err) {
    if (part.file.truncated) {
      await upload.abort();
      return reply
        .status(413)
        .send(buildError('FILE_TOO_LARGE', 'File exceeds the 50 MB limit.'));
    }
    throw err;
  }

  if (part.file.truncated) {
    await upload.abort();
    return reply
      .status(413)
      .send(buildError('FILE_TOO_LARGE', 'File exceeds the 50 MB limit.'));
  }

  // TODO: In case the insertion fails, we should delete the file from storage.
  await fastify.db.insert(batches).values({
    batch_id: batchId,
    status: 'queued',
    file_type: fileType,
    file_name: fileName,
    file_key: fileKey,
    source: source ?? null,
    user_id: userId,
    errors: [],
    created_at: now,
  });

  try {
    await fastify.queue.add('process-invoice', { batchId, fileKey });
  } catch (err) {
    // Compensating cleanup: undo the DB insert and storage upload.
    // Storage delete is best-effort — log failures but don't mask the original error.
    await fastify.db
      .delete(batches)
      .where(eq(batches.batch_id, batchId))
      .catch((dbErr) => {
        fastify.log.error(
          { dbErr, batchId },
          'queue: failed to rollback batch row after enqueue failure',
        );
      });
    await fastify.storage.delete(fileKey).catch((storageErr) => {
      fastify.log.error(
        { storageErr, fileKey },
        'queue: failed to delete orphaned file after enqueue failure',
      );
    });
    throw err;
  }

  return reply.status(202).header('Location', `/v1/batches/${batchId}`).send({
    batch_id: batchId,
    status: 'queued',
    file_type: fileType,
    file_name: fileName,
    created_at: now.toISOString(),
  });
}

const batchesRoute: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
    throwFileSizeLimit: false,
  });

  // ── POST /v1/batches ─────────────────────────────────────────────────────────
  fastify.post<{ Reply: object }>(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.isMultipart()) {
        return reply
          .status(400)
          .send(
            buildError(
              'INVALID_CONTENT_TYPE',
              'Request must be multipart/form-data.',
            ),
          );
      }

      const { userId } = getAuth(request);
      const ownerId = userId!;

      let fileFound = false;
      // NOTE: "source" must arrive before "file" in the multipart body so it
      // is available when processFilePart builds the DB record.
      let source: string | null = null;

      try {
        for await (const part of request.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            fileFound = true;
            return await processFilePart(
              fastify,
              part as MultipartFile,
              source,
              ownerId,
              reply,
            );
          } else if (part.type === 'field' && part.fieldname === 'source') {
            source = part.value as string;
          }
        }
      } catch (err) {
        fastify.log.error(err, 'multipart parse error');
        return reply
          .status(400)
          .send(
            buildError('UPLOAD_FAILED', 'Failed to parse multipart request.'),
          );
      }

      if (!fileFound) {
        return reply
          .status(400)
          .send(buildError('MISSING_FIELD', 'Field "file" is required.'));
      }
    },
  );

  // ── GET /v1/batches ───────────────────────────────────────────────────────────
  fastify.get<{ Querystring: BatchListQuery }>(
    '/',
    async (
      request: FastifyRequest<{ Querystring: BatchListQuery }>,
      reply: FastifyReply,
    ) => {
      const { status, cursor } = request.query;
      const limitRaw = parseInt(request.query.limit ?? '20', 10);

      if (isNaN(limitRaw) || limitRaw < 1) {
        return reply
          .status(400)
          .send(
            buildError('INVALID_PARAM', '"limit" must be a positive integer.'),
          );
      }

      if (status !== undefined && !VALID_STATUSES.has(status)) {
        return reply
          .status(400)
          .send(
            buildError(
              'INVALID_PARAM',
              `"status" must be one of: queued, processing, done, failed.`,
            ),
          );
      }

      const limit = Math.min(limitRaw, 100);

      let decoded = null;
      if (cursor) {
        decoded = decodeCursor(cursor);
        if (!decoded) {
          return reply
            .status(400)
            .send(buildError('INVALID_PARAM', 'Invalid cursor value.'));
        }
      }

      const { userId } = getAuth(request);
      const ownerId = userId!;

      const conditions = [eq(batches.user_id, ownerId)];
      if (status)
        conditions.push(
          eq(
            batches.status,
            status as 'queued' | 'processing' | 'done' | 'failed',
          ),
        );
      if (decoded) {
        conditions.push(
          sql`(${batches.created_at}, ${batches.batch_id}) < (${new Date(decoded.cursor_at)}::timestamptz, ${decoded.id})`,
        );
      }

      const rows = await fastify.db
        .select(batchListColumns)
        .from(batches)
        .where(and(...conditions))
        .orderBy(desc(batches.created_at), desc(batches.batch_id))
        .limit(limit + 1);

      let data = rows;
      let next_cursor: string | null = null;

      if (data.length > limit) {
        data = data.slice(0, limit);
        const last = data[data.length - 1]!;
        next_cursor = encodeCursor(last.created_at, last.batch_id);
      }

      return reply.send({ data, next_cursor });
    },
  );

  // ── GET /v1/batches/:batch_id ─────────────────────────────────────────────────
  fastify.get<{ Params: { batch_id: string } }>(
    '/:batch_id',
    async (
      request: FastifyRequest<{ Params: { batch_id: string } }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const { userId } = getAuth(request);
      const ownerId = userId!;

      const [batch] = await fastify.db
        .select(batchDetailColumns)
        .from(batches)
        .where(
          and(eq(batches.batch_id, batch_id), eq(batches.user_id, ownerId)),
        )
        .limit(1);

      if (!batch) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      return reply.send(batch);
    },
  );

  // ── DELETE /v1/batches/:batch_id ──────────────────────────────────────────────
  fastify.delete<{ Params: { batch_id: string } }>(
    '/:batch_id',
    async (
      request: FastifyRequest<{ Params: { batch_id: string } }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const { userId } = getAuth(request);
      const ownerId = userId!;

      // Fast existence check before attempting deletion
      const [existing] = await fastify.db
        .select({ status: batches.status })
        .from(batches)
        .where(
          and(eq(batches.batch_id, batch_id), eq(batches.user_id, ownerId)),
        )
        .limit(1);

      if (!existing) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      if (existing.status === 'processing') {
        return reply
          .status(409)
          .send(
            buildError(
              'CONFLICT',
              'Cannot delete a batch that is currently processing.',
            ),
          );
      }

      // Atomic delete: guard against a concurrent worker flipping status to processing
      const deleted = await fastify.db
        .delete(batches)
        .where(
          and(
            eq(batches.batch_id, batch_id),
            eq(batches.user_id, ownerId),
            ne(batches.status, 'processing'),
          ),
        )
        .returning({ batch_id: batches.batch_id, file_key: batches.file_key });

      if (deleted.length === 0) {
        // Status changed to processing between our check and the delete
        return reply
          .status(409)
          .send(
            buildError(
              'CONFLICT',
              'Cannot delete a batch that is currently processing.',
            ),
          );
      }

      const fileKey = deleted[0]!.file_key;
      if (fileKey) {
        try {
          await fastify.storage.delete(fileKey);
        } catch (err) {
          // Log but don't fail the request — DB row is already deleted
          fastify.log.error(
            { err, fileKey },
            'storage: failed to delete file from Spaces',
          );
        }
      }

      return reply.status(204).send();
    },
  );

  // ── GET /v1/batches/:batch_id/invoices ────────────────────────────────────────
  fastify.get<{ Params: { batch_id: string }; Querystring: InvoiceListQuery }>(
    '/:batch_id/invoices',
    async (
      request: FastifyRequest<{
        Params: { batch_id: string };
        Querystring: InvoiceListQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const limitRaw = parseInt(request.query.limit ?? '50', 10);

      if (isNaN(limitRaw) || limitRaw < 1) {
        return reply
          .status(400)
          .send(
            buildError('INVALID_PARAM', '"limit" must be a positive integer.'),
          );
      }

      const limit = Math.min(limitRaw, 200);
      const { cursor } = request.query;

      const { userId } = getAuth(request);
      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      let decoded = null;
      if (cursor) {
        decoded = decodeCursor(cursor);
        if (!decoded) {
          return reply
            .status(400)
            .send(buildError('INVALID_PARAM', 'Invalid cursor value.'));
        }
      }

      // Ordered by created_at ASC per spec — cursor moves forward with >
      const conditions = [eq(invoices.batch_id, batch_id)];
      if (decoded) {
        conditions.push(
          sql`(${invoices.created_at}, ${invoices.invoice_id}) > (${new Date(decoded.cursor_at)}::timestamptz, ${decoded.id})`,
        );
      }

      const rows = await fastify.db
        .select(invoiceListColumns)
        .from(invoices)
        .where(and(...conditions))
        .orderBy(asc(invoices.created_at), asc(invoices.invoice_id))
        .limit(limit + 1);

      let data = rows;
      let next_cursor: string | null = null;

      if (data.length > limit) {
        data = data.slice(0, limit);
        const last = data[data.length - 1]!;
        next_cursor = encodeCursor(last.created_at, last.invoice_id);
      }

      return reply.send({ batch_id, data, next_cursor });
    },
  );

  // ── GET /v1/batches/:batch_id/export/xlsx ────────────────────────────────────
  fastify.get<{ Params: { batch_id: string } }>(
    '/:batch_id/export/xlsx',
    async (
      request: FastifyRequest<{ Params: { batch_id: string } }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const { userId } = getAuth(request);

      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      const rows = await fastify.db
        .select({
          invoice_number: invoices.invoice_number,
          type: invoices.type,
          currency: invoices.currency,
          total_amount: invoices.total_amount,
          issued_at: invoices.issued_at,
          issuer_name: invoices.issuer_name,
          issuer_nit: invoices.issuer_nit,
          client_name: invoices.client_name,
          client_nit: invoices.client_nit,
          line_items: invoices.line_items,
          source_file: invoices.source_file,
        })
        .from(invoices)
        .where(eq(invoices.batch_id, batch_id))
        .orderBy(asc(invoices.issued_at), asc(invoices.invoice_id));

      const workbook = new ExcelJS.Workbook();

      // Sheet 1 — one row per invoice
      const invoiceSheet = workbook.addWorksheet('Invoices');
      invoiceSheet.columns = [
        { header: 'Numero de factura', key: 'invoice_number', width: 22 },
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Valor Total', key: 'total_amount', width: 16 },
        { header: 'Fecha Generacion', key: 'issued_at', width: 24 },
        { header: 'Nombre emisor', key: 'issuer_name', width: 32 },
        { header: 'NIT emisor', key: 'issuer_nit', width: 16 },
        { header: 'Nombre cliente', key: 'client_name', width: 32 },
        { header: 'NIT cliente', key: 'client_nit', width: 16 },
        { header: 'Archivo', key: 'source_file', width: 28 },
      ];

      for (const row of rows) {
        invoiceSheet.addRow({
          invoice_number: row.invoice_number,
          type: row.type,
          currency: row.currency,
          total_amount: Number(row.total_amount),
          issued_at: new Date(row.issued_at).toISOString(),
          issuer_name: row.issuer_name,
          issuer_nit: row.issuer_nit,
          client_name: row.client_name,
          client_nit: row.client_nit,
          source_file: row.source_file,
        });
      }

      // Sheet 2 — one row per line item, referencing invoice_number
      const lineItemsSheet = workbook.addWorksheet('Line Items');
      lineItemsSheet.columns = [
        { header: 'Invoice Number', key: 'invoice_number', width: 22 },
        { header: 'Item Name', key: 'name', width: 36 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Unit Price', key: 'unit_price', width: 16 },
        { header: 'Total', key: 'total', width: 16 },
      ];

      for (const row of rows) {
        for (const item of row.line_items ?? []) {
          lineItemsSheet.addRow({
            invoice_number: row.invoice_number,
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            total: Number(item.total),
          });
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `batch_${batch_id}_invoices.xlsx`;

      return reply
        .header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(Buffer.from(buffer));
    },
  );

  // ── GET /v1/batches/:batch_id/export/products/xlsx ───────────────────────────
  fastify.get<{ Params: { batch_id: string } }>(
    '/:batch_id/export/products/xlsx',
    async (
      request: FastifyRequest<{ Params: { batch_id: string } }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const { userId } = getAuth(request);

      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      const rows = await fastify.db.execute<{
        product_name: string;
        total_amount: string;
      }>(sql`
        SELECT
          elem->>'name'                  AS product_name,
          SUM((elem->>'total')::numeric) AS total_amount
        FROM invoices,
          jsonb_array_elements(line_items) AS elem
        WHERE batch_id = ${batch_id}
        GROUP BY product_name
        ORDER BY total_amount DESC
      `);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Productos');
      sheet.columns = [
        { header: 'Producto', key: 'product_name', width: 48 },
        { header: 'Total',    key: 'total_amount', width: 18 },
      ];

      for (const row of rows) {
        sheet.addRow({
          product_name: row.product_name,
          total_amount: Number(row.total_amount),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `batch_${batch_id}_products.xlsx`;

      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(Buffer.from(buffer));
    },
  );

  // ── GET /v1/batches/:batch_id/analytics/top-products-by-quantity ──────────────
  fastify.get<{ Params: { batch_id: string }; Querystring: AnalyticsQuery }>(
    '/:batch_id/analytics/top-products-by-quantity',
    async (
      request: FastifyRequest<{
        Params: { batch_id: string };
        Querystring: AnalyticsQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const limit = Math.min(
        parseInt(request.query.limit ?? '10', 10) || 10,
        50,
      );

      const { userId } = getAuth(request);
      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      const rows = await fastify.db.execute<{
        product_name: string;
        total_quantity: string;
      }>(
        sql`
          SELECT
            elem->>'name'                     AS product_name,
            SUM((elem->>'quantity')::numeric) AS total_quantity
          FROM ${invoices},
            jsonb_array_elements(${invoices.line_items}) AS elem
          WHERE ${invoices.batch_id} = ${batch_id}
          GROUP BY product_name
          ORDER BY total_quantity DESC
          LIMIT ${limit}
        `,
      );

      const response: AnalyticsResponse<TopProductByQuantity> = {
        batch_id,
        data: rows.map((r) => ({
          product_name: r.product_name,
          total_quantity: Number(r.total_quantity).toFixed(2),
        })),
      };

      return reply.send(response);
    },
  );

  // ── GET /v1/batches/:batch_id/analytics/top-products-by-revenue ───────────────
  fastify.get<{ Params: { batch_id: string }; Querystring: AnalyticsQuery }>(
    '/:batch_id/analytics/top-products-by-revenue',
    async (
      request: FastifyRequest<{
        Params: { batch_id: string };
        Querystring: AnalyticsQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const limit = Math.min(
        parseInt(request.query.limit ?? '10', 10) || 10,
        50,
      );

      const { userId } = getAuth(request);
      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      const rows = await fastify.db.execute<{
        product_name: string;
        total_revenue: string;
      }>(
        sql`
          SELECT
            elem->>'name'                  AS product_name,
            SUM((elem->>'total')::numeric) AS total_revenue
          FROM ${invoices},
            jsonb_array_elements(${invoices.line_items}) AS elem
          WHERE ${invoices.batch_id} = ${batch_id}
          GROUP BY product_name
          ORDER BY total_revenue DESC
          LIMIT ${limit}
        `,
      );

      const response: AnalyticsResponse<TopProductByRevenue> = {
        batch_id,
        data: rows.map((r) => ({
          product_name: r.product_name,
          total_revenue: Number(r.total_revenue).toFixed(2),
        })),
      };

      return reply.send(response);
    },
  );

  // ── GET /v1/batches/:batch_id/analytics/top-buyers ────────────────────────────
  fastify.get<{ Params: { batch_id: string }; Querystring: AnalyticsQuery }>(
    '/:batch_id/analytics/top-buyers',
    async (
      request: FastifyRequest<{
        Params: { batch_id: string };
        Querystring: AnalyticsQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { batch_id } = request.params;
      const limit = Math.min(
        parseInt(request.query.limit ?? '10', 10) || 10,
        50,
      );

      const { userId } = getAuth(request);
      if (!(await assertBatchOwner(fastify.db, batch_id, userId!))) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Batch not found.'));
      }

      const rows = await fastify.db
        .select({
          client_name: invoices.client_name,
          client_nit: invoices.client_nit,
          total_spent: sql<string>`SUM(${invoices.total_amount})::text`,
          invoice_count: sql<number>`COUNT(*)::int`,
        })
        .from(invoices)
        .where(eq(invoices.batch_id, batch_id))
        .groupBy(invoices.client_name, invoices.client_nit)
        .orderBy(sql`SUM(${invoices.total_amount}) DESC`)
        .limit(limit);

      const response: AnalyticsResponse<TopBuyer> = {
        batch_id,
        data: rows.map((r) => ({
          client_name: r.client_name,
          client_nit: r.client_nit,
          total_spent: Number(r.total_spent).toFixed(2),
          invoice_count: r.invoice_count,
        })),
      };

      return reply.send(response);
    },
  );
};

export default batchesRoute;
