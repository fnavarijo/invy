import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { invoices } from '@invy/db';
import { getAuth } from '@clerk/fastify';
import { buildError } from '../../../lib/http.ts';

interface AnalyticsQuery {
  issued_from?: string;
  issued_to?: string;
  issuer_nit?: string;
  client_nit?: string;
  limit?: string;
}

type DateRangeResult =
  | { ok: true; from: Date; to: Date }
  | { ok: false; status: number; body: ReturnType<typeof buildError> };

function parseDateRange(
  issuedFrom: string | undefined,
  issuedTo: string | undefined,
): DateRangeResult {
  if (!issuedFrom || !issuedTo) {
    return { ok: false, status: 400, body: buildError('INVALID_PARAM', '"issued_from" and "issued_to" are required.') };
  }

  const from = new Date(issuedFrom);
  const to = new Date(issuedTo);

  if (isNaN(from.getTime())) {
    return { ok: false, status: 400, body: buildError('INVALID_PARAM', '"issued_from" must be a valid ISO 8601 date.') };
  }
  if (isNaN(to.getTime())) {
    return { ok: false, status: 400, body: buildError('INVALID_PARAM', '"issued_to" must be a valid ISO 8601 date.') };
  }
  if (to < from) {
    return { ok: false, status: 400, body: buildError('INVALID_PARAM', '"issued_to" must not be before "issued_from".') };
  }

  return { ok: true, from, to };
}

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /v1/analytics/summary ─────────────────────────────────────────────
  fastify.get<{ Querystring: AnalyticsQuery }>(
    '/summary',
    async (
      request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const rangeResult = parseDateRange(request.query.issued_from, request.query.issued_to);
      if (!rangeResult.ok) return reply.status(rangeResult.status).send(rangeResult.body);
      const range = rangeResult;

      const conditions = [
        eq(invoices.user_id, userId!),
        gte(invoices.issued_at, range.from),
        lte(invoices.issued_at, range.to),
      ];
      if (request.query.issuer_nit) conditions.push(eq(invoices.issuer_nit, request.query.issuer_nit));
      if (request.query.client_nit) conditions.push(eq(invoices.client_nit, request.query.client_nit));

      const [row] = await fastify.db
        .select({
          invoice_count: sql<number>`COUNT(*)::int`,
          total_amount: sql<string>`COALESCE(SUM(${invoices.total_amount}), 0)::text`,
          unique_issuers: sql<number>`COUNT(DISTINCT ${invoices.issuer_nit})::int`,
          unique_clients: sql<number>`COUNT(DISTINCT ${invoices.client_nit})::int`,
        })
        .from(invoices)
        .where(and(...conditions));

      return reply.send({
        issued_from: request.query.issued_from,
        issued_to: request.query.issued_to,
        invoice_count: row?.invoice_count ?? 0,
        total_amount: Number(row?.total_amount ?? '0').toFixed(2),
        unique_issuers: row?.unique_issuers ?? 0,
        unique_clients: row?.unique_clients ?? 0,
      });
    },
  );

  // ── GET /v1/analytics/top-products-by-quantity ────────────────────────────
  fastify.get<{ Querystring: AnalyticsQuery }>(
    '/top-products-by-quantity',
    async (
      request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const rangeResult = parseDateRange(request.query.issued_from, request.query.issued_to);
      if (!rangeResult.ok) return reply.status(rangeResult.status).send(rangeResult.body);
      const range = rangeResult;

      const limit = Math.min(parseInt(request.query.limit ?? '10', 10) || 10, 50);
      const issuerFilter = request.query.issuer_nit
        ? sql`AND invoices.issuer_nit = ${request.query.issuer_nit}`
        : sql``;
      const clientFilter = request.query.client_nit
        ? sql`AND invoices.client_nit = ${request.query.client_nit}`
        : sql``;

      const rows = await fastify.db.execute<{
        product_name: string;
        total_quantity: string;
      }>(sql`
        SELECT
          elem->>'name'                     AS product_name,
          SUM((elem->>'quantity')::numeric) AS total_quantity
        FROM invoices
        CROSS JOIN jsonb_array_elements(line_items) AS elem
        WHERE invoices.user_id = ${userId!}
          AND invoices.issued_at >= ${range.from.toISOString()}::timestamptz
          AND invoices.issued_at <= ${range.to.toISOString()}::timestamptz
          ${issuerFilter}
          ${clientFilter}
        GROUP BY product_name
        ORDER BY total_quantity DESC
        LIMIT ${limit}
      `);

      return reply.send({
        issued_from: request.query.issued_from,
        issued_to: request.query.issued_to,
        data: rows.map((r) => ({
          product_name: r.product_name,
          total_quantity: Number(r.total_quantity).toFixed(2),
        })),
      });
    },
  );

  // ── GET /v1/analytics/top-products-by-revenue ─────────────────────────────
  fastify.get<{ Querystring: AnalyticsQuery }>(
    '/top-products-by-revenue',
    async (
      request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const rangeResult = parseDateRange(request.query.issued_from, request.query.issued_to);
      if (!rangeResult.ok) return reply.status(rangeResult.status).send(rangeResult.body);
      const range = rangeResult;

      const limit = Math.min(parseInt(request.query.limit ?? '10', 10) || 10, 50);
      const issuerFilter = request.query.issuer_nit
        ? sql`AND invoices.issuer_nit = ${request.query.issuer_nit}`
        : sql``;
      const clientFilter = request.query.client_nit
        ? sql`AND invoices.client_nit = ${request.query.client_nit}`
        : sql``;

      const rows = await fastify.db.execute<{
        product_name: string;
        total_revenue: string;
      }>(sql`
        SELECT
          elem->>'name'                  AS product_name,
          SUM((elem->>'total')::numeric) AS total_revenue
        FROM invoices
        CROSS JOIN jsonb_array_elements(line_items) AS elem
        WHERE invoices.user_id = ${userId!}
          AND invoices.issued_at >= ${range.from.toISOString()}::timestamptz
          AND invoices.issued_at <= ${range.to.toISOString()}::timestamptz
          ${issuerFilter}
          ${clientFilter}
        GROUP BY product_name
        ORDER BY total_revenue DESC
        LIMIT ${limit}
      `);

      return reply.send({
        issued_from: request.query.issued_from,
        issued_to: request.query.issued_to,
        data: rows.map((r) => ({
          product_name: r.product_name,
          total_revenue: Number(r.total_revenue).toFixed(2),
        })),
      });
    },
  );

  // ── GET /v1/analytics/top-buyers ──────────────────────────────────────────
  fastify.get<{ Querystring: AnalyticsQuery }>(
    '/top-buyers',
    async (
      request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const rangeResult = parseDateRange(request.query.issued_from, request.query.issued_to);
      if (!rangeResult.ok) return reply.status(rangeResult.status).send(rangeResult.body);
      const range = rangeResult;

      const limit = Math.min(parseInt(request.query.limit ?? '10', 10) || 10, 50);

      const conditions = [
        eq(invoices.user_id, userId!),
        gte(invoices.issued_at, range.from),
        lte(invoices.issued_at, range.to),
      ];
      if (request.query.issuer_nit) conditions.push(eq(invoices.issuer_nit, request.query.issuer_nit));
      if (request.query.client_nit) conditions.push(eq(invoices.client_nit, request.query.client_nit));

      const rows = await fastify.db
        .select({
          client_name: invoices.client_name,
          client_nit: invoices.client_nit,
          total_spent: sql<string>`SUM(${invoices.total_amount})::text`,
          invoice_count: sql<number>`COUNT(*)::int`,
        })
        .from(invoices)
        .where(and(...conditions))
        .groupBy(invoices.client_name, invoices.client_nit)
        .orderBy(sql`SUM(${invoices.total_amount}) DESC`)
        .limit(limit);

      return reply.send({
        issued_from: request.query.issued_from,
        issued_to: request.query.issued_to,
        data: rows.map((r) => ({
          client_name: r.client_name,
          client_nit: r.client_nit,
          total_spent: Number(r.total_spent).toFixed(2),
          invoice_count: r.invoice_count,
        })),
      });
    },
  );

  // ── GET /v1/analytics/top-issuers ────────────────────────────────────────
  fastify.get<{ Querystring: AnalyticsQuery }>(
    '/top-issuers',
    async (
      request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
      reply: FastifyReply,
    ) => {
      const { userId } = getAuth(request);
      const rangeResult = parseDateRange(request.query.issued_from, request.query.issued_to);
      if (!rangeResult.ok) return reply.status(rangeResult.status).send(rangeResult.body);
      const range = rangeResult;

      const limit = Math.min(parseInt(request.query.limit ?? '10', 10) || 10, 50);

      const conditions = [
        eq(invoices.user_id, userId!),
        gte(invoices.issued_at, range.from),
        lte(invoices.issued_at, range.to),
      ];
      if (request.query.issuer_nit) conditions.push(eq(invoices.issuer_nit, request.query.issuer_nit));
      if (request.query.client_nit) conditions.push(eq(invoices.client_nit, request.query.client_nit));

      const rows = await fastify.db
        .select({
          issuer_name: invoices.issuer_name,
          issuer_nit: invoices.issuer_nit,
          total_received: sql<string>`SUM(${invoices.total_amount})::text`,
          invoice_count: sql<number>`COUNT(*)::int`,
        })
        .from(invoices)
        .where(and(...conditions))
        .groupBy(invoices.issuer_name, invoices.issuer_nit)
        .orderBy(sql`SUM(${invoices.total_amount}) DESC`)
        .limit(limit);

      return reply.send({
        issued_from: request.query.issued_from,
        issued_to: request.query.issued_to,
        data: rows.map((r) => ({
          issuer_name: r.issuer_name,
          issuer_nit: r.issuer_nit,
          total_received: Number(r.total_received).toFixed(2),
          invoice_count: r.invoice_count,
        })),
      });
    },
  );
};

export default analyticsRoutes;
