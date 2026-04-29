import { auth } from '@clerk/nextjs/server';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { listInvoices } from '@/lib/api/invoices';
import { formatDate } from '@/lib/date-range';
import type { DateRange } from '@/lib/date-range';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { InvoiceLimitSelector } from './invoice-limit-selector';
import { type InvoiceLimitOption } from './invoice-limit-options';

const TYPE_LABELS: Record<string, string> = {
  FACT: 'Factura',
  NCRE: 'N. Crédito',
  NDEB: 'N. Débito',
  RECI: 'Recibo',
  NABN: 'Abono',
};

interface InvoiceTableProps {
  range: DateRange;
  limit: InvoiceLimitOption;
  searchParams: Record<string, string | string[] | undefined>;
}

function buildExportUrl(range: DateRange) {
  const params = new URLSearchParams();
  if (range.issuedFrom) params.set('issued_from', range.issuedFrom);
  if (range.issuedTo) params.set('issued_to', range.issuedTo);
  return `/api/invoices/export/xlsx?${params.toString()}`;
}

export async function InvoiceTable({
  range,
  limit,
  searchParams,
}: InvoiceTableProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const rawIssuerNit = searchParams['issuer_nit'];
  const issuerNit = Array.isArray(rawIssuerNit)
    ? rawIssuerNit[0]
    : rawIssuerNit;

  const rawClientNit = searchParams['client_nit'];
  const clientNit = Array.isArray(rawClientNit)
    ? rawClientNit[0]
    : rawClientNit;

  const result = await listInvoices(
    {
      issuedFrom: range.issuedFrom,
      issuedTo: range.issuedTo,
      limit,
      issuerNit,
      clientNit,
    },
    { authToken },
  );

  const invoices = result.data;

  return (
    <section aria-labelledby="invoices-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text size="h2" id="invoices-heading">
            Facturas
          </Text>
          <Text size="body" className="text-muted-foreground">
            Las últimas {limit} facturas del periodo ordenadas por fecha.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href={buildExportUrl(range)} download>
              <Download />
              Exportar
            </a>
          </Button>
          <InvoiceLimitSelector current={limit} />
        </div>
      </div>

      {invoices.length > 0 && (
        <div>
          <div className="overflow-x-auto bg-card rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-sidebar">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    No. Factura
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    NIT Cliente
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-mono text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border ">
                {invoices.map((inv) => (
                  <TableRow
                    key={inv.invoice_id}
                    className="group transition-colors duration-150 hover:bg-primary/10 even:bg-muted/30"
                  >
                    <TableCell className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-muted-foreground transition-colors duration-150 group-hover:text-foreground/70">
                      {formatDate(inv.issued_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className="block max-w-35 truncate font-mono text-sm"
                        title={inv.invoice_number}
                      >
                        {inv.invoice_number}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary">
                        {TYPE_LABELS[inv.type] ?? inv.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className="block max-w-50 truncate"
                        title={inv.client_name}
                      >
                        {inv.client_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 font-mono text-sm text-muted-foreground md:table-cell">
                      {inv.client_nit}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium tabular-nums transition-colors duration-150 group-hover:text-primary">
                      {inv.currency === 'GTQ' ? 'Q' : inv.currency}{' '}
                      {Number(inv.total_amount).toLocaleString('es-GT', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="pt-3 pb-3">
            <p className="text-sm text-muted-foreground">
              Mostrando {invoices.length} factura
              {invoices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <Card className="overflow-hidden">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay facturas en el rango seleccionado.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export function InvoiceTableSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Fecha', 'No. Factura', 'Tipo', 'Emisor', 'Total'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
