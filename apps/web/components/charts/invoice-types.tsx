"use client"

import { ChartEmpty } from "./chart-empty"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { invoiceTypeData } from "@/lib/mock-data"

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
]

export function InvoiceTypes() {
  if (invoiceTypeData.length === 0) {
    return <ChartEmpty message="Aún no hay datos de tipos de factura." />
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={invoiceTypeData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {invoiceTypeData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`${value}%`, "Participación"]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
