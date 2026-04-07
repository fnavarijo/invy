import { auth } from '@clerk/nextjs/server';
import { listClients } from '@/lib/api/invoices';
import { ClientFilter } from '@/components/dashboard/issuer-filter';
import type { DateRange } from '@/lib/date-range';

export async function ClientFilterLoader({ range }: { range: DateRange }) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const clients = await listClients(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo },
    { authToken },
  );

  const items = clients.map((c) => ({ nit: c.client_nit, name: c.client_name }));
  return <ClientFilter items={items} />;
}
