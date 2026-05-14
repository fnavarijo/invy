import { describe, test, expect } from 'vitest';

import { getInvoiceProducts } from '../invoices/get-invoice-products';
import { setRequest, captureRequest, URLS } from '../../../tests/http-mock-setup';

const BASE_PARAMS = { issuedFrom: '2024-01-01', issuedTo: '2024-01-31', currency: 'GTQ' };

const RAW_RESPONSE = {
  currency: 'GTQ',
  invoices_total: '5000.00',
  products_total: '4800.00',
  products: [
    { name: 'Servicio de consultoría', type: 'S', total_quantity: '3', product_total: '4800.00' },
  ],
};

describe('[API] getInvoiceProducts', () => {
  describe('filter parameters', () => {
    test('sends issuedFrom as issued_from', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS);
      expect(captured.params!.get('issued_from')).toBe('2024-01-01');
    });

    test('sends issuedTo as issued_to', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS);
      expect(captured.params!.get('issued_to')).toBe('2024-01-31');
    });

    test('sends currency', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS);
      expect(captured.params!.get('currency')).toBe('GTQ');
    });

    test('sends issuerNit as issuer_nit when provided', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts({ ...BASE_PARAMS, issuerNit: '1234567' });
      expect(captured.params!.get('issuer_nit')).toBe('1234567');
    });

    test('sends clientNit as client_nit when provided', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts({ ...BASE_PARAMS, clientNit: '7654321' });
      expect(captured.params!.get('client_nit')).toBe('7654321');
    });

    test('omits issuer_nit and client_nit when not provided', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS);
      expect(captured.params!.has('issuer_nit')).toBe(false);
      expect(captured.params!.has('client_nit')).toBe(false);
    });
  });

  describe('auth token', () => {
    test('sends Authorization header when authToken is provided', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS, { authToken: 'test-token' });
      expect(captured.headers!.get('Authorization')).toBe('Bearer test-token');
    });

    test('omits Authorization header when authToken is not provided', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS);
      expect(captured.headers!.get('Authorization')).toBeNull();
    });

    test('omits Authorization header when authToken is null', async () => {
      const captured = captureRequest(URLS.INVOICES.PRODUCTS, { currency: 'GTQ', invoices_total: '0', products_total: '0', products: [] });
      await getInvoiceProducts(BASE_PARAMS, { authToken: null });
      expect(captured.headers!.get('Authorization')).toBeNull();
    });
  });

  describe('return value', () => {
    test('maps response fields to camelCase', async () => {
      setRequest({ url: URLS.INVOICES.PRODUCTS, body: RAW_RESPONSE });
      const result = await getInvoiceProducts(BASE_PARAMS);
      expect(result.invoicesTotal).toBe('5000.00');
      expect(result.productsTotal).toBe('4800.00');
      expect(result.currency).toBe('GTQ');
    });

    test('maps product item fields to camelCase', async () => {
      setRequest({ url: URLS.INVOICES.PRODUCTS, body: RAW_RESPONSE });
      const result = await getInvoiceProducts(BASE_PARAMS);
      expect(result.products[0]).toEqual({
        name: 'Servicio de consultoría',
        type: 'S',
        totalQuantity: '3',
        productTotal: '4800.00',
      });
    });

    test('does not expose snake_case keys on response', async () => {
      setRequest({ url: URLS.INVOICES.PRODUCTS, body: RAW_RESPONSE });
      const result = await getInvoiceProducts(BASE_PARAMS);
      expect(result).not.toHaveProperty('invoices_total');
      expect(result).not.toHaveProperty('products_total');
    });

    test('does not expose snake_case keys on product items', async () => {
      setRequest({ url: URLS.INVOICES.PRODUCTS, body: RAW_RESPONSE });
      const result = await getInvoiceProducts(BASE_PARAMS);
      expect(result.products[0]).not.toHaveProperty('total_quantity');
      expect(result.products[0]).not.toHaveProperty('product_total');
    });
  });
});
