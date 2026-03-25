export type BatchStatusPoint = {
  status: "queued" | "processing" | "done" | "failed"
  count: number
}

export type VolumePoint = {
  month: string
  invoices: number
}

export type InvoiceTypePoint = {
  name: string
  value: number
}

export type ProcessingRatePoint = {
  day: string
  succeeded: number
  failed: number
}

export const batchStatusData: BatchStatusPoint[] = [
  { status: "done", count: 142 },
  { status: "processing", count: 18 },
  { status: "queued", count: 34 },
  { status: "failed", count: 9 },
]

export const invoiceVolumeData: VolumePoint[] = [
  { month: "Apr", invoices: 820 },
  { month: "May", invoices: 1140 },
  { month: "Jun", invoices: 980 },
  { month: "Jul", invoices: 1350 },
  { month: "Aug", invoices: 1220 },
  { month: "Sep", invoices: 1600 },
  { month: "Oct", invoices: 1480 },
  { month: "Nov", invoices: 1900 },
  { month: "Dec", invoices: 2100 },
  { month: "Jan", invoices: 1750 },
  { month: "Feb", invoices: 2300 },
  { month: "Mar", invoices: 2050 },
]

export const invoiceTypeData: InvoiceTypePoint[] = [
  { name: "Bien", value: 58 },
  { name: "Servicio", value: 32 },
  { name: "Mixto", value: 10 },
]

export const processingRateData: ProcessingRatePoint[] = [
  { day: "Mon", succeeded: 312, failed: 8 },
  { day: "Tue", succeeded: 428, failed: 12 },
  { day: "Wed", succeeded: 390, failed: 6 },
  { day: "Thu", succeeded: 510, failed: 15 },
  { day: "Fri", succeeded: 465, failed: 9 },
  { day: "Sat", succeeded: 180, failed: 4 },
  { day: "Sun", succeeded: 95, failed: 2 },
]
