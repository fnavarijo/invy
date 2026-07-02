import { test } from 'node:test'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import { deflateRawSync, crc32 } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import type { Job } from 'bullmq'
import type { StorageClient } from '@invy/storage'
import { batches, invoices, batchInvoices, type DB } from '@invy/db'
import { NonRetryableError } from '../src/errors.ts'
import type { JobPayload } from '../src/processor.ts'

// processor.ts imports env.ts eagerly (`import { env } from './env.ts'`),
// and env.ts computes its exported `env` object once at module-evaluation
// time (not via getters). So every process.env override that should affect
// `processJob`'s behavior — including the byte caps this file tunes down to
// keep fixtures small — MUST be set before the dynamic import below, the
// same pattern test/env.test.ts uses. Because `node --test` runs each test
// file in its own child process, none of this leaks into other test files.
process.env['DATABASE_URL'] ??= 'postgres://localhost:5432/invy_test'
process.env['SPACES_ENDPOINT'] ??= 'https://example.com'
process.env['SPACES_KEY'] ??= 'key'
process.env['SPACES_SECRET'] ??= 'secret'
process.env['SPACES_BUCKET'] ??= 'bucket'
process.env['MAX_XML_BYTES'] = '1500'
process.env['MAX_TOTAL_DECOMPRESSED_BYTES'] = '6000'

const { processJob } = await import('../src/processor.ts')

