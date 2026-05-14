import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse, JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../lib/api/helpers';

export const URLS = {
  INVOICES: {
    LIST: `${API_BASE_URL}/v1/invoices`,
    ISSUERS: `${API_BASE_URL}/v1/invoices/issuers`,
    CLIENTS: `${API_BASE_URL}/v1/invoices/clients`,
    PRODUCTS: `${API_BASE_URL}/v1/invoices/products`,
  },
};

export const server = setupServer(
  http.get(URLS.INVOICES.LIST, () => HttpResponse.json({ data: [], next_cursor: null })),
  http.get(URLS.INVOICES.ISSUERS, () => HttpResponse.json({ data: [] })),
  http.get(URLS.INVOICES.CLIENTS, () => HttpResponse.json({ data: [] })),
  http.get(URLS.INVOICES.PRODUCTS, () =>
    HttpResponse.json({ currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Overrides the response body for `url` for the duration of the current test. */
export function setRequest({ url, body }: { url: string; body: unknown }) {
  server.use(http.get(url, () => HttpResponse.json(body as JsonBodyType)));
}

/**
 * Overrides the handler for `url` for the current test and returns the intercepted
 * params and headers once the request arrives.
 * @example
 *   const captured = captureRequest(URLS.INVOICES.LIST);
 *   await listInvoices({ issuedFrom: '2024-01-01' });
 *   expect(captured.params!.get('issued_from')).toBe('2024-01-01');
 */
export function captureRequest(url: string, body: unknown = { data: [], next_cursor: null }) {
  const captured = {
    params: null as URLSearchParams | null,
    headers: null as Headers | null,
  };

  server.use(
    http.get(url, ({ request }) => {
      captured.params = new URL(request.url).searchParams;
      captured.headers = request.headers;
      return HttpResponse.json(body as JsonBodyType);
    }),
  );

  return captured;
}
