import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const meta = {
  title: 'Tables/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const invoices = [
  { id: 'INV-001', issuer: 'Acme Corp', date: '2024-01-15', amount: 'Q 1,250.00' },
  { id: 'INV-002', issuer: 'Globex Inc', date: '2024-01-18', amount: 'Q 3,400.00' },
  { id: 'INV-003', issuer: 'Initech', date: '2024-01-20', amount: 'Q 870.50' },
  { id: 'INV-004', issuer: 'Umbrella Ltd', date: '2024-01-22', amount: 'Q 5,100.00' },
];

// TableHeader + TableBody + TableRow + TableHead + TableCell
export const Basic: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Factura</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell>{inv.id}</TableCell>
            <TableCell>{inv.issuer}</TableCell>
            <TableCell>{inv.date}</TableCell>
            <TableCell className="text-right font-mono">{inv.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

// TableFooter
export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Factura</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell>{inv.id}</TableCell>
            <TableCell>{inv.issuer}</TableCell>
            <TableCell>{inv.date}</TableCell>
            <TableCell className="text-right font-mono">{inv.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right font-mono">Q 10,620.50</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

// TableCaption
export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>Facturas emitidas en enero 2024.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Factura</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell>{inv.id}</TableCell>
            <TableCell>{inv.issuer}</TableCell>
            <TableCell>{inv.date}</TableCell>
            <TableCell className="text-right font-mono">{inv.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

// All subcomponents together
export const Full: Story = {
  render: () => (
    <Table>
      <TableCaption>Facturas emitidas en enero 2024.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Factura</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell>{inv.id}</TableCell>
            <TableCell>{inv.issuer}</TableCell>
            <TableCell>{inv.date}</TableCell>
            <TableCell className="text-right font-mono">{inv.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right font-mono">Q 10,620.50</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Factura</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
            No hay facturas en el rango seleccionado.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
