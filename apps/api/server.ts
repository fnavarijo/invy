import Fastify from 'fastify';
import app from './app.ts';

const server = Fastify({ logger: true });
await server.register(app);

// PORT and HOST are optional — read from process.env with defaults.
// DATABASE_URL is validated inside the app by @fastify/env and will
// throw at ready() time if missing.
await server.listen({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  host: process.env['HOST'] ?? '0.0.0.0',
});
