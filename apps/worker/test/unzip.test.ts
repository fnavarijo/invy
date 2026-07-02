import { test } from 'node:test'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import { deflateRawSync, crc32 } from 'node:zlib'
import { streamXmlsFromZip } from '../src/unzip.ts'
import { NonRetryableError } from '../src/errors.ts'
import type { EntryLimits } from '../src/limits.ts'

// Minimal ZIP writer (DEFLATE, method 8) sufficient for unzipper to parse.
// `dataDescriptor: true` writes a streamed-ZIP entry (general-purpose bit 3):
// zeroed sizes/crc in the local header + a trailing data descriptor — the
// header shape that would blind a header-based ratio guard.
function makeZip(
  files: { name: string; data: Buffer; dataDescriptor?: boolean }[],
): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const f of files) {
    const comp = deflateRawSync(f.data)
    const crc = crc32(f.data) >>> 0
    const name = Buffer.from(f.name, 'utf8')
    const dd = f.dataDescriptor === true
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(dd ? 0x0008 : 0, 6)  // flags: bit 3 = data descriptor
    local.writeUInt16LE(8, 8)                // method: deflate
    if (!dd) {
      local.writeUInt32LE(crc, 14)
      local.writeUInt32LE(comp.length, 18)
      local.writeUInt32LE(f.data.length, 22)
    }                                        // dd: crc/sizes stay 0 in the local header
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    locals.push(local, comp)
    let entryLength = local.length + comp.length
    if (dd) {
      const desc = Buffer.alloc(16)
      desc.writeUInt32LE(0x08074b50, 0)
      desc.writeUInt32LE(crc, 4)
      desc.writeUInt32LE(comp.length, 8)
      desc.writeUInt32LE(f.data.length, 12)
      locals.push(desc)
      entryLength += desc.length
    }

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(dd ? 0x0008 : 0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comp.length, 20)
    central.writeUInt32LE(f.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += entryLength
  }
  const centralDir = Buffer.concat(centrals)
  const localDir = Buffer.concat(locals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralDir.length, 12)
  eocd.writeUInt32LE(localDir.length, 16)
  return Buffer.concat([localDir, centralDir, eocd])
}

const LIMITS: EntryLimits = {
  maxXmlBytes: 50,
  maxTotalDecompressedBytes: 10_000,
  maxDecompressionRatio: 30,
  maxEntries: 1000,
}

test('streamXmlsFromZip yields content entries for normal XML entries', async () => {
  const zip = makeZip([{ name: 'a.xml', data: Buffer.from('<a/>') }])
  const out = []
  for await (const e of streamXmlsFromZip(Readable.from(zip), LIMITS)) out.push(e)
  assert.strictEqual(out.length, 1)
  assert.strictEqual(out[0].content?.toString(), '<a/>')
})

// Oversize FIRST, valid entry SECOND — proves the guard drains the oversize
// entry without destroying the parse stream (a break/autodrain regression
// would lose ok.xml or wedge the iterator).
test('streamXmlsFromZip records an error entry for an oversize XML entry and still processes later entries', async () => {
  const zip = makeZip([
    { name: 'big.xml', data: Buffer.from('x'.repeat(200)) },
    { name: 'ok.xml', data: Buffer.from('<ok/>') },
  ])
  const out = []
  for await (const e of streamXmlsFromZip(Readable.from(zip), LIMITS)) out.push(e)
  assert.strictEqual(out.length, 2)
  assert.match(out.find((e) => e.fileName === 'big.xml')?.error ?? '', /MB limit/)
  assert.strictEqual(out.find((e) => e.fileName === 'ok.xml')?.content?.toString(), '<ok/>')
})

test('streamXmlsFromZip aborts the job when the total decompression backstop trips', async () => {
  const tight: EntryLimits = { ...LIMITS, maxXmlBytes: 10_000, maxTotalDecompressedBytes: 100 }
  const zip = makeZip([{ name: 'huge.xml', data: Buffer.from('x'.repeat(500)) }])
  await assert.rejects(async () => {
    for await (const _e of streamXmlsFromZip(Readable.from(zip), tight)) { /* drain */ }
  }, NonRetryableError)
})

// A bomb hiding in a non-.xml entry must still be budgeted: skipped entries
// drain through the same counting loop, so their decompressed bytes count.
test('streamXmlsFromZip counts skipped (non-XML) entries against the budget', async () => {
  const tight: EntryLimits = { ...LIMITS, maxTotalDecompressedBytes: 100 }
  const zip = makeZip([
    { name: 'bomb.bin', data: Buffer.alloc(500) },
    { name: 'a.xml', data: Buffer.from('<a/>') },
  ])
  await assert.rejects(async () => {
    for await (const _e of streamXmlsFromZip(Readable.from(zip), tight)) { /* drain */ }
  }, NonRetryableError)
})

// Streamed (bit-3) ZIPs declare compressedSize=0 in local headers. The ratio
// denominator comes from the source-stream byte counter, so the guard must
// still trip. 500 KB of zeros deflates to well under 1 KB → ratio >> 30x.
test('streamXmlsFromZip ratio guard still trips for data-descriptor ZIPs', async () => {
  const loose: EntryLimits = {
    ...LIMITS,
    maxXmlBytes: 10_000_000,
    maxTotalDecompressedBytes: 100_000_000,
  }
  const zip = makeZip([
    { name: 'bomb.xml', data: Buffer.alloc(500_000), dataDescriptor: true },
  ])
  await assert.rejects(async () => {
    for await (const _e of streamXmlsFromZip(Readable.from(zip), loose)) { /* drain */ }
  }, NonRetryableError)
})

test('streamXmlsFromZip enforces the entry-count cap', async () => {
  const capped: EntryLimits = { ...LIMITS, maxEntries: 1, maxXmlBytes: 10_000 }
  const zip = makeZip([
    { name: 'a.xml', data: Buffer.from('<a/>') },
    { name: 'b.xml', data: Buffer.from('<b/>') },
  ])
  await assert.rejects(async () => {
    for await (const _e of streamXmlsFromZip(Readable.from(zip), capped)) { /* drain */ }
  }, NonRetryableError)
})
