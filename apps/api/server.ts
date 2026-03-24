import Fastify from 'fastify'
import app from './app.ts'

const server = Fastify({ logger: true })
await server.register(app)

await server.listen({ port: 3000, host: '0.0.0.0' })
