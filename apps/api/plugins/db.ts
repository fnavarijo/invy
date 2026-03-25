import fp from 'fastify-plugin'
import { createDb, type DB } from '@invy/db'

export type { DB }

declare module 'fastify' {
  interface FastifyInstance {
    db: DB
  }
}

export default fp(async function (fastify) {
  const { db, client } = createDb(fastify.config.DATABASE_URL)

  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await client.end()
  })
})
