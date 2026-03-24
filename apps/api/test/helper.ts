import Fastify, { type FastifyInstance } from 'fastify'
import type { TestContext } from 'node:test'
import app from '../app.ts'

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
