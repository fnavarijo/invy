import fp from 'fastify-plugin';
import { createStorage } from '@invy/storage';
import type { StorageClient } from '@invy/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageClient;
  }
}

export default fp(async function (fastify) {
  const { storage, destroy } = createStorage({
    endpoint: fastify.config.SPACES_ENDPOINT,
    region: fastify.config.SPACES_REGION,
    accessKeyId: fastify.config.SPACES_KEY,
    secretAccessKey: fastify.config.SPACES_SECRET,
    bucket: fastify.config.SPACES_BUCKET,
    forcePathStyle: false,
  });

  fastify.decorate('storage', storage);

  fastify.addHook('onClose', async () => {
    destroy();
  });
});
