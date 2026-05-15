import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

type RawItem = {
  issuer_name: string;
  issuer_nit: string;
  total_received: string;
  invoice_count: number;
};
type RawResponse = { batch_id: string; data: RawItem[] };

export type TopIssuerItem = {
  issuerName: string;
  issuerNit: string;
  totalReceived: string;
  invoiceCount: number;
};
export type TopIssuersResponse = { batchId: string; data: TopIssuerItem[] };

export async function getTopIssuers(
  batchId: string,
  limit?: number,
  config?: RequestConfig,
): Promise<TopIssuersResponse> {
  const url = `${API_BASE_URL}/v1/batches/${batchId}/analytics/top-issuers${limit !== undefined ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...buildHeaders({ authToken: config?.authToken }) },
    signal: config?.signal,
  });
  const raw = await handleResponse<RawResponse>(res);
  return {
    batchId: raw.batch_id,
    data: raw.data.map((i) => ({
      issuerName: i.issuer_name,
      issuerNit: i.issuer_nit,
      totalReceived: i.total_received,
      invoiceCount: i.invoice_count,
    })),
  };
}
