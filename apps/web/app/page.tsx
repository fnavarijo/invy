import { Suspense } from 'react';
import { Text } from '@/components/ui/text';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import { UploadDialog } from '@/components/dashboard/upload-dialog';
import { KpiStrip, KpiStripSkeleton } from '@/components/dashboard/kpi-strip';
import {
  GlobalAnalytics,
  GlobalAnalyticsSkeleton,
} from '@/components/dashboard/global-analytics';
import {
  InvoiceTable,
  InvoiceTableSkeleton,
} from '@/components/dashboard/invoice-table';
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
  const limitOptions = [25, 50, 100] as const;
  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 25;
  const limit = (
    limitOptions.includes(parsedLimit as 25 | 50 | 100) ? parsedLimit : 25
  ) as 25 | 50 | 100;

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
          <div className="flex items-center gap-2">
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

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <Suspense fallback={<KpiStripSkeleton />}>
          <KpiStrip range={range} />
        </Suspense>

        {/* ── Analytics dashboard ────────────────────────────────────── */}
        <Suspense fallback={<GlobalAnalyticsSkeleton />}>
          <GlobalAnalytics range={range} />
        </Suspense>

        {/* ── Invoice table ──────────────────────────────────────────── */}
        <Suspense fallback={<InvoiceTableSkeleton />}>
          <InvoiceTable range={range} limit={limit} searchParams={params} />
        </Suspense>
      </main>
    </div>
  );
}
