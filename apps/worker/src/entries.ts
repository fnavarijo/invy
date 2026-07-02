import type { Readable } from 'node:stream'
import { readCapped, type Entry, type EntryLimits } from './limits.ts'
import { FileTooLargeError } from './errors.ts'
import { streamXmlsFromZip } from './unzip.ts'

// One shared entry source for both inputs. Standalone XML is capped with
// readCapped; oversize files become an error entry (recorded as a BatchError
// upstream) rather than throwing. ZIP entries are handled by streamXmlsFromZip.
export async function* iterateEntries(
  fileType: 'xml' | 'zip',
  fileName: string,
  stream: Readable,
  limits: EntryLimits,
): AsyncGenerator<Entry> {
  if (fileType === 'xml') {
    try {
      const content = await readCapped(stream, limits.maxXmlBytes)
      yield { fileName, content }
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        yield {
          fileName,
          error: `exceeds ${Math.floor(limits.maxXmlBytes / 1024 / 1024)} MB limit`,
        }
        return
      }
      throw err
    }
  } else {
    yield* streamXmlsFromZip(stream, limits)
  }
}
