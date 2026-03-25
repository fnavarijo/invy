"use client"

import { ChartEmpty } from "./chart-empty"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { processingRateData } from "@/lib/mock-data"

export function ProcessingRate() {
  const total = processingRateData.reduce((s, d) => s + d.succeeded + d.failed, 0)
  if (processingRateData.length === 0 || total === 0) {
    return <ChartEmpty message="No processing data yet." />
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={processingRateData} barSize={22} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="day"
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
          cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}
        />
        <Bar dataKey="succeeded" name="Succeeded" stackId="a" fill="var(--color-chart-2)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="failed" name="Failed" stackId="a" fill="var(--color-status-failed-text)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
