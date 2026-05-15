import { describe, test, expect } from 'vitest';

import { getBatch } from '../get-batch';
import {
  setRequest,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_BATCH = {
  batch_id: TEST_BATCH_ID,
  status: 'done',
  file_type: 'xml',
  file_name: 'invoices.xml',
  created_at: '2024-01-01T00:00:00Z',
  source: 'upload',
  invoice_count: 3,
  failed_count: 1,
  errors: [{ file_name: 'bad.xml', reason: 'Invalid XML structure' }],
  completed_at: '2024-01-01T01:00:00Z',
};

describe('[API] getBatch', () => {
  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, RAW_BATCH);
      await getBatch(TEST_BATCH_ID, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, RAW_BATCH);
      await getBatch(TEST_BATCH_ID, {});
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, RAW_BATCH);
      await getBatch(TEST_BATCH_ID, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps all fields to camelCase', async () => {
      setRequest({ url: URLS.BATCHES.DETAIL, body: RAW_BATCH });
      const result = await getBatch(TEST_BATCH_ID, {});
      expect(result).toEqual({
        batchId: TEST_BATCH_ID,
        status: 'done',
        fileType: 'xml',
        fileName: 'invoices.xml',
        createdAt: '2024-01-01T00:00:00Z',
        source: 'upload',
        invoiceCount: 3,
        failedCount: 1,
        errors: [{ fileName: 'bad.xml', reason: 'Invalid XML structure' }],
        completedAt: '2024-01-01T01:00:00Z',
      });
    });

    test('does not expose snake_case keys', async () => {
      setRequest({ url: URLS.BATCHES.DETAIL, body: RAW_BATCH });
      const result = await getBatch(TEST_BATCH_ID, {});
      expect(result).not.toHaveProperty('batch_id');
      expect(result).not.toHaveProperty('file_type');
      expect(result).not.toHaveProperty('file_name');
      expect(result).not.toHaveProperty('invoice_count');
      expect(result).not.toHaveProperty('failed_count');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('completed_at');
    });

    test('maps nested error items to camelCase', async () => {
      setRequest({ url: URLS.BATCHES.DETAIL, body: RAW_BATCH });
      const result = await getBatch(TEST_BATCH_ID, {});
      expect(result.errors[0]).toEqual({ fileName: 'bad.xml', reason: 'Invalid XML structure' });
      expect(result.errors[0]).not.toHaveProperty('file_name');
    });

    test('returns empty errors array when there are none', async () => {
      const result = await getBatch(TEST_BATCH_ID, {});
      expect(result.errors).toEqual([]);
    });
  });
});
