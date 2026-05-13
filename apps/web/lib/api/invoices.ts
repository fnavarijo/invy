import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export type InvoiceListParams = {
  issuedFrom?: string;
  issuedTo?: string;
  limit?: number;
  type?: string;
  currency?: string;
  issuerNit?: string;
  clientNit?: string;
};

export type IssuerItem = {
  issuer_nit: string;
  issuer_name: string;
};

export type ClientItem = {
  client_nit: string;
  client_name: string;
};

export async function listClients(
  params: Pick<InvoiceListParams, 'issuedFrom' | 'issuedTo'>,
  config?: RequestConfig,
): Promise<ClientItem[]> {
  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);

  const res = await fetch(
    `${API_BASE_URL}/v1/invoices/clients?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...buildHeaders({ authToken: config?.authToken }),
      },
      signal: config?.signal,
    },
  );

  const body = await handleResponse<{ data: ClientItem[] }>(res);
  return body.data;
}

export async function listIssuers(
  params: Pick<InvoiceListParams, 'issuedFrom' | 'issuedTo'>,
  config?: RequestConfig,
): Promise<IssuerItem[]> {
  const query = new URLSearchParams();
  if (params.issuedFrom) query.set('issued_from', params.issuedFrom);
  if (params.issuedTo) query.set('issued_to', params.issuedTo);

  const res = await fetch(
    `${API_BASE_URL}/v1/invoices/issuers?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...buildHeaders({ authToken: config?.authToken }),
      },
      signal: config?.signal,
    },
  );

  const body = await handleResponse<{ data: IssuerItem[] }>(res);
  return body.data;
}

export type InvoiceProductItem = {
  name: string;
  type: string;
  total_quantity: string;
  product_total: string;
};

export type InvoiceProductsParams = {
  issuedFrom: string;
  issuedTo: string;
  currency: string;
  issuerNit?: string;
  clientNit?: string;
};

export type InvoiceProductsResponse = {
  currency: string;
  invoices_total: string;
  products_total: string;
  products: InvoiceProductItem[];
};

export async function getInvoiceProducts(
  params: InvoiceProductsParams,
  config?: RequestConfig,
): Promise<InvoiceProductsResponse> {
  const query = new URLSearchParams();
  query.set('issued_from', params.issuedFrom);
  query.set('issued_to', params.issuedTo);
  query.set('currency', params.currency);
  if (params.issuerNit) query.set('issuer_nit', params.issuerNit);
  if (params.clientNit) query.set('client_nit', params.clientNit);

  const res = await fetch(
    `${API_BASE_URL}/v1/invoices/products?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...buildHeaders({ authToken: config?.authToken }),
      },
      signal: config?.signal,
    },
  );

  return handleResponse<InvoiceProductsResponse>(res);
}
