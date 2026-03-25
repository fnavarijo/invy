const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Error type
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeader(): Record<string, string> {
  // Token may live in a cookie or env variable at runtime. We read it from
  // a client-accessible env var; callers can extend this if needed.
  const token =
    typeof window !== 'undefined'
      ? (window as Window & { __INVY_TOKEN__?: string }).__INVY_TOKEN__
      : undefined;

  console.log('Token', token);
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function handleResponse<T>(res: Response): Promise<T> {
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
): Promise<BatchCreateResponse> {
  const form = new FormData();
  form.append('file', file);
  if (source !== undefined && source !== '') {
    form.append('source', source);
  }

  const authHeader = getAuthHeader();
  console.log('GetAuthHeader', JSON.stringify(authHeader));
  const res = await fetch(`${API_BASE_URL}/v1/batches`, {
    method: 'POST',
    headers: {
      ...authHeader,
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
  signal?: AbortSignal,
): Promise<BatchDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/batches/${batchId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    signal,
  });

  return handleResponse<BatchDetailResponse>(res);
}
