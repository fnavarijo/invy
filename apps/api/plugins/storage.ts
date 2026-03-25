import fp from 'fastify-plugin';
import { S3Client } from '@aws-sdk/client-s3';

declare module 'fastify' {
  interface FastifyInstance {
    storage: S3Client;
  }
}

export default fp(async function (fastify) {
  const client = new S3Client({
    endpoint: fastify.config.SPACES_ENDPOINT,
    region: fastify.config.SPACES_REGION,
    credentials: {
      accessKeyId: fastify.config.SPACES_KEY,
      secretAccessKey: fastify.config.SPACES_SECRET,
    },
    forcePathStyle: false,
  });

  fastify.decorate('storage', client);

  fastify.addHook('onClose', async () => {
    client.destroy();
  });
});
