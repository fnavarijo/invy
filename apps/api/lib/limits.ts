// Strict positive-integer env parse. NOT parseInt: parseInt('100mb') === 100
// (a 100-byte ceiling), and a NaN handed to @fastify/multipart limits.fileSize
// never truncates — a typo would silently remove the upload limit.
export function parsePositiveInt(
  raw: string | undefined,
  defaultValue: number,
): number {
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : defaultValue
}

// Single upload ceiling for both ZIP and standalone XML (the API cannot see
// individual XMLs inside a ZIP, so the 1 MB per-XML rule lives in the worker).
export const MAX_ZIP_BYTES = parsePositiveInt(
  process.env['MAX_ZIP_BYTES'],
  100 * 1024 * 1024,
)

export function fileTooLargeMessage(maxBytes = MAX_ZIP_BYTES): string {
  return `File exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB limit.`
}
