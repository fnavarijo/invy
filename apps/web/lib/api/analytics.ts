import { ApiError } from '@/lib/api/batches';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
// Helpers
// ---------------------------------------------------------------------------

function getAnalyticsAuthHeader(): Record<string, string> {
  const token =
    typeof window !== 'undefined'
      ? (window as Window & { __INVY_TOKEN__?: string }).__INVY_TOKEN__
      : undefined;

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let code = 'UNKNOWN_ERROR';
  let message = `Request failed with status ${res.status}`;

  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // body was not JSON — keep defaults
  }

  throw new ApiError(res.status, code, message);
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTopProductsByQuantity(
  batchId: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<TopProductsByQuantityResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-products-by-quantity${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAnalyticsAuthHeader(),
    },
    signal,
  });
  return handleResponse<TopProductsByQuantityResponse>(res);
}

export async function getTopProductsByRevenue(
  batchId: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<TopProductsByRevenueResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-products-by-revenue${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAnalyticsAuthHeader(),
    },
    signal,
  });
  return handleResponse<TopProductsByRevenueResponse>(res);
}

export async function getTopBuyers(
  batchId: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<TopBuyersResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-buyers${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAnalyticsAuthHeader(),
    },
    signal,
  });
  return handleResponse<TopBuyersResponse>(res);
}
