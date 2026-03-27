'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getBatch,
  type BatchDetailResponse,
  type BatchStatus,
  ApiError,
} from '@/lib/api/batches';
import { useBatchAnalytics } from '@/lib/hooks/use-batch-analytics';
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

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function getStatusStyle(status: BatchStatus): React.CSSProperties {
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
// Page
// ---------------------------------------------------------------------------

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [batch, setBatch] = useState<BatchDetailResponse | null>(null);
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setBatchLoading(true);
    setBatchError(null);

    getBatch(id, controller.signal)
      .then((data) => {
        setBatch(data);
        setBatchLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (err instanceof ApiError && err.status === 404) {
          setBatchError('not_found');
        } else {
          setBatchError(
            err instanceof Error ? err.message : 'Failed to load batch.',
          );
        }
        setBatchLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  const analytics = useBatchAnalytics(id);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (batchLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <span className="text-base font-semibold tracking-tight text-foreground">
              Invy
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Invoice Processing
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-10 w-72 animate-pulse rounded bg-muted" />
            <div className="h-[120px] w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 404 state
  // ------------------------------------------------------------------

  if (batchError === 'not_found') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <span className="text-base font-semibold tracking-tight text-foreground">
              Invy
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Invoice Processing
            </span>
          </div>
        </header>
        <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 sm:px-6">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">
            Batch not found
          </h1>
          <p className="text-sm text-muted-foreground">
            No batch with ID{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {id}
            </code>{' '}
            could be found.
          </p>
          <a
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to dashboard
          </a>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Generic error state
  // ------------------------------------------------------------------

  if (batchError !== null) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <span className="text-base font-semibold tracking-tight text-foreground">
              Invy
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Invoice Processing
            </span>
          </div>
        </header>
        <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 sm:px-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">{batchError}</p>
          <a
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to dashboard
          </a>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Loaded state — batch is guaranteed non-null here
  // ------------------------------------------------------------------

  const b = batch!;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — matches app/page.tsx exactly */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Invy
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">
            Invoice Processing
          </span>
        </div>
      </header>

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
              {b.file_name}
            </h1>
            <Badge variant="outline" style={getStatusStyle(b.status)}>
              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Batch ID</dt>
                  <dd className="mt-1 font-mono text-xs text-foreground break-all">
                    {b.batch_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Invoice count
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {b.invoice_count ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Failed count
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {b.failed_count ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created at</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {formatDate(b.created_at)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Info callout when analytics may not be available */}
          {b.status !== 'done' && (
            <div className="mt-4 rounded-lg bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Analytics are available once the batch has finished processing.
                Current status:{' '}
                <span className="font-medium text-foreground">{b.status}</span>.
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
