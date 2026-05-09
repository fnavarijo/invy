'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
} from '@tanstack/react-table';
import { Columns3 } from 'lucide-react';

import { GlobalInvoiceListItem } from '@/lib/api/invoices';
import { columns } from '@/components/dashboard/tables/invoice-table/columns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface InvoiceDataTableProps {
  data: GlobalInvoiceListItem[];
}

function getColumnLabel(column: Column<GlobalInvoiceListItem>): string {
  const header = column.columnDef.header;
  if (typeof header === 'string') return header;
  return column.id;
}

export function InvoiceDataTable({ data }: InvoiceDataTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hiddenCount = table
    .getAllColumns()
    .filter((col) => col.getCanHide() && !col.getIsVisible()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-7">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {hiddenCount > 0 && (
            <>
              <span>
                {hiddenCount} columna{hiddenCount !== 1 ? 's' : ''} oculta
                {hiddenCount !== 1 ? 's' : ''}
              </span>
              <span aria-hidden>·</span>
              <button
                onClick={() => table.resetColumnVisibility()}
                className="text-primary underline-offset-2 hover:underline"
              >
                Restablecer
              </button>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Columns3 className="h-3.5 w-3.5" />
              Columnas
              {hiddenCount > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center leading-none">
                  {hiddenCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Columnas visibles
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {getColumnLabel(column)}
                </DropdownMenuCheckboxItem>
              ))}
            {hiddenCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => table.resetColumnVisibility()}
                  className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground text-left transition-colors"
                >
                  Restablecer columnas
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
