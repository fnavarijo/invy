import { describe, test, expect, vi, beforeEach } from 'vitest';
import { listInvoices } from '../invoices/list-invoices';

const fetchSpy = vi.spyOn(global, 'fetch');

const RAW_ITEM = {
  invoice_id: 'inv-1',
  invoice_number: 'F001-0001',
  type: 'FACT',
  currency: 'GTQ',
  total_amount: '150.00',
  issued_at: '2024-03-01T00:00:00Z',
  issuer_name: 'Empresa XYZ',
  issuer_nit: '1234567',
  client_name: 'Cliente ABC',
  client_nit: '7654321',
  created_at: '2024-03-01T12:00:00Z',
};

function mockOk(body: unknown) {
  fetchSpy.mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

function calledUrl(): URL {
  const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
  return new URL(url);
}

function calledHeaders(): Record<string, string> {
  const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  return (init.headers ?? {}) as Record<string, string>;
}

beforeEach(() => {
  fetchSpy.mockReset();
});

describe('[API] listInvoices', () => {
  describe('filter parameters', () => {
    test('sends issuedFrom as issued_from', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ issuedFrom: '2024-01-01' });
      expect(calledUrl().searchParams.get('issued_from')).toBe('2024-01-01');
    });

    test('sends issuedTo as issued_to', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ issuedTo: '2024-01-31' });
      expect(calledUrl().searchParams.get('issued_to')).toBe('2024-01-31');
    });

    test('sends limit', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ limit: 50 });
      expect(calledUrl().searchParams.get('limit')).toBe('50');
    });

    test('sends type', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ type: 'FACT' });
      expect(calledUrl().searchParams.get('type')).toBe('FACT');
    });

    test('sends currency', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ currency: 'USD' });
      expect(calledUrl().searchParams.get('currency')).toBe('USD');
    });

    test('sends issuerNit as issuer_nit', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ issuerNit: '1234567' });
      expect(calledUrl().searchParams.get('issuer_nit')).toBe('1234567');
    });

    test('sends clientNit as client_nit', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({ clientNit: '7654321' });
      expect(calledUrl().searchParams.get('client_nit')).toBe('7654321');
    });

    test('omits params that are not set', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({});
      const params = calledUrl().searchParams;
      expect(params.has('issued_from')).toBe(false);
      expect(params.has('issued_to')).toBe(false);
      expect(params.has('limit')).toBe(false);
      expect(params.has('issuer_nit')).toBe(false);
      expect(params.has('client_nit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({}, { authToken: 'test-token' });
      expect(calledHeaders()).toMatchObject({ Authorization: 'Bearer test-token' });
    });

    test('omits Authorization header when authToken is not provided', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({});
      expect(calledHeaders()).not.toHaveProperty('Authorization');
    });

    test('omits Authorization header when authToken is null', async () => {
      mockOk({ data: [], next_cursor: null });
      await listInvoices({}, { authToken: null });
      expect(calledHeaders()).not.toHaveProperty('Authorization');
    });
  });

  describe('return value', () => {
    test('maps item fields to camelCase', async () => {
      mockOk({ data: [RAW_ITEM], next_cursor: null });
      const result = await listInvoices({});
      expect(result.data[0]).toEqual({
        invoiceId: 'inv-1',
        invoiceNumber: 'F001-0001',
        type: 'FACT',
        currency: 'GTQ',
        totalAmount: '150.00',
        issuedAt: '2024-03-01T00:00:00Z',
        issuerName: 'Empresa XYZ',
        issuerNit: '1234567',
        clientName: 'Cliente ABC',
        clientNit: '7654321',
        createdAt: '2024-03-01T12:00:00Z',
      });
    });

    test('does not expose snake_case keys on items', async () => {
      mockOk({ data: [RAW_ITEM], next_cursor: null });
      const result = await listInvoices({});
      const item = result.data[0];
      expect(item).not.toHaveProperty('invoice_id');
      expect(item).not.toHaveProperty('invoice_number');
      expect(item).not.toHaveProperty('total_amount');
      expect(item).not.toHaveProperty('issued_at');
      expect(item).not.toHaveProperty('issuer_name');
      expect(item).not.toHaveProperty('issuer_nit');
      expect(item).not.toHaveProperty('client_name');
      expect(item).not.toHaveProperty('client_nit');
      expect(item).not.toHaveProperty('created_at');
    });

    test('maps next_cursor to nextCursor', async () => {
      mockOk({ data: [], next_cursor: 'cursor-abc' });
      const result = await listInvoices({});
      expect(result.nextCursor).toBe('cursor-abc');
      expect(result).not.toHaveProperty('next_cursor');
    });

    test('nextCursor is null when there are no more pages', async () => {
      mockOk({ data: [], next_cursor: null });
      const result = await listInvoices({});
      expect(result.nextCursor).toBeNull();
    });
  });
});
