import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    someSupport(): string
  }
}

export default fp(async function (fastify) {
  fastify.decorate('someSupport', function () {
    return 'hugs'
  })
})