// Minimal ZIP writer (DEFLATE, method 8) sufficient for `unzipper` to parse.
// Adapted from the hand-rolled helper in test/unzip.test.ts (trimmed of the
// data-descriptor variant, which this test doesn't need).
function makeZip(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const f of files) {
    const comp = deflateRawSync(f.data)
    const crc = crc32(f.data) >>> 0
    const name = Buffer.from(f.name, 'utf8')
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comp.length, 18)
    local.writeUInt32LE(f.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    locals.push(local, comp)
    const entryLength = local.length + comp.length

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
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

const VALID_DTE = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0">
  <dte:SAT>
    <dte:DTE>
      <dte:DatosEmision>
        <dte:DatosGenerales Tipo="FACT" CodigoMoneda="GTQ" FechaHoraEmision="2024-01-15T10:00:00-06:00"/>
        <dte:Emisor NombreComercial="Tienda Ejemplo" NombreEmisor="Tienda Ejemplo SA" NITEmisor="1234567"/>
        <dte:Receptor NombreReceptor="Cliente Ejemplo" IDReceptor="7654321"/>
        <dte:Items>
          <dte:Item BienOServicio="B">
            <dte:Descripcion>Producto A</dte:Descripcion>
            <dte:Cantidad>2</dte:Cantidad>
            <dte:PrecioUnitario>50.00</dte:PrecioUnitario>
            <dte:Total>100.00</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:GranTotal>100.00</dte:GranTotal>
        </dte:Totales>
      </dte:DatosEmision>
      <dte:Certificacion>
        <dte:NumeroAutorizacion>AUTH-123</dte:NumeroAutorizacion>
      </dte:Certificacion>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`

// Well-formed XML (passes the syntax check) but missing the required SAT
// DTE structure — exercises validateXsd's structural-check failure path,
// distinct from the entries.ts oversize path.
const MALFORMED_XML = `<root><child>x</child></root>`

type UpdateBatchesCall = { set: Record<string, any>; returning: boolean }

// Hand-rolled fake DB implementing exactly the chainable calls processor.ts
// makes: update(batches).set().where()[.returning()], insert(invoices |
// batchInvoices).values().onConflictDoNothing(), and
// select().from(invoices).where(). It records every update(batches) call so
// tests can assert on the final status/invoice_count/errors payload, and
// tracks inserted invoice rows so the select() lookup inside flushChunk can
// resolve invoice_ids by invoice_number (a real Drizzle inArray() filter is
// not evaluated — since each test flushes at most one chunk, returning
// every tracked row is equivalent for these scenarios).
function makeFakeDb(batchRow: Record<string, unknown>) {
  const updateBatchesCalls: UpdateBatchesCall[] = []
  const insertInvoiceRows: Record<string, any>[] = []
  const insertBatchInvoiceRows: Record<string, any>[] = []
  const invoiceIdByNumber = new Map<string, string>()

  function updateWhereResult(set: Record<string, any>) {
    return {
      returning(_selection: unknown) {
        updateBatchesCalls.push({ set, returning: true })
        return Promise.resolve([batchRow])
      },
      then(onFulfilled: (v: undefined) => unknown, onRejected: (e: unknown) => unknown) {
        updateBatchesCalls.push({ set, returning: false })
        return Promise.resolve(undefined).then(onFulfilled, onRejected)
      },
    }
  }

  const fakeDb = {
    update(table: unknown) {
      assert.strictEqual(table, batches, 'processor.ts only updates the batches table')
      return {
        set(set: Record<string, any>) {
          return {
            where(_whereArg: unknown) {
              return updateWhereResult(set)
            },
          }
        },
      }
    },
    insert(table: unknown) {
      if (table === invoices) {
        return {
          values(rows: Record<string, any>[]) {
            insertInvoiceRows.push(...rows)
            for (const row of rows) {
              invoiceIdByNumber.set(row['invoice_number'], row['invoice_id'])
            }
            return { onConflictDoNothing: () => Promise.resolve() }
          },
        }
      }
      if (table === batchInvoices) {
        return {
          values(rows: Record<string, any>[]) {
            insertBatchInvoiceRows.push(...rows)
            return { onConflictDoNothing: () => Promise.resolve() }
          },
        }
      }
      throw new Error('unexpected insert() table in fake DB')
    },
    select(_selection: unknown) {
      return {
        from(table: unknown) {
          assert.strictEqual(table, invoices, 'processor.ts only selects from the invoices table')
          return {
            where(_whereArg: unknown) {
              return Promise.resolve(
                Array.from(invoiceIdByNumber.entries()).map(([invoice_number, invoice_id]) => ({
                  invoice_id,
                  invoice_number,
                })),
              )
            },
          }
        },
      }
    },
  }

  return {
    db: fakeDb as unknown as DB,
    updateBatchesCalls,
    insertInvoiceRows,
    insertBatchInvoiceRows,
  }
}

function makeFakeStorage(zipBuffer: Buffer): StorageClient {
  return {
    createUpload(_options) {
      throw new Error('createUpload is not used by processJob')
    },
    async delete(_key) {},
    async getStream(_key) {
      return Readable.from(zipBuffer)
    },
  }
}

function makeFakeJob(batchId: string, fileKey: string): Job<JobPayload> {
  return {
    data: { batchId, fileKey },
    extendLock: async (_token?: string, _duration?: number) => {},
  } as unknown as Job<JobPayload>
}

test('processJob records per-file errors for oversize/malformed entries but completes the batch as done', async () => {
  const zip = makeZip([
    { name: 'oversize.xml', data: randomBytes(2000) }, // > MAX_XML_BYTES (1500) — entries.ts error path
    { name: 'valid.xml', data: Buffer.from(VALID_DTE) }, // succeeds end-to-end
    { name: 'malformed.xml', data: Buffer.from(MALFORMED_XML) }, // validateXsd structural-check failure path
  ])

  const batchRow = {
    batch_id: 'batch_1',
    file_type: 'zip',
    file_name: 'invoices.zip',
    user_id: 'user_1',
  }

  const { db, updateBatchesCalls, insertInvoiceRows, insertBatchInvoiceRows } = makeFakeDb(batchRow)
  const storage = makeFakeStorage(zip)
  const job = makeFakeJob('batch_1', 'batches/batch_1/invoices.zip')

  await processJob(job, db, storage)

  // The whole job must NOT be marked failed — per-file errors are recorded,
  // not escalated to a whole-job failure.
  assert.ok(
    !updateBatchesCalls.some((c) => c.set['status'] === 'failed'),
    'batches must never be marked failed for per-file errors',
  )

  const doneCalls = updateBatchesCalls.filter((c) => c.set['status'] === 'done')
  assert.strictEqual(doneCalls.length, 1, 'exactly one update(batches) call sets status: done')
  const finalSet = doneCalls[0]!.set

  assert.strictEqual(finalSet['invoice_count'], 1)
  assert.strictEqual(finalSet['failed_count'], 2)

  const errors: Array<{ file_name: string; reason: string }> = finalSet['errors']
  assert.strictEqual(errors.length, 2)

  const oversizeError = errors.find((e) => e.file_name === 'oversize.xml')
  assert.ok(oversizeError, 'oversize.xml must be recorded in errors[]')
  assert.match(oversizeError!.reason, /MB limit/)

  const malformedError = errors.find((e) => e.file_name === 'malformed.xml')
  assert.ok(malformedError, 'malformed.xml must be recorded in errors[]')
  assert.match(malformedError!.reason, /SAT DTE structure/)

  // Exactly one invoice row was written, and it reflects the valid fixture.
  assert.strictEqual(insertInvoiceRows.length, 1)
  const invoiceRow = insertInvoiceRows[0]!
  assert.strictEqual(invoiceRow['invoice_number'], 'AUTH-123')
  assert.strictEqual(invoiceRow['type'], 'FACT')
  assert.strictEqual(invoiceRow['currency'], 'GTQ')
  assert.strictEqual(invoiceRow['issuer_nit'], '1234567')
  assert.strictEqual(invoiceRow['client_nit'], '7654321')

  // Its batch_invoices link row was written with the right source_file.
  assert.strictEqual(insertBatchInvoiceRows.length, 1)
  assert.strictEqual(insertBatchInvoiceRows[0]!['source_file'], 'valid.xml')
})

test('processJob fails the whole batch (not per-file) when the decompression backstop trips', async () => {
  // A single entry whose decompressed size alone exceeds
  // MAX_TOTAL_DECOMPRESSED_BYTES (6000) trips DecompressionBudget's absolute
  // backstop inside streamXmlsFromZip, which throws NonRetryableError. This
  // is the "fail whole job" branch, distinct from the per-file error branch
  // exercised above.
  const zip = makeZip([{ name: 'bomb.xml', data: Buffer.alloc(8000, 'x') }])

  const batchRow = {
    batch_id: 'batch_2',
    file_type: 'zip',
    file_name: 'bomb.zip',
    user_id: 'user_1',
  }

  const { db, updateBatchesCalls } = makeFakeDb(batchRow)
  const storage = makeFakeStorage(zip)
  const job = makeFakeJob('batch_2', 'batches/batch_2/bomb.zip')

  await assert.rejects(() => processJob(job, db, storage), NonRetryableError)

  assert.ok(
    updateBatchesCalls.some((c) => c.set['status'] === 'failed'),
    'batches must be marked failed when the whole job aborts',
  )
  assert.ok(
    !updateBatchesCalls.some((c) => c.set['status'] === 'done'),
    'batches must never reach done when the job aborts',
  )
})
