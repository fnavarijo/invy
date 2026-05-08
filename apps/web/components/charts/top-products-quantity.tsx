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
import type { TopProductByQuantityItem } from '@/lib/api/analytics';

const PREVIEW_LIMIT = 10;
const TITLE = 'Productos con mayor cantidad';

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTooltip(value: any) {
  return [
    typeof value === 'number' ? value.toLocaleString() : String(value),
    'Unidades',
  ];
}

function QuantityBarChart({
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
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
          formatter={formatTooltip}
        />
        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type Props = { data: TopProductByQuantityItem[]; description?: string };

export function TopProductsQuantity({ data, description }: Props) {
  const allData = data
    .map((item) => ({ name: item.product_name, value: parseFloat(item.total_quantity) }))
    .filter((item) => !isNaN(item.value));

  const previewData = allData.slice(0, PREVIEW_LIMIT);
  const hasMore = allData.length > PREVIEW_LIMIT;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLE}</CardTitle>
        <CardDescription>{description ?? 'Unidades vendidas por producto en este lote'}</CardDescription>
        {hasMore && (
          <CardAction>
            <ChartDetailDialog
              title={TITLE}
              description={description}
              count={allData.length}
            >
              <QuantityBarChart
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
          <ChartEmpty message="No hay datos de cantidad por producto para este lote." />
        ) : (
          <QuantityBarChart data={previewData} height={280} maxChars={24} />
        )}
      </CardContent>
    </Card>
  );
}
