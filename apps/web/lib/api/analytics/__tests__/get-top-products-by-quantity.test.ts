import { describe, test, expect } from 'vitest';

import { getTopProductsByQuantity } from '../get-top-products-by-quantity';
import {
  setRequest,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_ITEM = { product_name: 'Consultoría', total_quantity: '42' };

describe('[API] getTopProductsByQuantity', () => {
  describe('filter parameters', () => {
    test('sends limit when provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY);
      await getTopProductsByQuantity(TEST_BATCH_ID, 10);
      expect(captured.params!.get('limit')).toBe('10');
    });

    test('omits limit when not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY);
      await getTopProductsByQuantity(TEST_BATCH_ID);
      expect(captured.params!.has('limit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY);
      await getTopProductsByQuantity(TEST_BATCH_ID, undefined, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY);
      await getTopProductsByQuantity(TEST_BATCH_ID);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY);
      await getTopProductsByQuantity(TEST_BATCH_ID, undefined, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps response to camelCase', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopProductsByQuantity(TEST_BATCH_ID);
      expect(result.batchId).toBe(TEST_BATCH_ID);
      expect(result.data[0]).toEqual({ productName: 'Consultoría', totalQuantity: '42' });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({
        url: URLS.ANALYTICS.TOP_PRODUCTS_BY_QUANTITY,
        body: { batch_id: TEST_BATCH_ID, data: [RAW_ITEM] },
      });
      const result = await getTopProductsByQuantity(TEST_BATCH_ID);
      expect(result).not.toHaveProperty('batch_id');
      expect(result.data[0]).not.toHaveProperty('product_name');
      expect(result.data[0]).not.toHaveProperty('total_quantity');
    });

    test('returns empty data array when there are no products', async () => {
      const result = await getTopProductsByQuantity(TEST_BATCH_ID);
      expect(result.data).toEqual([]);
    });
  });
});
