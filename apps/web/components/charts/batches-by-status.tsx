"use client"

import { ChartEmpty } from "./chart-empty"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { batchStatusData } from "@/lib/mock-data"

const STATUS_COLORS: Record<string, string> = {
  queued: "var(--color-status-queued-text)",
  processing: "var(--color-status-processing-text)",
  done: "var(--color-status-done-text)",
  failed: "var(--color-status-failed-text)",
}

export function BatchesByStatus() {
  const total = batchStatusData.reduce((s, d) => s + d.count, 0)
  if (batchStatusData.length === 0 || total === 0) {
    return <ChartEmpty message="Aún no hay lotes. Sube un archivo para ver datos aquí." />
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={batchStatusData} barSize={36} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="status"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [value, "Lotes"]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => String(label).charAt(0).toUpperCase() + String(label).slice(1)}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {batchStatusData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
