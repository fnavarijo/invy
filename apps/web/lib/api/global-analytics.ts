import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export type GlobalAnalyticsParams = {
  issuedFrom: string;
  issuedTo: string;
  issuerNit?: string;
  clientNit?: string;
  limit?: number;
};

export type GlobalSummaryResponse = {
  issued_from: string;
  issued_to: string;
  invoice_count: number;
  total_amount: string;
  unique_issuers: number;
  unique_clients: number;
};

export type GlobalTopProductsByQuantityResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{ product_name: string; total_quantity: string }>;
};

export type GlobalTopProductsByRevenueResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{ product_name: string; total_revenue: string }>;
};

export type GlobalTopBuyersResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{
    client_name: string;
    client_nit: string;
    total_spent: string;
    invoice_count: number;
  }>;
};

function buildUrl(
  path: string,
  { issuedFrom, issuedTo, issuerNit, clientNit, limit }: GlobalAnalyticsParams,
): string {
  const params = new URLSearchParams({
    issued_from: issuedFrom,
    issued_to: issuedTo,
  });
  if (issuerNit) params.set('issuer_nit', issuerNit);
  if (clientNit) params.set('client_nit', clientNit);
  if (limit !== undefined) params.set('limit', String(limit));
  return `${API_BASE_URL}/v1/analytics/${path}?${params.toString()}`;
}

export async function getGlobalSummary(
  params: GlobalAnalyticsParams,
  config?: RequestConfig,
): Promise<GlobalSummaryResponse> {
  const res = await fetch(buildUrl('summary', params), {
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<GlobalSummaryResponse>(res);
}

export async function getGlobalTopProductsByQuantity(
  params: GlobalAnalyticsParams,
  config?: RequestConfig,
): Promise<GlobalTopProductsByQuantityResponse> {
  const res = await fetch(buildUrl('top-products-by-quantity', params), {
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });
  return handleResponse<GlobalTopProductsByQuantityResponse>(res);
}

export async function getGlobalTopProductsByRevenue(
  params: GlobalAnalyticsParams,
  config?: RequestConfig,
): Promise<GlobalTopProductsByRevenueResponse> {
  const res = await fetch(buildUrl('top-products-by-revenue', params), {
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });
  return handleResponse<GlobalTopProductsByRevenueResponse>(res);
}

export async function getGlobalTopBuyers(
  params: GlobalAnalyticsParams,
  config?: RequestConfig,
): Promise<GlobalTopBuyersResponse> {
  const res = await fetch(buildUrl('top-buyers', params), {
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });
  return handleResponse<GlobalTopBuyersResponse>(res);
}

export type GlobalTopIssuersResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{
    issuer_name: string;
    issuer_nit: string;
    total_received: string;
    invoice_count: number;
  }>;
};

export async function getGlobalTopIssuers(
  params: GlobalAnalyticsParams,
  config?: RequestConfig,
): Promise<GlobalTopIssuersResponse> {
  const res = await fetch(buildUrl('top-issuers', params), {
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });
  return handleResponse<GlobalTopIssuersResponse>(res);
}
