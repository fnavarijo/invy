import { test } from 'node:test'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import { iterateEntries } from '../src/entries.ts'
import type { EntryLimits } from '../src/limits.ts'

const LIMITS: EntryLimits = {
  maxXmlBytes: 20,
  maxTotalDecompressedBytes: 1_000_000,
  maxDecompressionRatio: 30,
  maxEntries: 1000,
}

test('iterateEntries yields a content entry for an under-limit standalone XML', async () => {
  const stream = Readable.from([Buffer.from('<xml/>')])
  const out = []
  for await (const e of iterateEntries('xml', 'a.xml', stream, LIMITS)) out.push(e)
  assert.strictEqual(out.length, 1)
  assert.strictEqual(out[0].error, undefined)
  assert.strictEqual(out[0].content?.toString(), '<xml/>')
})

test('iterateEntries yields an error entry for an over-limit standalone XML', async () => {
  const stream = Readable.from([Buffer.from('x'.repeat(50))])
  const out = []
  for await (const e of iterateEntries('xml', 'big.xml', stream, LIMITS)) out.push(e)
  assert.strictEqual(out.length, 1)
  assert.strictEqual(out[0].content, undefined)
  assert.match(out[0].error ?? '', /MB limit/)
})
