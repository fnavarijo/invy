import Fastify, { type FastifyInstance } from 'fastify'
import type { TestContext } from 'node:test'
import app from '../app.ts'

// Provide required env vars for tests. postgres.js is lazy — no actual
// connection is made unless a query is executed, so a placeholder is fine
// for tests that don't hit the database.
process.env['DATABASE_URL'] ??= 'postgres://localhost:5432/invy_test'

export function config() {
  return {}
}

export async function build(t: TestContext): Promise<FastifyInstance> {
  const fastify = Fastify()
  await fastify.register(app)
  await fastify.ready()
  t.after(() => fastify.close())
  return fastify
}
