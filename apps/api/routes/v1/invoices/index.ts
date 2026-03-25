import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { invoices } from '@invy/db'
import { buildError, encodeCursor, decodeCursor } from '../../../lib/http.ts'

interface InvoiceListQuery {
  type?: string
  currency?: string
  issuer_nit?: string
  client_nit?: string
  issued_from?: string
  issued_to?: string
  limit?: string
  cursor?: string
}

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
}

const invoicesRoute: FastifyPluginAsync = async (fastify) => {
  // ── GET /v1/invoices ──────────────────────────────────────────────────────────
  fastify.get<{ Querystring: InvoiceListQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: InvoiceListQuery }>, reply: FastifyReply) => {
      const { type, currency, issuer_nit, client_nit, issued_from, issued_to, cursor } = request.query
      const limitRaw = parseInt(request.query.limit ?? '50', 10)

      if (isNaN(limitRaw) || limitRaw < 1) {
        return reply.status(400).send(buildError('INVALID_PARAM', '"limit" must be a positive integer.'))
      }

      if (issued_from !== undefined && isNaN(new Date(issued_from).getTime())) {
        return reply.status(400).send(buildError('INVALID_PARAM', '"issued_from" must be a valid ISO 8601 date.'))
      }

      if (issued_to !== undefined && isNaN(new Date(issued_to).getTime())) {
        return reply.status(400).send(buildError('INVALID_PARAM', '"issued_to" must be a valid ISO 8601 date.'))
      }

      const limit = Math.min(limitRaw, 200)

      let decoded = null
      if (cursor) {
        decoded = decodeCursor(cursor)
        if (!decoded) {
          return reply.status(400).send(buildError('INVALID_PARAM', 'Invalid cursor value.'))
        }
      }

      const conditions = []
      if (type) conditions.push(eq(invoices.type, type))
      if (currency) conditions.push(eq(invoices.currency, currency))
      if (issuer_nit) conditions.push(eq(invoices.issuer_nit, issuer_nit))
      if (client_nit) conditions.push(eq(invoices.client_nit, client_nit))
      if (issued_from) conditions.push(gte(invoices.issued_at, new Date(issued_from)))
      if (issued_to) conditions.push(lte(invoices.issued_at, new Date(issued_to)))
      if (decoded) {
        conditions.push(
          sql`(${invoices.issued_at}, ${invoices.invoice_id}) < (${new Date(decoded.cursor_at)}::timestamptz, ${decoded.id})`,
        )
      }

      const rows = await fastify.db
        .select(invoiceListColumns)
        .from(invoices)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(invoices.issued_at), desc(invoices.invoice_id))
        .limit(limit + 1)

      let data = rows
      let next_cursor: string | null = null

      if (data.length > limit) {
        data = data.slice(0, limit)
        const last = data[data.length - 1]!
        next_cursor = encodeCursor(last.issued_at, last.invoice_id)
      }

      return reply.send({ data, next_cursor })
    },
  )

  // ── GET /v1/invoices/:invoice_id ──────────────────────────────────────────────
  fastify.get<{ Params: { invoice_id: string } }>(
    '/:invoice_id',
    async (request: FastifyRequest<{ Params: { invoice_id: string } }>, reply: FastifyReply) => {
      const { invoice_id } = request.params

      const [invoice] = await fastify.db
        .select()
        .from(invoices)
        .where(eq(invoices.invoice_id, invoice_id))
        .limit(1)

      if (!invoice) {
        return reply.status(404).send(buildError('NOT_FOUND', 'Invoice not found.'))
      }

      return reply.send(invoice)
    },
  )
}

export default invoicesRoute
