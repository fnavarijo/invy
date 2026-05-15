import { API_BASE_URL, buildHeaders, ApiError } from '@/lib/api/helpers';
import type { RequestConfig } from '@/lib/api/types';

export async function deleteBatch(batchId: string, config?: RequestConfig): Promise<void> {
  const headers = buildHeaders({ authToken: config?.authToken });
  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}`, {
    method: 'DELETE',
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
      /* non-JSON body */
    }
    throw new ApiError(res.status, code, message);
  }
}
