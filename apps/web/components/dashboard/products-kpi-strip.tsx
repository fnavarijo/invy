import { auth } from '@clerk/nextjs/server';
import { FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInvoiceProducts } from '@/lib/api/invoices/get-invoice-products';
import type { DateRange } from '@/lib/date-range';

interface ProductsKpiStripProps {
  range: DateRange;
  currency: string;
  issuerNit?: string;
  clientNit?: string;
}

export async function ProductsKpiStrip({ range, currency, issuerNit, clientNit }: ProductsKpiStripProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const data = await getInvoiceProducts(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo, currency, issuerNit, clientNit },
    { authToken },
  );

  const prefix = currency === 'GTQ' ? 'Q' : currency + ' ';

  const kpis = [
    {
      label: 'Total facturado',
      value: `${prefix}${Number(data.invoicesTotal).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
      sub: 'suma de facturas',
      icon: TrendingUp,
    },
    {
      label: 'Tipos de producto',
      value: data.products.length.toLocaleString('es-GT'),
      sub: 'productos distintos',
      icon: FileText,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon className="size-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold tabular-nums">{kpi.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{kpi.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProductsKpiStripSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
