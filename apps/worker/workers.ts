import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

type JobData = Record<string, string>

const connection = new IORedis({ maxRetriesPerRequest: null })

const worker = new Worker<JobData>(
  'test',
  async (job: Job<JobData>) => {
    console.log(job.data)
  },
  { connection }
)

worker.on('completed', (job: Job<JobData>) => {
  console.log(`${job.id} has completed!`)
})

worker.on('failed', (job: Job<JobData> | undefined, err: Error) => {
  console.log(`${job?.id} has failed with ${err.message}`)
})
