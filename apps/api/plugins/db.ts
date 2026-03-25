import fp from 'fastify-plugin'
import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../db/schema.ts'

export type DB = PostgresJsDatabase<typeof schema>

declare module 'fastify' {
  interface FastifyInstance {
    db: DB
  }
}

export default fp(async function (fastify) {
  const client = postgres(fastify.config.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  })

  const db = drizzle(client, { schema })

  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await client.end()
  })
})
