import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export type QueuePayload = { batchId: string; fileKey: string };

declare module 'fastify' {
  interface FastifyInstance {
    queue: Queue<QueuePayload>;
  }
}

export default fp(async function (fastify) {
  const redis = new IORedis(fastify.config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue<QueuePayload>('invoice-processing', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 86_400 },
      removeOnFail: { age: 604_800 },
    },
  });

  fastify.decorate('queue', queue);

  fastify.addHook('onClose', async () => {
    await queue.close();
    await redis.quit();
  });
});
