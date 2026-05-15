import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';
import type { BatchCreateResponse, BatchStatus } from './create-batch';

type RawBatchError = { file_name: string; reason: string };
type RawBatchDetailResponse = {
  batch_id: string;
  status: BatchStatus;
  file_type: string;
  file_name: string;
  created_at: string;
  source?: string | null;
  invoice_count: number | null;
  failed_count: number | null;
  errors: RawBatchError[];
  completed_at: string | null;
};

export type BatchError = { fileName: string; reason: string };
export type BatchDetailResponse = BatchCreateResponse & {
  source?: string | null;
  invoiceCount: number | null;
  failedCount: number | null;
  errors: BatchError[];
  completedAt: string | null;
};

export async function getBatch(
  batchId: string,
  { signal, authToken }: RequestConfig,
): Promise<BatchDetailResponse> {
  const headers = buildHeaders({ authToken });
  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    signal,
  });
  const raw = await handleResponse<RawBatchDetailResponse>(res);
  return {
    batchId: raw.batch_id,
    status: raw.status,
    fileType: raw.file_type,
    fileName: raw.file_name,
    createdAt: raw.created_at,
    source: raw.source,
    invoiceCount: raw.invoice_count,
    failedCount: raw.failed_count,
    errors: raw.errors.map((e) => ({ fileName: e.file_name, reason: e.reason })),
    completedAt: raw.completed_at,
  };
}
