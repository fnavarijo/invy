import { Suspense } from 'react';
import { Text } from '@/components/ui/text';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import { IssuerFilterLoader } from '@/components/dashboard/issuer-filter-loader';
import { ClientFilterLoader } from '@/components/dashboard/client-filter-loader';
import { NitPrincipalFilterLoader } from '@/components/dashboard/nit-principal-filter-loader';
import { InvoiceDirectionFilter } from '@/components/dashboard/invoice-direction-filter';
import { UploadDialog } from '@/components/dashboard/upload-dialog';
import { KpiStrip, KpiStripSkeleton } from '@/components/dashboard/kpi-strip';
import {
  GlobalAnalytics,
  GlobalAnalyticsSkeleton,
} from '@/components/dashboard/global-analytics';
import {
  InvoiceTable,
  InvoiceTableSkeleton,
} from '@/components/dashboard/tables/invoice-table/invoice-table';
import {
  INVOICE_LIMIT_OPTIONS,
  type InvoiceLimitOption,
} from '@/components/dashboard/invoice-limit-options';
import { parseDateRangeParams } from '@/lib/date-range';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const range = parseDateRangeParams(
    params['issued_from'],
    params['issued_to'],
  );

  const rawLimit = Array.isArray(params['limit'])
    ? params['limit'][0]
    : params['limit'];
  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 25;
  const limit = (
    INVOICE_LIMIT_OPTIONS.includes(parsedLimit as InvoiceLimitOption)
      ? parsedLimit
      : 25
  ) as InvoiceLimitOption;

  const rawIssuerNit = params['issuer_nit'];
  const issuerNit = Array.isArray(rawIssuerNit) ? rawIssuerNit[0] : rawIssuerNit;

  const rawClientNit = params['client_nit'];
  const clientNit = Array.isArray(rawClientNit) ? rawClientNit[0] : rawClientNit;

  const rawNitPrincipal = params['nit_principal'];
  const nitPrincipal = Array.isArray(rawNitPrincipal) ? rawNitPrincipal[0] : rawNitPrincipal;

  const rawDirection = params['direction'];
  const direction = Array.isArray(rawDirection) ? rawDirection[0] : rawDirection;

  const effectiveIssuerNit = direction === 'ventas' ? nitPrincipal : issuerNit;
  const effectiveClientNit = direction === 'compras' ? nitPrincipal : clientNit;

  const effectiveSearchParams = {
    ...params,
    ...(effectiveIssuerNit ? { issuer_nit: effectiveIssuerNit } : {}),
    ...(effectiveClientNit ? { client_nit: effectiveClientNit } : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* ── Page toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text size="h1">Mis Facturas</Text>
            <Text size="body" className="mt-1 text-muted-foreground">
              Resumen del periodo seleccionado.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Suspense
              fallback={
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              }
            >
              <IssuerFilterLoader range={range} />
            </Suspense>
            <Suspense
              fallback={
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              }
            >
              <ClientFilterLoader range={range} />
            </Suspense>
            <Suspense
              fallback={
                <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
              }
            >
              <DateRangeFilter />
            </Suspense>
            <UploadDialog />
          </div>
        </div>

        {/* ── NIT principal context bar ──────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
          <span className="shrink-0 text-sm text-muted-foreground">NIT principal</span>
          <Suspense
            fallback={<div className="h-8 w-44 animate-pulse rounded-md bg-muted" />}
          >
            <NitPrincipalFilterLoader range={range} />
          </Suspense>
          {nitPrincipal && <InvoiceDirectionFilter />}
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <Suspense fallback={<KpiStripSkeleton />}>
          <KpiStrip range={range} issuerNit={effectiveIssuerNit} clientNit={effectiveClientNit} />
        </Suspense>

        {/* ── Analytics dashboard ────────────────────────────────────── */}
        <Suspense fallback={<GlobalAnalyticsSkeleton />}>
          <GlobalAnalytics
            range={range}
            issuerNit={effectiveIssuerNit}
            clientNit={effectiveClientNit}
          />
        </Suspense>

        {/* ── Invoice table ──────────────────────────────────────────── */}
        <Suspense fallback={<InvoiceTableSkeleton />}>
          <InvoiceTable range={range} limit={limit} searchParams={effectiveSearchParams} />
        </Suspense>
      </main>
    </div>
  );
}
