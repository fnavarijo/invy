'use client';

import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useBatchAnalytics } from '@/lib/hooks/use-batch-analytics';
import type { BatchDetailResponse, BatchStatus } from '@/lib/api/batches';
import type { TopProductByQuantityItem } from '@/lib/api/analytics';
import type { TopProductByRevenueItem } from '@/lib/api/analytics';
import type { TopBuyerItem } from '@/lib/api/analytics';

// ---------------------------------------------------------------------------
// Dynamic imports — recharts requires browser APIs, must be client-only
// ---------------------------------------------------------------------------

const DynamicTopProductsQuantity = dynamic(
  () =>
    import('@/components/charts/top-products-quantity').then(
      (m) => m.TopProductsQuantity,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const DynamicTopProductsRevenue = dynamic(
  () =>
    import('@/components/charts/top-products-revenue').then(
      (m) => m.TopProductsRevenue,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const DynamicTopBuyers = dynamic(
  () => import('@/components/charts/top-buyers').then((m) => m.TopBuyers),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

// ---------------------------------------------------------------------------
// Local UI helpers
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return <div className="h-[340px] animate-pulse rounded-xl bg-muted" />;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex h-[340px] items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
    </div>
  );
}

function getStatusStyle(status: BatchStatus): CSSProperties {
  return {
    backgroundColor: `var(--color-status-${status}-bg)`,
    color: `var(--color-status-${status}-text)`,
    borderColor: `var(--color-status-${status}-bg)`,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BatchDetailPageProps {
  batch: BatchDetailResponse;
}

export function BatchDetailPage({ batch }: BatchDetailPageProps) {
  const analytics = useBatchAnalytics(batch.batch_id);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </a>

        {/* Batch metadata */}
        <section aria-labelledby="batch-heading">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1
              id="batch-heading"
              className="text-xl font-semibold text-foreground"
            >
              {batch.file_name}
            </h1>
            <Badge variant="outline" style={getStatusStyle(batch.status)}>
              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Batch ID</dt>
                  <dd className="mt-1 font-mono text-xs text-foreground break-all">
                    {batch.batch_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Invoice count
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {batch.invoice_count ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Failed count
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {batch.failed_count ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created at</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {formatDate(batch.created_at)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Info callout when analytics may not be available */}
          {batch.status !== 'done' && (
            <div className="mt-4 rounded-lg bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Analytics are available once the batch has finished processing.
                Current status:{' '}
                <span className="font-medium text-foreground">
                  {batch.status}
                </span>
                .
              </p>
            </div>
          )}
        </section>

        <Separator />

        {/* Analytics section */}
        <section aria-labelledby="analytics-heading">
          <div className="mb-6">
            <h2
              id="analytics-heading"
              className="text-xl font-semibold text-foreground"
            >
              Analytics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Top products and buyers for this batch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {/* Top Products by Quantity */}
            {analytics.quantity.error ? (
              <ErrorCard message={analytics.quantity.error} />
            ) : analytics.quantity.loading ? (
              <ChartSkeleton />
            ) : (
              <DynamicTopProductsQuantity
                data={analytics.quantity.data as TopProductByQuantityItem[]}
              />
            )}

            {/* Top Products by Revenue */}
            {analytics.revenue.error ? (
              <ErrorCard message={analytics.revenue.error} />
            ) : analytics.revenue.loading ? (
              <ChartSkeleton />
            ) : (
              <DynamicTopProductsRevenue
                data={analytics.revenue.data as TopProductByRevenueItem[]}
              />
            )}

            {/* Top Buyers */}
            {analytics.buyers.error ? (
              <ErrorCard message={analytics.buyers.error} />
            ) : analytics.buyers.loading ? (
              <ChartSkeleton />
            ) : (
              <DynamicTopBuyers
                data={analytics.buyers.data as TopBuyerItem[]}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
