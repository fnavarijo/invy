import { API_BASE_URL, buildHeaders, ApiError } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export async function exportBatchXlsx(batchId: string, config?: RequestConfig): Promise<Blob> {
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
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
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
