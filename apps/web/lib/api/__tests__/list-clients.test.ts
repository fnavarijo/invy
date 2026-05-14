import { describe, test, expect } from 'vitest';

import { listClients } from '../invoices/list-clients';
import { setRequest, captureRequest, URLS } from '../../../tests/http-mock-setup';

const RAW_CLIENT = { client_nit: '7654321', client_name: 'Cliente ABC' };

describe('[API] listClients', () => {
  describe('filter parameters', () => {
    test('sends issuedFrom as issued_from', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({ issuedFrom: '2024-01-01' });
      expect(captured.params!.get('issued_from')).toBe('2024-01-01');
    });

    test('sends issuedTo as issued_to', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({ issuedTo: '2024-01-31' });
      expect(captured.params!.get('issued_to')).toBe('2024-01-31');
    });

    test('omits params that are not set', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({});
      expect(captured.params!.has('issued_from')).toBe(false);
      expect(captured.params!.has('issued_to')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({}, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({});
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.INVOICES.CLIENTS);
      await listClients({}, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps items to camelCase', async () => {
      setRequest({ url: URLS.INVOICES.CLIENTS, body: { data: [RAW_CLIENT] } });
      const result = await listClients({});
      expect(result[0]).toEqual({ clientNit: '7654321', clientName: 'Cliente ABC' });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({ url: URLS.INVOICES.CLIENTS, body: { data: [RAW_CLIENT] } });
      const result = await listClients({});
      expect(result[0]).not.toHaveProperty('client_nit');
      expect(result[0]).not.toHaveProperty('client_name');
    });

    test('returns empty array when there are no clients', async () => {
      const result = await listClients({});
      expect(result).toEqual([]);
    });
  });
});
