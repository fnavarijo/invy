import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { invoices } from '@invy/db';
import { getAuth } from '@clerk/fastify';
import ExcelJS from 'exceljs';
import { buildError, encodeCursor, decodeCursor } from '../../../lib/http.ts';

interface InvoiceListQuery {
  type?: string;
  currency?: string;
  issuer_nit?: string;
  client_nit?: string;
  issued_from?: string;
  issued_to?: string;
  limit?: string;
  cursor?: string;
}

// Columns returned in invoice list responses (no line_items, no raw_payload)
const invoiceListColumns = {
  invoice_id: invoices.invoice_id,
  invoice_number: invoices.invoice_number,
  type: invoices.type,
  currency: invoices.currency,
  total_amount: invoices.total_amount,
  issued_at: invoices.issued_at,
  issuer_name: invoices.issuer_name,
  issuer_nit: invoices.issuer_nit,
  client_name: invoices.client_name,
  client_nit: invoices.client_nit,
  created_at: invoices.created_at,
};

const invoicesRoute: FastifyPluginAsync = async (fastify) => {
  // ── GET /v1/invoices ──────────────────────────────────────────────────────────
  fastify.get<{ Querystring: InvoiceListQuery }>(
    '/',
    async (
      request: FastifyRequest<{ Querystring: InvoiceListQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const {
        type,
        currency,
        issuer_nit,
        client_nit,
        issued_from,
        issued_to,
        cursor,
      } = request.query;
      const limitRaw = parseInt(request.query.limit ?? '50', 10);

      if (isNaN(limitRaw) || limitRaw < 1) {
        return reply
          .status(400)
          .send(
            buildError('INVALID_PARAM', '"limit" must be a positive integer.'),
          );
      }

      if (issued_from !== undefined && isNaN(new Date(issued_from).getTime())) {
        return reply
          .status(400)
          .send(
            buildError(
              'INVALID_PARAM',
              '"issued_from" must be a valid ISO 8601 date.',
            ),
          );
      }

      if (issued_to !== undefined && isNaN(new Date(issued_to).getTime())) {
        return reply
          .status(400)
          .send(
            buildError(
              'INVALID_PARAM',
              '"issued_to" must be a valid ISO 8601 date.',
            ),
          );
      }

      const limit = Math.min(limitRaw, 200);

      let decoded = null;
      if (cursor) {
        decoded = decodeCursor(cursor);
        if (!decoded) {
          return reply
            .status(400)
            .send(buildError('INVALID_PARAM', 'Invalid cursor value.'));
        }
      }

      const conditions = [eq(invoices.user_id, userId!)];
      if (type) conditions.push(eq(invoices.type, type));
      if (currency) conditions.push(eq(invoices.currency, currency));
      if (issuer_nit) conditions.push(eq(invoices.issuer_nit, issuer_nit));
      if (client_nit) conditions.push(eq(invoices.client_nit, client_nit));
      if (issued_from)
        conditions.push(gte(invoices.issued_at, new Date(issued_from)));
      if (issued_to)
        conditions.push(lte(invoices.issued_at, new Date(issued_to)));
      if (decoded) {
        conditions.push(
          sql`(${invoices.issued_at}, ${invoices.invoice_id}) < (${new Date(decoded.cursor_at)}::timestamptz, ${decoded.id})`,
        );
      }

      const rows = await fastify.db
        .select(invoiceListColumns)
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.issued_at), desc(invoices.invoice_id))
        .limit(limit + 1);

      let data = rows;
      let next_cursor: string | null = null;

      if (data.length > limit) {
        data = data.slice(0, limit);
        const last = data[data.length - 1]!;
        next_cursor = encodeCursor(last.issued_at, last.invoice_id);
      }

      return reply.send({ data, next_cursor });
    },
  );

  // ── GET /v1/invoices/export/xlsx ─────────────────────────────────────────────
  fastify.get<{ Querystring: Omit<InvoiceListQuery, 'limit' | 'cursor'> }>(
    '/export/xlsx',
    async (
      request: FastifyRequest<{ Querystring: Omit<InvoiceListQuery, 'limit' | 'cursor'> }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const { type, currency, issuer_nit, client_nit, issued_from, issued_to } = request.query;

      if (issued_from !== undefined && isNaN(new Date(issued_from).getTime())) {
        return reply.status(400).send(buildError('INVALID_PARAM', '"issued_from" must be a valid ISO 8601 date.'));
      }
      if (issued_to !== undefined && isNaN(new Date(issued_to).getTime())) {
        return reply.status(400).send(buildError('INVALID_PARAM', '"issued_to" must be a valid ISO 8601 date.'));
      }

      const conditions = [eq(invoices.user_id, userId!)];
      if (type) conditions.push(eq(invoices.type, type));
      if (currency) conditions.push(eq(invoices.currency, currency));
      if (issuer_nit) conditions.push(eq(invoices.issuer_nit, issuer_nit));
      if (client_nit) conditions.push(eq(invoices.client_nit, client_nit));
      if (issued_from) conditions.push(gte(invoices.issued_at, new Date(issued_from)));
      if (issued_to) conditions.push(lte(invoices.issued_at, new Date(issued_to)));

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
        })
        .from(invoices)
        .where(and(...conditions))
        .orderBy(asc(invoices.issued_at), asc(invoices.invoice_id));

      const workbook = new ExcelJS.Workbook();

      const invoiceSheet = workbook.addWorksheet('Facturas');
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
        });
      }

      const lineItemsSheet = workbook.addWorksheet('Detalle de productos');
      lineItemsSheet.columns = [
        { header: 'Numero de factura', key: 'invoice_number', width: 22 },
        { header: 'Producto', key: 'name', width: 36 },
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Cantidad', key: 'quantity', width: 12 },
        { header: 'Precio unitario', key: 'unit_price', width: 16 },
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
      const from = issued_from ? issued_from.slice(0, 10) : 'all';
      const to = issued_to ? issued_to.slice(0, 10) : 'all';
      const fileName = `facturas_${from}_${to}.xlsx`;

      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(Buffer.from(buffer));
    },
  );

  // ── GET /v1/invoices/:invoice_id ──────────────────────────────────────────────
  fastify.get<{ Params: { invoice_id: string } }>(
    '/:invoice_id',
    async (
      request: FastifyRequest<{ Params: { invoice_id: string } }>,
      reply: FastifyReply,
    ) => {
      const { invoice_id } = request.params;
      const { userId } = getAuth(request);

      const [invoice] = await fastify.db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.invoice_id, invoice_id),
            eq(invoices.user_id, userId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        return reply
          .status(404)
          .send(buildError('NOT_FOUND', 'Invoice not found.'));
      }

      return reply.send(invoice);
    },
  );
};

export default invoicesRoute;
