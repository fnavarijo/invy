import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { Text } from '@/components/ui/text';
import { TopProductsQuantity } from '@/components/charts/top-products-quantity';
import { TopProductsRevenue } from '@/components/charts/top-products-revenue';
import { TopBuyers } from '@/components/charts/top-buyers';
import { TopIssuers } from '@/components/charts/top-issuers';
import {
  getGlobalTopProductsByQuantity,
  getGlobalTopProductsByRevenue,
  getGlobalTopBuyers,
  getGlobalTopIssuers,
} from '@/lib/api/global-analytics';
import type { DateRange } from '@/lib/date-range';

function ChartSkeleton() {
  return <div className="h-80 animate-pulse rounded-xl bg-muted" />;
}

interface GlobalAnalyticsProps {
  range: DateRange;
  issuerNit?: string;
  clientNit?: string;
}

export async function GlobalAnalytics({ range, issuerNit, clientNit }: GlobalAnalyticsProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const params = { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo, issuerNit, clientNit, limit: 50 };

  const [analyticsQuantity, analyticsRevenue, analyticsBuyers, analyticsIssuers] = await Promise.all([
    getGlobalTopProductsByQuantity(params, { authToken }),
    getGlobalTopProductsByRevenue(params, { authToken }),
    getGlobalTopBuyers(params, { authToken }),
    getGlobalTopIssuers(params, { authToken }),
  ]);

  return (
    <section aria-labelledby="analytics-heading">
      <div className="mb-6">
        <Text size="h2" id="analytics-heading">
          Análisis del periodo
        </Text>
        <Text size="body" className="text-muted-foreground">
          Productos, compradores y proveedores principales en el rango seleccionado.
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <TopProductsQuantity
            data={analyticsQuantity.data}
            description="Unidades vendidas por producto en el periodo"
          />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopProductsRevenue
            data={analyticsRevenue.data}
            description="Ingresos por producto en el periodo"
          />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopBuyers
            data={analyticsBuyers.data}
            description="Clientes con mayor gasto en el periodo"
          />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TopIssuers
            data={analyticsIssuers.data}
            description="Proveedores con mayor facturación en el periodo"
          />
        </Suspense>
      </div>
    </section>
  );
}

export function GlobalAnalyticsSkeleton() {
  return (
    <section>
      <div className="mb-6">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </section>
  );
}
