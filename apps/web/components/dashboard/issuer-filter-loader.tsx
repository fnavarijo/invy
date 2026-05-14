import { auth } from '@clerk/nextjs/server';
import { listIssuers } from '@/lib/api/invoices/list-issuers';
import { IssuerFilter } from '@/components/dashboard/issuer-filter';
import type { DateRange } from '@/lib/date-range';

export async function IssuerFilterLoader({ range }: { range: DateRange }) {
  const { getToken } = await auth();
  const authToken = await getToken();

  const issuers = await listIssuers(
    { issuedFrom: range.issuedFrom, issuedTo: range.issuedTo },
    { authToken },
  );

  const items = issuers.map((i) => ({ nit: i.issuerNit, name: i.issuerName }));
  return <IssuerFilter items={items} />;
}
