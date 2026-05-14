import { API_BASE_URL, buildHeaders, handleResponse } from '../helpers';
import type { RequestConfig } from '../types';

export type InvoiceProductItem = {
  name: string;
  type: string;
  totalQuantity: string;
  productTotal: string;
};

export type InvoiceProductsResponse = {
  currency: string;
  invoicesTotal: string;
  productsTotal: string;
  products: InvoiceProductItem[];
};

export type InvoiceProductsParams = {
  issuedFrom: string;
  issuedTo: string;
  currency: string;
  issuerNit?: string;
  clientNit?: string;
};

type RawProductItem = {
  name: string;
  type: string;
  total_quantity: string;
  product_total: string;
};

type RawProductsResponse = {
  currency: string;
  invoices_total: string;
  products_total: string;
  products: RawProductItem[];
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

  const res = await fetch(`${API_BASE_URL}/v1/invoices/products?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  const raw = await handleResponse<RawProductsResponse>(res);
  return {
    currency: raw.currency,
    invoicesTotal: raw.invoices_total,
    productsTotal: raw.products_total,
    products: raw.products.map((p) => ({
      name: p.name,
      type: p.type,
      totalQuantity: p.total_quantity,
      productTotal: p.product_total,
    })),
  };
}
