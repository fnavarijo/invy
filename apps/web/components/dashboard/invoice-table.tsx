import { auth } from '@clerk/nextjs/server';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { listInvoices } from '@/lib/api/invoices';
import { formatDate } from '@/lib/date-range';
import type { DateRange } from '@/lib/date-range';

const LIMIT_OPTIONS = [25, 50, 100] as const;
type LimitOption = (typeof LIMIT_OPTIONS)[number];

const TYPE_LABELS: Record<string, string> = {
  FACT: 'Factura',
  NCRE: 'N. Crédito',
  NDEB: 'N. Débito',
  RECI: 'Recibo',
  NABN: 'Abono',
};

interface InvoiceTableProps {
  range: DateRange;
  limit: LimitOption;
  searchParams: Record<string, string | string[] | undefined>;
}

function LimitSelector({
  current,
  searchParams,
}: {
  current: LimitOption;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  function buildUrl(limit: number) {
    const params = new URLSearchParams();
    const from = searchParams['issued_from'];
    const to = searchParams['issued_to'];
    if (from) params.set('issued_from', Array.isArray(from) ? from[0]! : from);
    if (to) params.set('issued_to', Array.isArray(to) ? to[0]! : to);
    params.set('limit', String(limit));
    return `/?${params.toString()}`;
  }

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-sm">
      {LIMIT_OPTIONS.map((n) => (
        <a
          key={n}
          href={buildUrl(n)}
          className={
            n === current
              ? 'bg-primary px-3 py-1 text-primary-foreground'
              : 'bg-background px-3 py-1 text-muted-foreground hover:bg-accent transition-colors'
          }
        >
          {n}
        </a>
      ))}
    </div>
  );
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
  const issuerNit = Array.isArray(rawIssuerNit) ? rawIssuerNit[0] : rawIssuerNit;

  const rawClientNit = searchParams['client_nit'];
  const clientNit = Array.isArray(rawClientNit) ? rawClientNit[0] : rawClientNit;

  const result = await listInvoices(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo, limit, issuerNit, clientNit },
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
          <a
            href={buildExportUrl(range)}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="size-3.5" />
            Exportar
          </a>
          <LimitSelector current={limit} searchParams={searchParams} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {invoices.length === 0 ? (
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay facturas en el rango seleccionado.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    No. Factura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                    NIT Cliente
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr
                    key={inv.invoice_id}
                    className="transition-colors hover:bg-accent/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="block max-w-35 truncate font-mono text-xs"
                        title={inv.invoice_number}
                      >
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABELS[inv.type] ?? inv.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="block max-w-50 truncate"
                        title={inv.client_name}
                      >
                        {inv.client_name}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                      {inv.client_nit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {inv.currency === 'GTQ' ? 'Q' : inv.currency}{' '}
                      {Number(inv.total_amount).toLocaleString('es-GT', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.length > 0 && (
          <CardHeader className="border-t border-border pt-3 pb-3">
            <p className="text-xs text-muted-foreground">
              Mostrando {invoices.length} factura
              {invoices.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
        )}
      </Card>
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
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
