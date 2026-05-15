import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse, JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../lib/api/helpers';

export const TEST_BATCH_ID = 'batch-1';

export const URLS = {
  INVOICES: {
    LIST: `${API_BASE_URL}/v1/invoices`,
    ISSUERS: `${API_BASE_URL}/v1/invoices/issuers`,
    CLIENTS: `${API_BASE_URL}/v1/invoices/clients`,
    PRODUCTS: `${API_BASE_URL}/v1/invoices/products`,
  },
  BATCHES: {
    LIST: `${API_BASE_URL}/v1/batches`,
    DETAIL: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}`,
    EXPORT_XLSX: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/export/xlsx`,
    EXPORT_PRODUCTS_XLSX: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/export/products/xlsx`,
  },
  ANALYTICS: {
    TOP_BUYERS: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/analytics/top-buyers`,
    TOP_ISSUERS: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/analytics/top-issuers`,
    TOP_PRODUCTS_BY_QUANTITY: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/analytics/top-products-by-quantity`,
    TOP_PRODUCTS_BY_REVENUE: `${API_BASE_URL}/v1/batches/${TEST_BATCH_ID}/analytics/top-products-by-revenue`,
  },
};

export const server = setupServer(
  // Invoices
  http.get(URLS.INVOICES.LIST, () => HttpResponse.json({ data: [], next_cursor: null })),
  http.get(URLS.INVOICES.ISSUERS, () => HttpResponse.json({ data: [] })),
  http.get(URLS.INVOICES.CLIENTS, () => HttpResponse.json({ data: [] })),
  http.get(URLS.INVOICES.PRODUCTS, () =>
    HttpResponse.json({ currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] }),
  ),
  // Batches
  http.get(URLS.BATCHES.LIST, () => HttpResponse.json({ data: [], next_cursor: null })),
  http.post(URLS.BATCHES.LIST, () =>
    HttpResponse.json({
      batch_id: TEST_BATCH_ID,
      status: 'queued',
      file_type: 'xml',
      file_name: 'test.xml',
      created_at: '2024-01-01T00:00:00Z',
    }),
  ),
  http.get(URLS.BATCHES.DETAIL, () =>
    HttpResponse.json({
      batch_id: TEST_BATCH_ID,
      status: 'done',
      file_type: 'xml',
      file_name: 'test.xml',
      created_at: '2024-01-01T00:00:00Z',
      source: null,
      invoice_count: 0,
      failed_count: 0,
      errors: [],
      completed_at: null,
    }),
  ),
  http.delete(URLS.BATCHES.DETAIL, () => new HttpResponse(null, { status: 204 })),
  http.get(URLS.BATCHES.EXPORT_XLSX, () => HttpResponse.json({ ok: true })),
  http.get(URLS.BATCHES.EXPORT_PRODUCTS_XLSX, () => HttpResponse.json({ ok: true })),
  // Analytics
  http.get(URLS.ANALYTICS.TOP_BUYERS, () =>
    HttpResponse.json({ batch_id: TEST_BATCH_ID, data: [] }),
  ),
  http.get(URLS.ANALYTICS.TOP_ISSUERS, () =>
    HttpResponse.json({ batch_id: TEST_BATCH_ID, data: [] }),
  ),
  http.get(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY, () =>
    HttpResponse.json({ batch_id: TEST_BATCH_ID, data: [] }),
  ),
  http.get(URLS.ANALYTICS.TOP_PRODUCTS_BY_REVENUE, () =>
    HttpResponse.json({ batch_id: TEST_BATCH_ID, data: [] }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Overrides the response body for `url` for the duration of the current test. */
export function setRequest({
  url,
  body,
  method = 'GET',
}: {
  url: string;
  body: unknown;
  method?: 'GET' | 'POST' | 'DELETE';
}) {
  if (method === 'POST') {
    server.use(http.post(url, () => HttpResponse.json(body as JsonBodyType)));
  } else if (method === 'DELETE') {
    server.use(http.delete(url, () => HttpResponse.json(body as JsonBodyType)));
  } else {
    server.use(http.get(url, () => HttpResponse.json(body as JsonBodyType)));
  }
}

/**
 * Overrides the handler for `url` for the current test and returns the intercepted
 * params and headers once the request arrives.
 * @example
 *   const captured = captureRequest(URLS.BATCHES.LIST);
 *   await listBatches({ authToken: 'tok' });
 *   expect(captured.headers!.get('Authorization')).toBe('Bearer tok');
 */
export function captureRequest(
  url: string,
  body: unknown = { data: [], next_cursor: null },
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
) {
  const captured = {
    params: null as URLSearchParams | null,
    headers: null as Headers | null,
  };

  if (method === 'POST') {
    server.use(
      http.post(url, ({ request }) => {
        captured.params = new URL(request.url).searchParams;
        captured.headers = request.headers;
        return HttpResponse.json(body as JsonBodyType);
      }),
    );
  } else if (method === 'DELETE') {
    server.use(
      http.delete(url, ({ request }) => {
        captured.params = new URL(request.url).searchParams;
        captured.headers = request.headers;
        return HttpResponse.json(body as JsonBodyType);
      }),
    );
  } else {
    server.use(
      http.get(url, ({ request }) => {
        captured.params = new URL(request.url).searchParams;
        captured.headers = request.headers;
        return HttpResponse.json(body as JsonBodyType);
      }),
    );
  }

  return captured;
}
