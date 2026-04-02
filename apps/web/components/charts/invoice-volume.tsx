"use client"

import { ChartEmpty } from "./chart-empty"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { invoiceVolumeData } from "@/lib/mock-data"

export function InvoiceVolume() {
  const total = invoiceVolumeData.reduce((s, d) => s + d.invoices, 0)
  if (invoiceVolumeData.length === 0 || total === 0) {
    return <ChartEmpty message="Aún no hay datos de facturas." />
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={invoiceVolumeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border)" }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [Number(value).toLocaleString(), "Facturas"]}
        />
        <Line
          type="monotone"
          dataKey="invoices"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-chart-1)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
