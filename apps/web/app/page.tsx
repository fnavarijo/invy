import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UploadZone } from "@/components/upload/upload-zone"
import {
  BatchesByStatus,
  InvoiceVolume,
  InvoiceTypes,
  ProcessingRate,
} from "@/components/charts/chart-grid"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="text-base font-semibold tracking-tight text-foreground">Invy</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">Invoice Processing</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Upload section */}
        <section aria-labelledby="upload-heading">
          <div className="mb-4">
            <h1 id="upload-heading" className="text-xl font-semibold text-foreground">
              Upload invoices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a SAT XML file or a ZIP archive containing multiple invoices.
            </p>
          </div>
          <UploadZone />
        </section>

        <Separator />

        {/* Analytics section */}
        <section aria-labelledby="analytics-heading">
          <div className="mb-6">
            <h2 id="analytics-heading" className="text-xl font-semibold text-foreground">
              Analytics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview of processing activity and invoice data.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Chart 1: Batches by status */}
            <Card>
              <CardHeader>
                <CardTitle>Batches by status</CardTitle>
                <CardDescription>Current distribution across all batches</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchesByStatus />
              </CardContent>
            </Card>

            {/* Chart 2: Invoice volume over time */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice volume</CardTitle>
                <CardDescription>Invoices processed over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceVolume />
              </CardContent>
            </Card>

            {/* Chart 3: Invoice types breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice types</CardTitle>
                <CardDescription>Bien, Servicio, and Mixto breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceTypes />
              </CardContent>
            </Card>

            {/* Chart 4: Daily processing rate */}
            <Card>
              <CardHeader>
                <CardTitle>Daily processing rate</CardTitle>
                <CardDescription>Succeeded vs failed jobs over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessingRate />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
