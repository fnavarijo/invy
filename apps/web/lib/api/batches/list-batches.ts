import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';
import type { BatchStatus } from './create-batch';

type RawBatchListItem = {
  batch_id: string;
  status: BatchStatus;
  file_type: string;
  file_name: string;
  source: string | null;
  invoice_count: number | null;
  failed_count: number | null;
  created_at: string;
  completed_at: string | null;
};
type RawBatchListResponse = { data: RawBatchListItem[]; next_cursor: string | null };

export type BatchListItem = {
  batchId: string;
  status: BatchStatus;
  fileType: string;
  fileName: string;
  source: string | null;
  invoiceCount: number | null;
  failedCount: number | null;
  createdAt: string;
  completedAt: string | null;
};
export type BatchListResponse = { data: BatchListItem[]; nextCursor: string | null };

export async function listBatches(
  { signal, authToken }: RequestConfig,
  cursor?: string,
): Promise<BatchListResponse> {
  const headers = buildHeaders({ authToken });
  const url = new URL(`${API_BASE_URL}/v1/batches`);
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    signal,
  });
  const raw = await handleResponse<RawBatchListResponse>(res);
  return {
    nextCursor: raw.next_cursor,
    data: raw.data.map((b) => ({
      batchId: b.batch_id,
      status: b.status,
      fileType: b.file_type,
      fileName: b.file_name,
      source: b.source,
      invoiceCount: b.invoice_count,
      failedCount: b.failed_count,
      createdAt: b.created_at,
      completedAt: b.completed_at,
    })),
  };
}
