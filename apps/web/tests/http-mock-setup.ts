import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse, JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../lib/api/helpers';

export const URLS = {
  INVOICES: `${API_BASE_URL}/v1/invoices`,
};

export const server = setupServer(
  http.get(URLS.INVOICES, () =>
    HttpResponse.json({ data: [], next_cursor: null }),
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
 *   const captured = captureRequest(URLS.invoices);
 *   await listInvoices({ issuedFrom: '2024-01-01' });
 *   expect(captured.params!.get('issued_from')).toBe('2024-01-01');
 */
export function captureRequest(url: string) {
  const captured = {
    params: null as URLSearchParams | null,
    headers: null as Headers | null,
  };

  server.use(
    http.get(url, ({ request }) => {
      captured.params = new URL(request.url).searchParams;
      captured.headers = request.headers;
      return HttpResponse.json({ data: [], next_cursor: null });
    }),
  );

  return captured;
}
