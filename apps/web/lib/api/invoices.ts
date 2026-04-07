import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export type GlobalInvoiceListItem = {
  invoice_id: string;
  invoice_number: string;
  type: string;
  currency: string;
  total_amount: string;
  issued_at: string;
  issuer_name: string;
  issuer_nit: string;
  client_name: string;
  client_nit: string;
  created_at: string;
};

export type InvoiceListParams = {
  issuedFrom?: string;
  issuedTo?: string;
  limit?: number;
  type?: string;
  currency?: string;
  issuerNit?: string;
  clientNit?: string;
};

export type GlobalInvoiceListResponse = {
  data: GlobalInvoiceListItem[];
  next_cursor: string | null;
};

export async function listInvoices(
  params: InvoiceListParams,
  config?: RequestConfig,
): Promise<GlobalInvoiceListResponse> {
  console.log('params', params.issuedFrom);

  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.currency) query.set('currency', params.currency);
  if (params.issuerNit) query.set('issuer_nit', params.issuerNit);
  if (params.clientNit) query.set('client_nit', params.clientNit);

  console.log('quer', query);

  const url = `${API_BASE_URL}/v1/invoices?${query.toString()}`;
  console.log(url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<GlobalInvoiceListResponse>(res);
}
