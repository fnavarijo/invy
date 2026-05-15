import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

type RawItem = {
  client_name: string;
  client_nit: string;
  total_spent: string;
  invoice_count: number;
};
type RawResponse = { batch_id: string; data: RawItem[] };

export type TopBuyerItem = {
  clientName: string;
  clientNit: string;
  totalSpent: string;
  invoiceCount: number;
};
export type TopBuyersResponse = { batchId: string; data: TopBuyerItem[] };

export async function getTopBuyers(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopBuyersResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-buyers${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...buildHeaders({ authToken: config?.authToken }) },
    signal: config?.signal,
  });
  const raw = await handleResponse<RawResponse>(res);
  return {
    batchId: raw.batch_id,
    data: raw.data.map((i) => ({
      clientName: i.client_name,
      clientNit: i.client_nit,
      totalSpent: i.total_spent,
      invoiceCount: i.invoice_count,
    })),
  };
}
