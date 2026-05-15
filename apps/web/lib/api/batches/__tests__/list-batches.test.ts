import { describe, test, expect } from 'vitest';

import { listBatches } from '../list-batches';
import {
  setRequest,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_ITEM = {
  batch_id: TEST_BATCH_ID,
  status: 'done',
  file_type: 'xml',
  file_name: 'test.xml',
  source: null,
  invoice_count: 5,
  failed_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T01:00:00Z',
};

describe('[API] listBatches', () => {
  describe('filter parameters', () => {
    test('sends cursor when provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST);
      await listBatches({}, 'cursor-abc');
      expect(captured.params!.get('cursor')).toBe('cursor-abc');
    });

    test('omits cursor when not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST);
      await listBatches({});
      expect(captured.params!.has('cursor')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST);
      await listBatches({ authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST);
      await listBatches({});
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST);
      await listBatches({ authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps item fields to camelCase', async () => {
      setRequest({ url: URLS.BATCHES.LIST, body: { data: [RAW_ITEM], next_cursor: null } });
      const result = await listBatches({});
      expect(result.data[0]).toEqual({
        batchId: TEST_BATCH_ID,
        status: 'done',
        fileType: 'xml',
        fileName: 'test.xml',
        source: null,
        invoiceCount: 5,
        failedCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T01:00:00Z',
      });
    });

    test('does not expose snake_case keys on items', async () => {
      setRequest({ url: URLS.BATCHES.LIST, body: { data: [RAW_ITEM], next_cursor: null } });
      const result = await listBatches({});
      const item = result.data[0];
      expect(item).not.toHaveProperty('batch_id');
      expect(item).not.toHaveProperty('file_type');
      expect(item).not.toHaveProperty('file_name');
      expect(item).not.toHaveProperty('invoice_count');
      expect(item).not.toHaveProperty('failed_count');
      expect(item).not.toHaveProperty('created_at');
      expect(item).not.toHaveProperty('completed_at');
    });

    test('maps next_cursor to nextCursor', async () => {
      setRequest({ url: URLS.BATCHES.LIST, body: { data: [], next_cursor: 'cursor-xyz' } });
      const result = await listBatches({});
      expect(result.nextCursor).toBe('cursor-xyz');
      expect(result).not.toHaveProperty('next_cursor');
    });

    test('nextCursor is null when there are no more pages', async () => {
      const result = await listBatches({});
      expect(result.nextCursor).toBeNull();
    });
  });
});
