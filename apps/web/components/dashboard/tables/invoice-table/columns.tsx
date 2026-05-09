import { ColumnDef } from '@tanstack/react-table';

import { GlobalInvoiceListItem } from '@/lib/api/invoices';
import { formatDate } from '@/lib/date-range';
import { Badge } from '@/components/ui/badge';

const TYPE_LABELS: Record<string, string> = {
  FACT: 'Factura',
  NCRE: 'N. Crédito',
  NDEB: 'N. Débito',
  RECI: 'Recibo',
  NABN: 'Abono',
};

export const columns: ColumnDef<GlobalInvoiceListItem>[] = [
  {
    accessorKey: 'issued_at',
    header: 'Fecha',
    cell: ({ row }) => <span>{formatDate(row.getValue('issued_at'))}</span>,
  },
  {
    accessorKey: 'invoice_number',
    header: 'No. Factura',
    cell: ({ row }) => (
      <span
        className="block max-w-35 truncate font-mono"
        title={row.getValue('invoice_number')}
      >
        {row.getValue('invoice_number')}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant="secondary">
        {TYPE_LABELS[row.getValue('type') as string] ?? row.getValue('type')}
      </Badge>
    ),
  },
  {
    accessorKey: 'client_name',
    header: 'Cliente',
    cell: ({ row }) => (
      <span
        className="block max-w-50 truncate"
        title={row.getValue('client_name')}
      >
        {row.getValue('client_name')}
      </span>
    ),
  },
  {
    accessorKey: 'client_nit',
    header: 'NIT Cliente',
  },
  {
    accessorKey: 'issuer_name',
    header: 'Proveedor',
    cell: ({ row }) => (
      <span
        className="block max-w-50 truncate"
        title={row.getValue('issuer_name')}
      >
        {row.getValue('issuer_name')}
      </span>
    ),
  },
  {
    accessorKey: 'issuer_nit',
    header: 'NIT Proveedor',
  },
  {
    accessorKey: 'total_amount',
    header: 'Total',
    cell: ({ row }) => (
      <span>
        {new Intl.NumberFormat('es-GT', {
          style: 'currency',
          currency: 'GTQ',
        }).format(Number(row.getValue('total_amount')))}
      </span>
    ),
  },
];
