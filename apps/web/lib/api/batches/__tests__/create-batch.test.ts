import { describe, test, expect, vi } from 'vitest';

import { createBatch } from '../create-batch';
import {
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

const RAW_RESPONSE = {
  batch_id: TEST_BATCH_ID,
  status: 'queued',
  file_type: 'xml',
  file_name: 'test.xml',
  created_at: '2024-01-01T00:00:00Z',
};

const makeFile = (name = 'test.xml') => new File(['<xml/>'], name, { type: 'text/xml' });

describe('[API] createBatch', () => {
  describe('request body', () => {
    test('sends file in FormData', async () => {
      const spy = vi.spyOn(FormData.prototype, 'append');
      await createBatch(makeFile('invoice.xml'));
      expect(spy).toHaveBeenCalledWith('file', expect.any(File));
      spy.mockRestore();
    });

    test('sends source when provided', async () => {
      const spy = vi.spyOn(FormData.prototype, 'append');
      await createBatch(makeFile(), 'api');
      expect(spy).toHaveBeenCalledWith('source', 'api');
      spy.mockRestore();
    });

    test('omits source when not provided', async () => {
      const spy = vi.spyOn(FormData.prototype, 'append');
      await createBatch(makeFile());
      const sourceCalls = spy.mock.calls.filter(([key]) => key === 'source');
      expect(sourceCalls).toHaveLength(0);
      spy.mockRestore();
    });

    test('omits source when empty string', async () => {
      const spy = vi.spyOn(FormData.prototype, 'append');
      await createBatch(makeFile(), '');
      const sourceCalls = spy.mock.calls.filter(([key]) => key === 'source');
      expect(sourceCalls).toHaveLength(0);
      spy.mockRestore();
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST, RAW_RESPONSE, 'POST');
      await createBatch(makeFile(), undefined, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST, RAW_RESPONSE, 'POST');
      await createBatch(makeFile());
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.BATCHES.LIST, RAW_RESPONSE, 'POST');
      await createBatch(makeFile(), undefined, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps response to camelCase', async () => {
      const result = await createBatch(makeFile());
      expect(result).toEqual({
        batchId: TEST_BATCH_ID,
        status: 'queued',
        fileType: 'xml',
        fileName: 'test.xml',
        createdAt: '2024-01-01T00:00:00Z',
      });
    });

    test('does not expose snake_case keys', async () => {
      const result = await createBatch(makeFile());
      expect(result).not.toHaveProperty('batch_id');
      expect(result).not.toHaveProperty('file_type');
      expect(result).not.toHaveProperty('file_name');
      expect(result).not.toHaveProperty('created_at');
    });
  });
});
