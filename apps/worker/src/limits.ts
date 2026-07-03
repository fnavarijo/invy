import type { Readable } from 'node:stream'
import { FileTooLargeError, NonRetryableError } from './errors.ts'

// Shared entry types. Defined HERE (not in entries.ts) so entries.ts and
// unzip.ts can both import them without an import cycle.
export type Entry =
  | { fileName: string; content: Buffer; error?: undefined }
  | { fileName: string; content?: undefined; error: string }

export interface EntryLimits {
  maxXmlBytes: number
  maxTotalDecompressedBytes: number
  maxDecompressionRatio: number
  maxEntries: number
}

// Count bytes as chunks arrive; abort the instant the running total exceeds
// `limit`. Peak resident memory is bounded to ~limit + one chunk regardless
// of the true stream size. Destroying the stream also aborts an S3 download.
// (Safe for the standalone-XML source stream; ZIP entries must NOT be
// destroyed mid-read — see unzip.ts.)
export async function readCapped(stream: Readable, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    size += (chunk as Buffer).length
    if (size > limit) {
      stream.destroy()
      throw new FileTooLargeError(size)
    }
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

// Archive-level CPU/time guards (NOT memory guards — memory is bounded per
// entry by the capped reads). Absolute backstop catches slow/large
// legit-looking expansion; the ratio guard trips fast amplification early.
// Compressed bytes are recorded from the SOURCE stream (see unzip.ts) — never
// from local-header sizes, which data-descriptor ZIPs legitimately zero out.
export class DecompressionBudget {
  private decompressed = 0
  private compressed = 0
  private readonly maxTotalBytes: number
  private readonly maxRatio: number

  constructor(maxTotalBytes: number, maxRatio: number) {
    this.maxTotalBytes = maxTotalBytes
    this.maxRatio = maxRatio
  }

  // Record-only — never throws. Growing the denominator can only make the
  // ratio check more lenient, so no enforcement is needed here.
  addCompressed(bytes: number): void {
    this.compressed += bytes
  }

  // Record + enforce. Called for EVERY decompressed byte, including bytes
  // drained from skipped or oversize entries.
  addDecompressed(bytes: number): void {
    this.decompressed += bytes
    if (this.decompressed > this.maxTotalBytes) {
      throw new NonRetryableError(
        `Total decompressed size ${this.decompressed} exceeds ${this.maxTotalBytes} bytes`,
      )
    }
    if (this.compressed > 0 && this.decompressed > this.maxRatio * this.compressed) {
      throw new NonRetryableError(
        `Decompression ratio ${(this.decompressed / this.compressed).toFixed(1)}x exceeds ${this.maxRatio}x`,
      )
    }
  }
}
