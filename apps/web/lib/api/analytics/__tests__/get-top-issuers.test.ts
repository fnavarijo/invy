import { describe, test, expect } from 'vitest';

import { getTopIssuers } from '../get-top-issuers';
import {
  setRequest,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_ITEM = {
  issuer_name: 'Empresa XYZ',
  issuer_nit: '1234567',
  total_received: '8000.00',
  invoice_count: 15,
};

describe('[API] getTopIssuers', () => {
  describe('filter parameters', () => {
    test('sends limit when provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_ISSUERS);
      await getTopIssuers(TEST_BATCH_ID, 10);
      expect(captured.params!.get('limit')).toBe('10');
    });

    test('omits limit when not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_ISSUERS);
      await getTopIssuers(TEST_BATCH_ID);
      expect(captured.params!.has('limit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_ISSUERS);
      await getTopIssuers(TEST_BATCH_ID, undefined, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_ISSUERS);
      await getTopIssuers(TEST_BATCH_ID);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_ISSUERS);
      await getTopIssuers(TEST_BATCH_ID, undefined, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps response to camelCase', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_ISSUERS,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopIssuers(TEST_BATCH_ID);
      expect(result.batchId).toBe(TEST_BATCH_ID);
      expect(result.data[0]).toEqual({
        issuerName: 'Empresa XYZ',
        issuerNit: '1234567',
        totalReceived: '8000.00',
        invoiceCount: 15,
      });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_ISSUERS,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopIssuers(TEST_BATCH_ID);
      expect(result).not.toHaveProperty('batch_id');
      expect(result.data[0]).not.toHaveProperty('issuer_name');
      expect(result.data[0]).not.toHaveProperty('issuer_nit');
      expect(result.data[0]).not.toHaveProperty('total_received');
      expect(result.data[0]).not.toHaveProperty('invoice_count');
    });

    test('returns empty data array when there are no issuers', async () => {
      const result = await getTopIssuers(TEST_BATCH_ID);
      expect(result.data).toEqual([]);
    });
  });
});
