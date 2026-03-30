import { Nullable } from '@/lib/global.types';

// ---------------------------------------------------------------------------
// Config Handling
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Headers handling
// ---------------------------------------------------------------------------
interface BuildHeadersParams {
  authToken?: Nullable<string>;
}

export function buildHeaders({ authToken }: BuildHeadersParams) {
  const headers: Record<string, string> = {};

  if (authToken) {
    Object.assign(headers, { Authorization: `Bearer ${authToken}` });
  }

  return headers;
}

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

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
