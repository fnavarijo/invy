import { auth } from '@clerk/nextjs/server';
import { FileText, TrendingUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGlobalSummary } from '@/lib/api/global-analytics';
import type { DateRange } from '@/lib/date-range';

interface KpiStripProps {
  range: DateRange;
  issuerNit?: string;
  clientNit?: string;
}

export async function KpiStrip({ range, issuerNit, clientNit }: KpiStripProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const summary = await getGlobalSummary(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo, issuerNit, clientNit },
    { authToken },
  );

  const kpis = [
    {
      label: 'Facturas en el periodo',
      value: summary.invoice_count.toLocaleString('es-GT'),
      sub: 'documentos procesados',
      icon: FileText,
    },
    {
      label: 'Monto total',
      value: `Q${Number(summary.total_amount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
      sub: 'suma de facturas',
      icon: TrendingUp,
    },
    {
      label: 'Clientes únicos',
      value: summary.unique_clients.toLocaleString('es-GT'),
      sub: 'clientes distintos',
      icon: Building2,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon className="size-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function KpiStripSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
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
