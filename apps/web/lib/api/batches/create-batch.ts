import { API_BASE_URL, buildHeaders, handleResponse } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export type BatchStatus = 'queued' | 'processing' | 'done' | 'failed';

type RawBatchCreateResponse = {
  batch_id: string;
  status: BatchStatus;
  file_type: string;
  file_name: string;
  created_at: string;
};

export type BatchCreateResponse = {
  batchId: string;
  status: BatchStatus;
  fileType: string;
  fileName: string;
  createdAt: string;
};

function mapBatchCreate(raw: RawBatchCreateResponse): BatchCreateResponse {
  return {
    batchId: raw.batch_id,
    status: raw.status,
    fileType: raw.file_type,
    fileName: raw.file_name,
    createdAt: raw.created_at,
  };
}

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
    headers: { ...headers },
    body: form,
  });

  const raw = await handleResponse<RawBatchCreateResponse>(res);
  return mapBatchCreate(raw);
}

export { mapBatchCreate };
