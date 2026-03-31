import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';

import { TopProductsQuantity } from '@/components/charts/top-products-quantity';
import { TopProductsRevenue } from '@/components/charts/top-products-revenue';
import { TopBuyers } from '@/components/charts/top-buyers';
import {
  getTopProductsByQuantity,
  getTopProductsByRevenue,
  getTopBuyers,
  type TopProductByQuantityItem,
  type TopProductByRevenueItem,
  type TopBuyerItem,
} from '@/lib/api/analytics';

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

  const [analyticsQuantity, analyticsRevenue, analyticsBuyers] =
    await Promise.all([
      getTopProductsByQuantity(batchId, undefined, { authToken }),
      getTopProductsByRevenue(batchId, undefined, { authToken }),
      getTopBuyers(batchId, undefined, { authToken }),
    ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      <Suspense fallback={<ChartSkeleton />}>
        <TopProductsQuantity
          data={analyticsQuantity.data as TopProductByQuantityItem[]}
        />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <TopProductsRevenue
          data={analyticsRevenue.data as TopProductByRevenueItem[]}
        />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <TopBuyers data={analyticsBuyers.data as TopBuyerItem[]} />
      </Suspense>
    </div>
  );
}
