import { API_BASE_URL, handleResponse } from '@/lib/api/helpers';
import { buildHeaders } from '@/lib/api/helpers';
import { RequestConfig } from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type TopProductByQuantityItem = {
  product_name: string;
  total_quantity: string;
};

export type TopProductsByQuantityResponse = {
  batch_id: string;
  data: TopProductByQuantityItem[];
};

export type TopProductByRevenueItem = {
  product_name: string;
  total_revenue: string;
};

export type TopProductsByRevenueResponse = {
  batch_id: string;
  data: TopProductByRevenueItem[];
};

export type TopBuyerItem = {
  client_name: string;
  client_nit: string;
  total_spent: string;
  invoice_count: number;
};

export type TopBuyersResponse = {
  batch_id: string;
  data: TopBuyerItem[];
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTopProductsByQuantity(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopProductsByQuantityResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-products-by-quantity${limit !== undefined ? `?limit=${limit}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<TopProductsByQuantityResponse>(res);
}

export async function getTopProductsByRevenue(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopProductsByRevenueResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-products-by-revenue${limit !== undefined ? `?limit=${limit}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<TopProductsByRevenueResponse>(res);
}

export async function getTopBuyers(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopBuyersResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-buyers${limit !== undefined ? `?limit=${limit}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<TopBuyersResponse>(res);
}

export type TopIssuerItem = {
  issuer_name: string;
  issuer_nit: string;
  total_received: string;
  invoice_count: number;
};

export type TopIssuersResponse = {
  batch_id: string;
  data: TopIssuerItem[];
};

export async function getTopIssuers(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopIssuersResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-issuers${limit !== undefined ? `?limit=${limit}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders({ authToken: config?.authToken }),
    },
    signal: config?.signal,
  });

  return handleResponse<TopIssuersResponse>(res);
}
