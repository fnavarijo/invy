import { auth } from '@clerk/nextjs/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getInvoiceProducts } from '@/lib/api/invoices/get-invoice-products';
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

export async function ProductsTable({
  range,
  currency,
  issuerNit,
  clientNit,
}: ProductsTableProps) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const data = await getInvoiceProducts(
    {
      issuedFrom: range.issuedFrom,
      issuedTo: range.issuedTo,
      currency,
      issuerNit,
      clientNit,
    },
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

      {products.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay productos en el rango seleccionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={`${p.name}-${p.type}`}>
                <TableCell>
                  <span className="block max-w-60 truncate" title={p.name}>
                    {p.name}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {p.type === 'S' ? 'Servicio' : 'Bien'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {Number(p.totalQuantity).toLocaleString('es-GT')}
                </TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">
                  {formatCurrency(p.productTotal, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {products.length} producto{products.length !== 1 ? 's' : ''}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
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
        <Table>
          <TableHeader>
            <TableRow>
              {['Producto', 'Tipo', 'Cantidad', 'Total'].map((h) => (
                <TableHead
                  key={h}
                  className="px-4 uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="px-4 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
