import { Suspense } from 'react';
import { Text } from '@/components/ui/text';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import { IssuerFilterLoader } from '@/components/dashboard/issuer-filter-loader';
import { ClientFilterLoader } from '@/components/dashboard/client-filter-loader';
import { CurrencyFilter } from '@/components/dashboard/currency-filter';
import { ProductsKpiStrip, ProductsKpiStripSkeleton } from '@/components/dashboard/products-kpi-strip';
import { ProductsTable, ProductsTableSkeleton } from '@/components/dashboard/products-table';
import { parseDateRangeParams } from '@/lib/date-range';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const range = parseDateRangeParams(params['issued_from'], params['issued_to']);

  const rawIssuerNit = params['issuer_nit'];
  const issuerNit = Array.isArray(rawIssuerNit) ? rawIssuerNit[0] : rawIssuerNit;

  const rawClientNit = params['client_nit'];
  const clientNit = Array.isArray(rawClientNit) ? rawClientNit[0] : rawClientNit;

  const rawCurrency = params['currency'];
  const currency = (Array.isArray(rawCurrency) ? rawCurrency[0] : rawCurrency) || 'GTQ';

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">

        {/* ── Page toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text size="h1">Productos</Text>
            <Text size="body" className="mt-1 text-muted-foreground">
              Detalle de productos por periodo y moneda.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={<div className="h-8 w-32 animate-pulse rounded-md bg-muted" />}>
              <IssuerFilterLoader range={range} />
            </Suspense>
            <Suspense fallback={<div className="h-8 w-32 animate-pulse rounded-md bg-muted" />}>
              <ClientFilterLoader range={range} />
            </Suspense>
            <CurrencyFilter />
            <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-md bg-muted" />}>
              <DateRangeFilter />
            </Suspense>
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <Suspense fallback={<ProductsKpiStripSkeleton />}>
          <ProductsKpiStrip range={range} currency={currency} issuerNit={issuerNit} clientNit={clientNit} />
        </Suspense>

        {/* ── Products table ─────────────────────────────────────────── */}
        <Suspense fallback={<ProductsTableSkeleton />}>
          <ProductsTable range={range} currency={currency} issuerNit={issuerNit} clientNit={clientNit} />
        </Suspense>

      </main>
    </div>
  );
}
