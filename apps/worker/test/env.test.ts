import { test } from 'node:test'
import assert from 'node:assert'

// env.ts calls required() at import time — satisfy those before importing.
process.env['DATABASE_URL'] ??= 'postgres://localhost:5432/invy_test'
process.env['SPACES_ENDPOINT'] ??= 'https://example.com'
process.env['SPACES_KEY'] ??= 'key'
process.env['SPACES_SECRET'] ??= 'secret'
process.env['SPACES_BUCKET'] ??= 'bucket'

// These tests assert code DEFAULTS — clear any values inherited from the
// developer's shell (e.g. WORKER_CONCURRENCY=4 from the pre-change era) so
// the assertions don't fail spuriously.
for (const name of [
  'WORKER_CONCURRENCY',
  'CHUNK_SIZE',
  'MAX_XML_BYTES',
  'MAX_TOTAL_DECOMPRESSED_BYTES',
  'MAX_DECOMPRESSION_RATIO',
  'MAX_XML_ENTRIES',
]) {
  delete process.env[name]
}

const { env } = await import('../src/env.ts')

test('worker limit defaults match the 512 MB box', () => {
  assert.strictEqual(env.WORKER_CONCURRENCY, 1)
  assert.strictEqual(env.CHUNK_SIZE, 25)
  assert.strictEqual(env.MAX_XML_BYTES, 1 * 1024 * 1024)
  assert.strictEqual(env.MAX_TOTAL_DECOMPRESSED_BYTES, 512 * 1024 * 1024)
  assert.strictEqual(env.MAX_DECOMPRESSION_RATIO, 30)
  assert.strictEqual(env.MAX_XML_ENTRIES, 1000)
})
