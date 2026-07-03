import { test } from 'node:test'
import assert from 'node:assert'
import {
  MAX_ZIP_BYTES,
  fileTooLargeMessage,
  parsePositiveInt,
} from '../../lib/limits.ts'

test('MAX_ZIP_BYTES defaults to 100 MB', () => {
  assert.strictEqual(MAX_ZIP_BYTES, 100 * 1024 * 1024)
})

test('parsePositiveInt falls back to the default on garbage', () => {
  assert.strictEqual(parsePositiveInt('42', 5), 42)
  assert.strictEqual(parsePositiveInt(undefined, 5), 5)
  assert.strictEqual(parsePositiveInt('abc', 5), 5)
  // parseInt('100mb') would be 100 — a 100-BYTE limit; Number() rejects it.
  assert.strictEqual(parsePositiveInt('100mb', 5), 5)
  assert.strictEqual(parsePositiveInt('-1', 5), 5)
  assert.strictEqual(parsePositiveInt('0', 5), 5)
  assert.strictEqual(parsePositiveInt('1.5', 5), 5)
})

test('fileTooLargeMessage derives the MB figure from bytes', () => {
  assert.strictEqual(
    fileTooLargeMessage(100 * 1024 * 1024),
    'File exceeds the 100 MB limit.',
  )
  assert.strictEqual(
    fileTooLargeMessage(1 * 1024 * 1024),
    'File exceeds the 1 MB limit.',
  )
})

test('fileTooLargeMessage defaults to MAX_ZIP_BYTES', () => {
  assert.strictEqual(fileTooLargeMessage(), 'File exceeds the 100 MB limit.')
})
