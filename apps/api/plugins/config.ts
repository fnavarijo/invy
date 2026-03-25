import fp from 'fastify-plugin'
import env from '@fastify/env'

const schema = {
  type: 'object',
  required: ['DATABASE_URL'],
  properties: {
    DATABASE_URL: {
      type: 'string',
      description: 'PostgreSQL connection string (postgres://user:pass@host:5432/db)',
    },
    PORT: {
      type: 'string',
      default: '3000',
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
    },
  },
} as const

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string
      PORT: string
      HOST: string
    }
  }
}

export default fp(async function (fastify) {
  await fastify.register(env, { schema, dotenv: false })
})
