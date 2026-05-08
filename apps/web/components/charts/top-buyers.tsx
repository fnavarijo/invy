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
import type { TopBuyerItem } from '@/lib/api/analytics';

const PREVIEW_LIMIT = 10;
const TITLE = 'Principales compradores';

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
    'Total gastado',
  ];
}

function BuyersBarChart({
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
        <Bar dataKey="value" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type Props = { data: TopBuyerItem[]; description?: string };

export function TopBuyers({ data, description }: Props) {
  const allData = data
    .map((item) => ({ name: item.client_name, value: parseFloat(item.total_spent) }))
    .filter((item) => !isNaN(item.value));

  const previewData = allData.slice(0, PREVIEW_LIMIT);
  const hasMore = allData.length > PREVIEW_LIMIT;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLE}</CardTitle>
        <CardDescription>{description ?? 'Clientes con mayor gasto en este lote'}</CardDescription>
        {hasMore && (
          <CardAction>
            <ChartDetailDialog
              title={TITLE}
              description={description}
              count={allData.length}
            >
              <BuyersBarChart
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
          <ChartEmpty message="No hay datos de compradores para este lote." />
        ) : (
          <BuyersBarChart data={previewData} height={280} maxChars={24} />
        )}
      </CardContent>
    </Card>
  );
}
