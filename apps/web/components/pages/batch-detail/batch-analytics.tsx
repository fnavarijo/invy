import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';

import { TopProductsQuantity } from '@/components/charts/top-products-quantity';
import { TopProductsRevenue } from '@/components/charts/top-products-revenue';
import { TopBuyers } from '@/components/charts/top-buyers';
import { TopIssuers } from '@/components/charts/top-issuers';
import {
  getTopProductsByQuantity,
  getTopProductsByRevenue,
  getTopBuyers,
  getTopIssuers,
} from '@/lib/api/analytics';
import { Text } from '@/components/ui/text';

function ChartSkeleton() {
  return <div className="h-85 animate-pulse rounded-xl bg-muted" />;
}

interface BatchAnalyticsProps {
  paramsPromise: Promise<{ id: string }>;
}

export async function BatchAnalytics({ paramsPromise }: BatchAnalyticsProps) {
  const { id: batchId } = await paramsPromise;
  const { getToken } = await auth();
  const authToken = await getToken();

  const [analyticsQuantity, analyticsRevenue, analyticsBuyers, analyticsIssuers] =
    await Promise.all([
      getTopProductsByQuantity(batchId, undefined, { authToken }),
      getTopProductsByRevenue(batchId, undefined, { authToken }),
      getTopBuyers(batchId, undefined, { authToken }),
      getTopIssuers(batchId, undefined, { authToken }),
    ]);

  return (
    <section aria-labelledby="analytics-heading">
      <div className="mb-6">
        <Text size="h2" id="analytics-heading">
          Análisis
        </Text>
        <Text size="body" className="text-muted-foreground">
          Productos y compradores principales de este lote.
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <TopProductsQuantity data={analyticsQuantity.data} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopProductsRevenue data={analyticsRevenue.data} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopBuyers data={analyticsBuyers.data} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopIssuers data={analyticsIssuers.data} />
        </Suspense>
      </div>
    </section>
  );
}
