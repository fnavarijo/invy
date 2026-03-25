import { Worker, type Job } from 'bullmq'
import { connection } from './redis.ts'
import { processJob, type JobPayload } from './processor.ts'
import { createDb, batches } from '@invy/db'
import { createStorage } from '@invy/storage'
import { eq } from 'drizzle-orm'
import { NonRetryableError } from './errors.ts'
import { env } from './env.ts'

function isExhausted(job: Job): boolean {
  return job.attemptsMade >= (job.opts.attempts ?? 1)
}

// DB — worker uses a smaller pool than the API (max 5) to share headroom
const { db, client: dbClient } = createDb(env.DATABASE_URL, { max: 5 })

// Storage — instantiated once, shared across all concurrent jobs
const { storage, destroy: destroyStorage } = createStorage({
  endpoint:        env.SPACES_ENDPOINT,
  region:          env.SPACES_REGION,
  accessKeyId:     env.SPACES_KEY,
  secretAccessKey: env.SPACES_SECRET,
  bucket:          env.SPACES_BUCKET,
  forcePathStyle:  false,
})

const worker = new Worker<JobPayload>(
  'invoice-processing',
  (job) => processJob(job, db, storage),
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 60_000,
  },
)

worker.on('failed', async (job: Job<JobPayload> | undefined, err: Error) => {
  // NonRetryableError already stamped the batch inside processJob before throwing.
  // Only handle exhausted-retry jobs here.
  console.error({ jobId: job?.id, batchId: job?.data?.batchId, err })

  if (job && !(err instanceof NonRetryableError) && isExhausted(job)) {
    await db
      .update(batches)
      .set({ status: 'failed', completed_at: new Date() })
      .where(eq(batches.batch_id, job.data.batchId))
  }
})

// Graceful shutdown: drain in-flight jobs before closing connections
process.on('SIGTERM', async () => {
  await worker.close()   // wait for all in-flight processJob calls to finish
  await dbClient.end()
  destroyStorage()
  process.exit(0)
})
