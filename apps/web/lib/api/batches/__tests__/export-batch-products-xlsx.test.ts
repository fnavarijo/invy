import { describe, test, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { exportBatchProductsXlsx } from '../export-batch-products-xlsx';
import {
  server,
  captureRequest,
  URLS,
  TEST_BATCH_ID,
} from '../../../../tests/http-mock-setup';

describe('[API] exportBatchProductsXlsx', () => {
  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.BATCHES.EXPORT_PRODUCTS_XLSX);
      await exportBatchProductsXlsx(TEST_BATCH_ID, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.BATCHES.EXPORT_PRODUCTS_XLSX);
      await exportBatchProductsXlsx(TEST_BATCH_ID);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.BATCHES.EXPORT_PRODUCTS_XLSX);
      await exportBatchProductsXlsx(TEST_BATCH_ID, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('returns a Blob on success', async () => {
      const result = await exportBatchProductsXlsx(TEST_BATCH_ID);
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('error handling', () => {
    test('throws ApiError with status and code on non-ok response', async () => {
      server.use(
        http.get(URLS.BATCHES.EXPORT_PRODUCTS_XLSX, () =>
          HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Batch not found' } },
            { status: 404 },
          ),
        ),
      );
      await expect(exportBatchProductsXlsx(TEST_BATCH_ID)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    });

    test('uses fallback error fields when response body lacks error object', async () => {
      server.use(
        http.get(URLS.BATCHES.EXPORT_PRODUCTS_XLSX, () => new HttpResponse(null, { status: 500 })),
      );
      await expect(exportBatchProductsXlsx(TEST_BATCH_ID)).rejects.toMatchObject({
        status: 500,
        code: 'UNKNOWN_ERROR',
      });
    });
  });
});
