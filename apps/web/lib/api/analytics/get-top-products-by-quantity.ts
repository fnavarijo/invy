import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

type RawItem = { product_name: string; total_quantity: string };
type RawResponse = { batch_id: string; data: RawItem[] };

export type TopProductByQuantityItem = { productName: string; totalQuantity: string };
export type TopProductsByQuantityResponse = { batchId: string; data: TopProductByQuantityItem[] };

export async function getTopProductsByQuantity(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopProductsByQuantityResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-products-by-quantity${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...buildHeaders({ authToken: config?.authToken }) },
    signal: config?.signal,
  });
  const raw = await handleResponse<RawResponse>(res);
  return {
    batchId: raw.batch_id,
    data: raw.data.map((i) => ({ productName: i.product_name, totalQuantity: i.total_quantity })),
  };
}
