import { auth } from '@clerk/nextjs/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { getInvoiceProducts } from '@/lib/api/invoices';
import type { DateRange } from '@/lib/date-range';

interface ProductsTableProps {
  range: DateRange;
  currency: string;
  issuerNit?: string;
  clientNit?: string;
}

function formatCurrency(value: string, currency: string): string {
  const prefix = currency === 'GTQ' ? 'Q' : currency + ' ';
  return `${prefix}${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

export async function ProductsTable({ range, currency, issuerNit, clientNit }: ProductsTableProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const data = await getInvoiceProducts(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo, currency, issuerNit, clientNit },
    { authToken },
  );

  const { products } = data;

  return (
    <section aria-labelledby="products-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text size="h2" id="products-heading">
            Productos
          </Text>
          <Text size="body" className="text-muted-foreground">
            Productos agregados del periodo, ordenados por total.
          </Text>
        </div>
      </div>

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay productos en el rango seleccionado.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={`${p.name}-${p.type}`} className="transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <span className="block max-w-60 truncate" title={p.name}>
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {p.type}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {Number(p.total_quantity).toLocaleString('es-GT')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(p.product_total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {products.length > 0 && (
          <CardHeader className="border-t border-border pt-3 pb-3">
            <p className="text-xs text-muted-foreground">
              {products.length} producto{products.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
        )}
      </Card>
    </section>
  );
}

export function ProductsTableSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Producto', 'Tipo', 'Cantidad', 'Total'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
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
