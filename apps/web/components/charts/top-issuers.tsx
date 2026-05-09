'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartEmpty } from '@/components/charts/chart-empty';
import { ChartDetailDialog } from '@/components/charts/chart-detail-dialog';
import { YAxisTick } from '@/components/charts/y-axis-tick';
import type { TopIssuerItem } from '@/lib/api/analytics';

const PREVIEW_LIMIT = 10;
const TITLE = 'Principales proveedores';

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTooltip(value: any) {
  return [
    `Q${typeof value === 'number' ? value.toLocaleString() : String(value)}`,
    'Total facturado',
  ];
}

function IssuersBarChart({
  data,
  height,
  maxChars,
}: {
  data: { name: string; value: number }[];
  height: number;
  maxChars: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={<YAxisTick maxChars={maxChars} />}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          tickFormatter={(v) => `Q${Number(v).toLocaleString()}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
          formatter={formatTooltip}
        />
        <Bar dataKey="value" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type Props = { data: TopIssuerItem[]; description?: string };

export function TopIssuers({ data, description }: Props) {
  const allData = data
    .map((item) => ({ name: item.issuer_name, value: parseFloat(item.total_received) }))
    .filter((item) => !isNaN(item.value));

  const previewData = allData.slice(0, PREVIEW_LIMIT);
  const hasMore = allData.length > PREVIEW_LIMIT;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLE}</CardTitle>
        <CardDescription>{description ?? 'Proveedores con mayor facturación en este lote'}</CardDescription>
        {hasMore && (
          <CardAction>
            <ChartDetailDialog
              title={TITLE}
              description={description}
              count={allData.length}
            >
              <IssuersBarChart
                data={allData}
                height={Math.max(360, allData.length * 32)}
                maxChars={36}
              />
            </ChartDetailDialog>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {previewData.length === 0 ? (
          <ChartEmpty message="No hay datos de proveedores para este lote." />
        ) : (
          <IssuersBarChart data={previewData} height={280} maxChars={24} />
        )}
      </CardContent>
    </Card>
  );
}
