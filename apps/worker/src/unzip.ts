import unzipper from 'unzipper'
import { PassThrough, type Readable } from 'node:stream'
import { NonRetryableError } from './errors.ts'
import { DecompressionBudget, type Entry, type EntryLimits } from './limits.ts'

export async function* streamXmlsFromZip(
  stream: Readable,
  limits: EntryLimits,
): AsyncGenerator<Entry> {
  const budget = new DecompressionBudget(
    limits.maxTotalDecompressedBytes,
    limits.maxDecompressionRatio,
  )

  // Ratio denominator: compressed bytes actually consumed from the source.
  // Local-header sizes are untrustworthy — data-descriptor (bit-3) ZIPs
  // legitimately declare 0 there, which would leave the guard inert.
  const counter = new PassThrough()
  counter.on('data', (chunk: Buffer) => budget.addCompressed(chunk.length))
  const zip = stream.pipe(counter).pipe(unzipper.Parse({ forceStream: true }))

  let count = 0

  for await (const entry of zip) {
    const entryPath: string = entry.path
    const keep =
      !entryPath.includes('..') &&
      !entryPath.startsWith('/') &&
      entryPath.toLowerCase().endsWith('.xml')

    if (keep && count >= limits.maxEntries) {
      throw new NonRetryableError(
        `ZIP exceeds maximum entry limit of ${limits.maxEntries}`,
      )
    }
    if (keep) count++

    // Drain EVERY entry (kept, oversize, or skipped) through this one loop.
    // Never `break` and never autodrain() a partially-read entry — both
    // destroy unzipper's parse stream and lose the remaining entries. Feeding
    // every decompressed byte to the budget means a bomb hiding in a skipped
    // entry or an oversize tail still trips the guards (NonRetryableError
    // propagates out of this generator and fails the job).
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of entry) {
      const len = (chunk as Buffer).length
      budget.addDecompressed(len)
      size += len
      if (keep && size <= limits.maxXmlBytes) {
        chunks.push(chunk as Buffer)
      } else {
        // Over the cap or skipped entry: keep draining, retain nothing.
        chunks.length = 0
      }
    }

    if (!keep) continue

    if (size > limits.maxXmlBytes) {
      yield {
        fileName: entryPath,
        error: `exceeds ${Math.floor(limits.maxXmlBytes / 1024 / 1024)} MB limit`,
      }
      continue
    }

    yield { fileName: entryPath, content: Buffer.concat(chunks) }
  }
}
