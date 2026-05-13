import { auth } from '@clerk/nextjs/server';
import { listIssuers, listClients } from '@/lib/api/invoices';
import { NitPrincipalFilter } from '@/components/dashboard/nit-principal-filter';
import type { NitItem } from '@/components/dashboard/issuer-filter';
import type { DateRange } from '@/lib/date-range';

export async function NitPrincipalFilterLoader({ range }: { range: DateRange }) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const [issuers, clients] = await Promise.all([
    listIssuers({ issuedFrom: range.issuedFrom, issuedTo: range.issuedTo }, { authToken }),
    listClients({ issuedFrom: range.issuedFrom, issuedTo: range.issuedTo }, { authToken }),
  ]);

  const byNit = new Map<string, NitItem>();
  for (const i of issuers) byNit.set(i.issuer_nit, { nit: i.issuer_nit, name: i.issuer_name });
  for (const c of clients) {
    if (!byNit.has(c.client_nit)) byNit.set(c.client_nit, { nit: c.client_nit, name: c.client_name });
  }

  const items = Array.from(byNit.values()).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return <NitPrincipalFilter items={items} />;
}
