"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartEmpty } from "@/components/charts/chart-empty"
import type { TopProductByRevenueItem } from "@/lib/api/analytics"

type Props = { data: TopProductByRevenueItem[] }

export function TopProductsRevenue({ data }: Props) {
  const chartData = data
    .map((item) => ({
      name: item.product_name,
      value: parseFloat(item.total_revenue),
    }))
    .filter((item) => !isNaN(item.value))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products by Revenue</CardTitle>
        <CardDescription>Total revenue per product in this batch</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <ChartEmpty message="No product revenue data available for this batch." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v) => `Q${Number(v).toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                }}
                cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [
                  `Q${typeof value === "number" ? value.toLocaleString() : String(value)}`,
                  "Revenue",
                ]}
              />
              <Bar
                dataKey="value"
                fill="var(--color-chart-2)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
