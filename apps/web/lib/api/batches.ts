import {
  API_BASE_URL,
  buildHeaders,
  handleResponse,
  ApiError,
} from '@/lib/api/helpers';
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

export async function listBatches(
  { signal, authToken }: RequestConfig,
  cursor?: string,
): Promise<BatchListResponse> {
  const headers = buildHeaders({ authToken });

  const url = new URL(`${API_BASE_URL}/v1/batches`);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    signal,
  });

  return handleResponse<BatchListResponse>(res);
}

export async function deleteBatch(
  batchId: string,
  config?: RequestConfig,
): Promise<void> {
  const headers = buildHeaders({ authToken: config?.authToken });
  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}`, {
    method: 'DELETE',
    headers: headers,
    signal: config?.signal,
  });

  if (!res.ok) {
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
      /* non-JSON body */
    }
    throw new ApiError(res.status, code, message);
  }
}

export async function exportBatchXlsx(
  batchId: string,
  config?: RequestConfig,
): Promise<Blob> {
  const headers = buildHeaders({ authToken: config?.authToken });

  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}/export/xlsx`, {
    method: 'GET',
    headers,
    signal: config?.signal,
  });

  if (!res.ok) {
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

  return res.blob();
}

export async function exportBatchProductsXlsx(
  batchId: string,
  config?: RequestConfig,
): Promise<Blob> {
  const headers = buildHeaders({ authToken: config?.authToken });

  const res = await fetch(
    `${API_BASE_URL}/v1/batches/${batchId}/export/products/xlsx`,
    { method: 'GET', headers, signal: config?.signal },
  );

  if (!res.ok) {
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
      // non-JSON body — keep defaults
    }
    throw new ApiError(res.status, code, message);
  }

  return res.blob();
}
