import { describe, test, expect } from 'vitest';

import { getTopBuyers } from '../get-top-buyers';
import {
  setRequest,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_ITEM = {
  client_name: 'Cliente ABC',
  client_nit: '7654321',
  total_spent: '5000.00',
  invoice_count: 10,
};

describe('[API] getTopBuyers', () => {
  describe('filter parameters', () => {
    test('sends limit when provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_BUYERS);
      await getTopBuyers(TEST_BATCH_ID, 5);
      expect(captured.params!.get('limit')).toBe('5');
    });

    test('omits limit when not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_BUYERS);
      await getTopBuyers(TEST_BATCH_ID);
      expect(captured.params!.has('limit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_BUYERS);
      await getTopBuyers(TEST_BATCH_ID, undefined, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_BUYERS);
      await getTopBuyers(TEST_BATCH_ID);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_BUYERS);
      await getTopBuyers(TEST_BATCH_ID, undefined, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps response to camelCase', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_BUYERS,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopBuyers(TEST_BATCH_ID);
      expect(result.batchId).toBe(TEST_BATCH_ID);
      expect(result.data[0]).toEqual({
        clientName: 'Cliente ABC',
        clientNit: '7654321',
        totalSpent: '5000.00',
        invoiceCount: 10,
      });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_BUYERS,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopBuyers(TEST_BATCH_ID);
      expect(result).not.toHaveProperty('batch_id');
      expect(result.data[0]).not.toHaveProperty('client_name');
      expect(result.data[0]).not.toHaveProperty('client_nit');
      expect(result.data[0]).not.toHaveProperty('total_spent');
      expect(result.data[0]).not.toHaveProperty('invoice_count');
    });

    test('returns empty data array when there are no buyers', async () => {
      const result = await getTopBuyers(TEST_BATCH_ID);
      expect(result.data).toEqual([]);
    });
  });
});
