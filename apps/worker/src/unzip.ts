import unzipper from 'unzipper'
import type { Readable } from 'node:stream'
import { NonRetryableError } from './errors.ts'

const MAX_XML_ENTRIES = parseInt(process.env['MAX_XML_ENTRIES'] ?? '1000', 10)

type XmlEntry = { fileName: string; content: Buffer }

export async function extractXmlsFromZip(stream: Readable): Promise<XmlEntry[]> {
  const results: XmlEntry[] = []
  const zip = stream.pipe(unzipper.Parse({ forceStream: true }))

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

    if (results.length >= MAX_XML_ENTRIES) {
      entry.autodrain()
      throw new NonRetryableError(`ZIP exceeds maximum entry limit of ${MAX_XML_ENTRIES}`)
    }

    const content = await entry.buffer()
    results.push({ fileName: entryPath, content })
  }

  return results
}
