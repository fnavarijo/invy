import { describe, test, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { deleteBatch } from '../delete-batch';
import {
  server,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

describe('[API] deleteBatch', () => {
  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, {}, 'DELETE');
      await deleteBatch(TEST_BATCH_ID, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, {}, 'DELETE');
      await deleteBatch(TEST_BATCH_ID);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.BATCHES.DETAIL, {}, 'DELETE');
      await deleteBatch(TEST_BATCH_ID, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('error handling', () => {
    test('throws ApiError with status and code on non-ok response', async () => {
      server.use(
        http.delete(URLS.BATCHES.DETAIL, () =>
          HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Batch not found' } },
            { status: 404 },
          ),
        ),
      );
      await expect(deleteBatch(TEST_BATCH_ID)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    });

    test('uses fallback error fields when response body lacks error object', async () => {
      server.use(
        http.delete(URLS.BATCHES.DETAIL, () => new HttpResponse(null, { status: 500 })),
      );
      await expect(deleteBatch(TEST_BATCH_ID)).rejects.toMatchObject({
        status: 500,
        code: 'UNKNOWN_ERROR',
      });
    });
  });

  describe('success', () => {
    test('resolves without a value on 204', async () => {
      const result = await deleteBatch(TEST_BATCH_ID);
      expect(result).toBeUndefined();
    });
  });
});
