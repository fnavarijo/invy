import { test } from 'node:test'
import assert from 'node:assert'
import {
  PRODUCTS_LIMIT_DEFAULT,
  PRODUCTS_LIMIT_MAX,
  clampProductsLimit,
  productTotalNumFmt,
} from '../../lib/products.ts'

test('limit constants', () => {
  assert.strictEqual(PRODUCTS_LIMIT_DEFAULT, 100)
  assert.strictEqual(PRODUCTS_LIMIT_MAX, 500)
})

test('clampProductsLimit falls back to the default on missing/garbage input', () => {
  assert.strictEqual(clampProductsLimit(undefined), 100)
  assert.strictEqual(clampProductsLimit(''), 100)
  assert.strictEqual(clampProductsLimit('abc'), 100)
  assert.strictEqual(clampProductsLimit('1.5'), 100)
  assert.strictEqual(clampProductsLimit('0'), 100)
  assert.strictEqual(clampProductsLimit('-5'), 100)
  // parseInt('250mb') would be 250; Number() rejects it -> default
  assert.strictEqual(clampProductsLimit('250mb'), 100)
})

test('clampProductsLimit honors valid values and clamps to the max', () => {
  assert.strictEqual(clampProductsLimit('1'), 1)
  assert.strictEqual(clampProductsLimit('100'), 100)
  assert.strictEqual(clampProductsLimit('250'), 250)
  assert.strictEqual(clampProductsLimit('500'), 500)
  assert.strictEqual(clampProductsLimit('1000'), 500)
})

test('productTotalNumFmt maps currency to an ExcelJS number format', () => {
  assert.strictEqual(productTotalNumFmt('GTQ'), '"Q"#,##0.00')
  assert.strictEqual(productTotalNumFmt('USD'), '"$"#,##0.00')
  assert.strictEqual(productTotalNumFmt('EUR'), '#,##0.00')
})
