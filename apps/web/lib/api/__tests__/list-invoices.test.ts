import { describe, test, expect } from 'vitest';

import { listInvoices } from '../invoices/list-invoices';
import {
  setRequest,
  captureRequest,
  URLS,
} from '../../../tests/http-mock-setup';

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

describe('[API] listInvoices', () => {
  describe('filter parameters', () => {
    test('sends issuedFrom as issued_from', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ issuedFrom: '2024-01-01' });
      expect(captured.params!.get('issued_from')).toBe('2024-01-01');
    });

    test('sends issuedTo as issued_to', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ issuedTo: '2024-01-31' });
      expect(captured.params!.get('issued_to')).toBe('2024-01-31');
    });

    test('sends limit', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ limit: 50 });
      expect(captured.params!.get('limit')).toBe('50');
    });

    test('sends type', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ type: 'FACT' });
      expect(captured.params!.get('type')).toBe('FACT');
    });

    test('sends currency', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ currency: 'USD' });
      expect(captured.params!.get('currency')).toBe('USD');
    });

    test('sends issuerNit as issuer_nit', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ issuerNit: '1234567' });
      expect(captured.params!.get('issuer_nit')).toBe('1234567');
    });

    test('sends clientNit as client_nit', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({ clientNit: '7654321' });
      expect(captured.params!.get('client_nit')).toBe('7654321');
    });

    test('omits params that are not set', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({});
      expect(captured.params!.has('issued_from')).toBe(false);
      expect(captured.params!.has('issued_to')).toBe(false);
      expect(captured.params!.has('limit')).toBe(false);
      expect(captured.params!.has('issuer_nit')).toBe(false);
      expect(captured.params!.has('client_nit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({}, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({});
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.INVOICES.LIST);
      await listInvoices({}, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps item fields to camelCase', async () => {
      setRequest({
        url: URLS.INVOICES.LIST,
        body: { data: [RAW_ITEM], next_cursor: null },
      });

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
      setRequest({
        url: URLS.INVOICES.LIST,
        body: { data: [RAW_ITEM], next_cursor: null },
      });

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
      setRequest({
        url: URLS.INVOICES.LIST,
        body: { data: [], next_cursor: 'cursor-abc' },
      });

      const result = await listInvoices({});

      expect(result.nextCursor).toBe('cursor-abc');
      expect(result).not.toHaveProperty('next_cursor');
    });

    test('nextCursor is null when there are no more pages', async () => {
      const result = await listInvoices({});
      expect(result.nextCursor).toBeNull();
    });
  });
});
