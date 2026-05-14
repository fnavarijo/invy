import { describe, test, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { listIssuers } from '../invoices/list-issuers';
import { server, setRequest, captureRequest, URLS } from '../../../tests/http-mock-setup';

const RAW_ISSUER = { issuer_nit: '1234567', issuer_name: 'Empresa XYZ' };

describe('[API] listIssuers', () => {
  describe('filter parameters', () => {
    test('sends issuedFrom as issued_from', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({ issuedFrom: '2024-01-01' });
      expect(captured.params!.get('issued_from')).toBe('2024-01-01');
    });

    test('sends issuedTo as issued_to', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({ issuedTo: '2024-01-31' });
      expect(captured.params!.get('issued_to')).toBe('2024-01-31');
    });

    test('omits params that are not set', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({});
      expect(captured.params!.has('issued_from')).toBe(false);
      expect(captured.params!.has('issued_to')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({}, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({});
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.INVOICES.ISSUERS);
      await listIssuers({}, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps items to camelCase', async () => {
      setRequest({ url: URLS.INVOICES.ISSUERS, body: { data: [RAW_ISSUER] } });
      const result = await listIssuers({});
      expect(result[0]).toEqual({ issuerNit: '1234567', issuerName: 'Empresa XYZ' });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({ url: URLS.INVOICES.ISSUERS, body: { data: [RAW_ISSUER] } });
      const result = await listIssuers({});
      expect(result[0]).not.toHaveProperty('issuer_nit');
      expect(result[0]).not.toHaveProperty('issuer_name');
    });

    test('returns empty array when there are no issuers', async () => {
      const result = await listIssuers({});
      expect(result).toEqual([]);
    });
  });
});
