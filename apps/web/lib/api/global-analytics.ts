import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';
import type {
  TopProductByQuantityItem,
  TopProductByRevenueItem,
  TopBuyerItem,
  TopIssuerItem,
} from '@/lib/api/analytics';

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

type RawGlobalTopProductsByQuantityResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{ product_name: string; total_quantity: string }>;
};

export type GlobalTopProductsByQuantityResponse = {
  issuedFrom: string;
  issuedTo: string;
  data: TopProductByQuantityItem[];
};

type RawGlobalTopProductsByRevenueResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{ product_name: string; total_revenue: string }>;
};

export type GlobalTopProductsByRevenueResponse = {
  issuedFrom: string;
  issuedTo: string;
  data: TopProductByRevenueItem[];
};

type RawGlobalTopBuyersResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{
    client_name: string;
    client_nit: string;
    total_spent: string;
    invoice_count: number;
  }>;
};

export type GlobalTopBuyersResponse = {
  issuedFrom: string;
  issuedTo: string;
  data: TopBuyerItem[];
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
  const raw = await handleResponse<RawGlobalTopProductsByQuantityResponse>(res);
  return {
    issuedFrom: raw.issued_from,
    issuedTo: raw.issued_to,
    data: raw.data.map((i) => ({ productName: i.product_name, totalQuantity: i.total_quantity })),
  };
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
  const raw = await handleResponse<RawGlobalTopProductsByRevenueResponse>(res);
  return {
    issuedFrom: raw.issued_from,
    issuedTo: raw.issued_to,
    data: raw.data.map((i) => ({ productName: i.product_name, totalRevenue: i.total_revenue })),
  };
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
  const raw = await handleResponse<RawGlobalTopBuyersResponse>(res);
  return {
    issuedFrom: raw.issued_from,
    issuedTo: raw.issued_to,
    data: raw.data.map((i) => ({
      clientName: i.client_name,
      clientNit: i.client_nit,
      totalSpent: i.total_spent,
      invoiceCount: i.invoice_count,
    })),
  };
}

type RawGlobalTopIssuersResponse = {
  issued_from: string;
  issued_to: string;
  data: Array<{
    issuer_name: string;
    issuer_nit: string;
    total_received: string;
    invoice_count: number;
  }>;
};

export type GlobalTopIssuersResponse = {
  issuedFrom: string;
  issuedTo: string;
  data: TopIssuerItem[];
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
  const raw = await handleResponse<RawGlobalTopIssuersResponse>(res);
  return {
    issuedFrom: raw.issued_from,
    issuedTo: raw.issued_to,
    data: raw.data.map((i) => ({
      issuerName: i.issuer_name,
      issuerNit: i.issuer_nit,
      totalReceived: i.total_received,
      invoiceCount: i.invoice_count,
    })),
  };
}
