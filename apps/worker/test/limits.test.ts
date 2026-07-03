import { test } from 'node:test'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import { readCapped, DecompressionBudget } from '../src/limits.ts'
import { FileTooLargeError, NonRetryableError } from '../src/errors.ts'

test('readCapped returns the full buffer when under the limit', async () => {
  const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')])
  const buf = await readCapped(stream, 100)
  assert.strictEqual(buf.toString(), 'hello world')
})

test('readCapped throws FileTooLargeError and destroys the stream over the limit', async () => {
  const stream = Readable.from([Buffer.from('a'.repeat(20))])
  await assert.rejects(() => readCapped(stream, 10), FileTooLargeError)
  assert.strictEqual(stream.destroyed, true)
})

test('DecompressionBudget trips the absolute backstop', () => {
  const budget = new DecompressionBudget(100, 1000)
  budget.addDecompressed(60)
  assert.throws(() => budget.addDecompressed(50), NonRetryableError)
})

test('DecompressionBudget trips the expansion-ratio guard', () => {
  const budget = new DecompressionBudget(1_000_000, 30)
  budget.addCompressed(10)
  // 10 compressed bytes -> 400 decompressed = 40x > 30x
  assert.throws(() => budget.addDecompressed(400), NonRetryableError)
})

test('DecompressionBudget allows legitimate ~10x expansion', () => {
  const budget = new DecompressionBudget(1_000_000, 30)
  budget.addCompressed(10)
  assert.doesNotThrow(() => budget.addDecompressed(100))
})

test('DecompressionBudget.addCompressed never throws', () => {
  const budget = new DecompressionBudget(100, 30)
  assert.doesNotThrow(() => budget.addCompressed(1_000_000))
})
