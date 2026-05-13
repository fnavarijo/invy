import { ColumnDef } from '@tanstack/react-table';

import { GlobalInvoiceListItem } from '@/lib/api/invoices/list-invoices';
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
    accessorKey: 'issuedAt',
    header: 'Fecha',
    cell: ({ row }) => <span>{formatDate(row.getValue('issuedAt'))}</span>,
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'No. Factura',
    cell: ({ row }) => (
      <span
        className="block max-w-35 truncate font-mono"
        title={row.getValue('invoiceNumber')}
      >
        {row.getValue('invoiceNumber')}
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
    accessorKey: 'clientName',
    header: 'Cliente',
    cell: ({ row }) => (
      <span
        className="block max-w-50 truncate"
        title={row.getValue('clientName')}
      >
        {row.getValue('clientName')}
      </span>
    ),
  },
  {
    accessorKey: 'clientNit',
    header: 'NIT Cliente',
  },
  {
    accessorKey: 'issuerName',
    header: 'Proveedor',
    cell: ({ row }) => (
      <span
        className="block max-w-50 truncate"
        title={row.getValue('issuerName')}
      >
        {row.getValue('issuerName')}
      </span>
    ),
  },
  {
    accessorKey: 'issuerNit',
    header: 'NIT Proveedor',
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => (
      <span>
        {new Intl.NumberFormat('es-GT', {
          style: 'currency',
          currency: 'GTQ',
        }).format(Number(row.getValue('totalAmount')))}
      </span>
    ),
  },
];
