import fp from 'fastify-plugin';
import env from '@fastify/env';

const schema = {
  type: 'object',
  required: ['DATABASE_URL'],
  properties: {
    DATABASE_URL: {
      type: 'string',
      description:
        'PostgreSQL connection string (postgres://user:pass@host:5432/db)',
    },
    PORT: {
      type: 'string',
      default: '3000',
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
    },
    SPACES_ENDPOINT: {
      type: 'string',
      default: '',
    },
    SPACES_REGION: {
      type: 'string',
      default: 'us-east-1',
    },
    SPACES_BUCKET: {
      type: 'string',
      default: '',
    },
    SPACES_KEY: {
      type: 'string',
      description: 'Key to connect to DO spaces',
    },
    SPACES_SECRET: {
      type: 'string',
      default: 'Secret to connect to DO spaces',
    },
  },
} as const;

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string;
      PORT: string;
      HOST: string;
      SPACES_ENDPOINT: string;
      SPACES_REGION: string;
      SPACES_BUCKET: string;
      SPACES_KEY: string;
      SPACES_SECRET: string;
    };
  }
}

export default fp(async function (fastify) {
  await fastify.register(env, { schema, dotenv: false });
});
