import unzipper from 'unzipper'
import type { Readable } from 'node:stream'
import { NonRetryableError } from './errors.ts'

const MAX_XML_ENTRIES = parseInt(process.env['MAX_XML_ENTRIES'] ?? '1000', 10)

type XmlEntry = { fileName: string; content: Buffer }

export async function* streamXmlsFromZip(stream: Readable): AsyncGenerator<XmlEntry> {
  const zip = stream.pipe(unzipper.Parse({ forceStream: true }))
  let count = 0

  for await (const entry of zip) {
    const entryPath: string = entry.path

    if (entryPath.includes('..') || entryPath.startsWith('/')) {
      entry.autodrain()
      continue
    }

    if (!entryPath.toLowerCase().endsWith('.xml')) {
      entry.autodrain()
      continue
    }

    if (count >= MAX_XML_ENTRIES) {
      entry.autodrain()
      throw new NonRetryableError(`ZIP exceeds maximum entry limit of ${MAX_XML_ENTRIES}`)
    }

    count++
    const content = await entry.buffer()
    yield { fileName: entryPath, content }
  }
}
