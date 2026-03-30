import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type BatchStatus = 'queued' | 'processing' | 'done' | 'failed';

export type BatchError = {
  file_name: string;
  reason: string;
};

export type BatchCreateResponse = {
  batch_id: string;
  status: BatchStatus;
  file_type: string;
  file_name: string;
  created_at: string;
};

export type BatchDetailResponse = BatchCreateResponse & {
  source?: string | null;
  invoice_count: number | null;
  failed_count: number | null;
  errors: BatchError[];
  completed_at: string | null;
};

export type BatchListItem = {
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

export type BatchListResponse = {
  data: BatchListItem[];
  next_cursor: string | null;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Upload a file and create a new processing batch.
 * Uses native `fetch` with a `FormData` body.
 */
export async function createBatch(
  file: File,
  source?: string,
  config?: RequestConfig,
): Promise<BatchCreateResponse> {
  const form = new FormData();
  form.append('file', file);
  if (source !== undefined && source !== '') {
    form.append('source', source);
  }

  const headers = await buildHeaders({ authToken: config?.authToken });
  const res = await fetch(`${API_BASE_URL}/v1/batches`, {
    method: 'POST',
    headers: {
      ...headers,
    },
    body: form,
  });

  return handleResponse<BatchCreateResponse>(res);
}

/**
 * Retrieve the current state of a batch.
 */
export async function getBatch(
  batchId: string,
  { signal, authToken }: RequestConfig,
): Promise<BatchDetailResponse> {
  const headers = buildHeaders({ authToken });

  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  });

  return handleResponse<BatchDetailResponse>(res);
}

export async function listBatches({
  signal,
  authToken,
}: RequestConfig): Promise<BatchListResponse> {
  const headers = buildHeaders({ authToken });

  const res = await fetch(`${API_BASE_URL}/v1/batches`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    signal,
  });

  return handleResponse<BatchListResponse>(res);
}
