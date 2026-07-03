function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

// Strict positive-integer parse — falls back to the default on any garbage
// (parseInt would turn '100mb' into 100, and NaN would poison consumers like
// BullMQ's concurrency and the byte-limit comparisons).
function optionalInt(name: string, defaultValue: number): number {
  const n = Number(process.env[name])
  return Number.isSafeInteger(n) && n > 0 ? n : defaultValue
}

export const env = {
  DATABASE_URL:                 required('DATABASE_URL'),
  REDIS_URL:                    optional('REDIS_URL', 'redis://localhost:6379'),
  SPACES_ENDPOINT:              required('SPACES_ENDPOINT'),
  SPACES_REGION:                optional('SPACES_REGION', 'us-east-1'),
  SPACES_KEY:                   required('SPACES_KEY'),
  SPACES_SECRET:                required('SPACES_SECRET'),
  SPACES_BUCKET:                required('SPACES_BUCKET'),
  WORKER_CONCURRENCY:           optionalInt('WORKER_CONCURRENCY', 1),
  MAX_XML_BYTES:                optionalInt('MAX_XML_BYTES', 1 * 1024 * 1024),
  MAX_TOTAL_DECOMPRESSED_BYTES: optionalInt('MAX_TOTAL_DECOMPRESSED_BYTES', 512 * 1024 * 1024),
  MAX_DECOMPRESSION_RATIO:      optionalInt('MAX_DECOMPRESSION_RATIO', 30),
  MAX_XML_ENTRIES:              optionalInt('MAX_XML_ENTRIES', 1000),
  CHUNK_SIZE:                   optionalInt('CHUNK_SIZE', 25),
}
