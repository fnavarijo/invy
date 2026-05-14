import { API_BASE_URL, buildHeaders, handleResponse } from '../helpers';
import type { RequestConfig } from '../types';

export type IssuerItem = {
  issuerNit: string;
  issuerName: string;
};

type RawIssuerItem = {
  issuer_nit: string;
  issuer_name: string;
};

export type ListIssuersParams = {
  issuedFrom?: string;
  issuedTo?: string;
};

export async function listIssuers(
  params: ListIssuersParams,
  config?: RequestConfig,
): Promise<IssuerItem[]> {
  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);

  const res = await fetch(`${API_BASE_URL}/v1/invoices/issuers?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  const body = await handleResponse<{ data: RawIssuerItem[] }>(res);
  return body.data.map((i) => ({ issuerNit: i.issuer_nit, issuerName: i.issuer_name }));
}
