import { test } from 'node:test'
import assert from 'node:assert'
import Fastify from 'fastify'
import Support from '../../plugins/support.ts'

test('support works standalone', async (t) => {
  const fastify = Fastify()
  fastify.register(Support)
  await fastify.ready()
  assert.equal(fastify.someSupport(), 'hugs')
})
