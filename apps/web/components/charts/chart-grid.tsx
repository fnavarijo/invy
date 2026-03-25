"use client"

import dynamic from "next/dynamic"

// recharts accesses window/ResizeObserver at module load — must be client-only.
// next/dynamic with ssr: false must be called from a Client Component.
const BatchesByStatus = dynamic(
  () => import("./batches-by-status").then((m) => m.BatchesByStatus),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const InvoiceVolume = dynamic(
  () => import("./invoice-volume").then((m) => m.InvoiceVolume),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const InvoiceTypes = dynamic(
  () => import("./invoice-types").then((m) => m.InvoiceTypes),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const ProcessingRate = dynamic(
  () => import("./processing-rate").then((m) => m.ProcessingRate),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

function ChartSkeleton() {
  return <div className="h-55 animate-pulse rounded-md bg-muted" />
}

export { BatchesByStatus, InvoiceVolume, InvoiceTypes, ProcessingRate }
