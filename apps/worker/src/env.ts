function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

export const env = {
  DATABASE_URL:       required('DATABASE_URL'),
  REDIS_URL:          optional('REDIS_URL', 'redis://localhost:6379'),
  SPACES_ENDPOINT:    required('SPACES_ENDPOINT'),
  SPACES_REGION:      optional('SPACES_REGION', 'us-east-1'),
  SPACES_KEY:         required('SPACES_KEY'),
  SPACES_SECRET:      required('SPACES_SECRET'),
  SPACES_BUCKET:      required('SPACES_BUCKET'),
  WORKER_CONCURRENCY: parseInt(optional('WORKER_CONCURRENCY', '4'), 10),
}
