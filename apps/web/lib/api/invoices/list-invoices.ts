import { API_BASE_URL, buildHeaders, handleResponse } from '../helpers';
import { RequestConfig } from '../types';

export type InvoiceListParams = {
  issuedFrom?: string;
  issuedTo?: string;
  limit?: number;
  type?: string;
  currency?: string;
  issuerNit?: string;
  clientNit?: string;
};

export type GlobalInvoiceListItem = {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  currency: string;
  totalAmount: string;
  issuedAt: string;
  issuerName: string;
  issuerNit: string;
  clientName: string;
  clientNit: string;
  createdAt: string;
};

export type GlobalInvoiceListResponse = {
  data: GlobalInvoiceListItem[];
  nextCursor: string | null;
};

// Raw shape returned by the API (snake_case)
type RawItem = {
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

type RawResponse = {
  data: RawItem[];
  next_cursor: string | null;
};

function mapItem(raw: RawItem): GlobalInvoiceListItem {
  return {
    invoiceId: raw.invoice_id,
    invoiceNumber: raw.invoice_number,
    type: raw.type,
    currency: raw.currency,
    totalAmount: raw.total_amount,
    issuedAt: raw.issued_at,
    issuerName: raw.issuer_name,
    issuerNit: raw.issuer_nit,
    clientName: raw.client_name,
    clientNit: raw.client_nit,
    createdAt: raw.created_at,
  };
}

export async function listInvoices(
  params: InvoiceListParams,
  config?: RequestConfig,
): Promise<GlobalInvoiceListResponse> {
  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.currency) query.set('currency', params.currency);
  if (params.issuerNit) query.set('issuer_nit', params.issuerNit);
  if (params.clientNit) query.set('client_nit', params.clientNit);

  const url = `${API_BASE_URL}/v1/invoices?${query.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  const raw = await handleResponse<RawResponse>(res);
  return {
    data: raw.data.map(mapItem),
    nextCursor: raw.next_cursor,
  };
}
