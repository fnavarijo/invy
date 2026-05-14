import { auth } from '@clerk/nextjs/server';
import { listIssuers } from '@/lib/api/invoices/list-issuers';
import { listClients } from '@/lib/api/invoices/list-clients';
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
  for (const i of issuers) byNit.set(i.issuerNit, { nit: i.issuerNit, name: i.issuerName });
  for (const c of clients) {
    if (!byNit.has(c.clientNit)) byNit.set(c.clientNit, { nit: c.clientNit, name: c.clientName });
  }

  const items = Array.from(byNit.values()).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return <NitPrincipalFilter items={items} />;
}
