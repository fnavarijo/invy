import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ErrorResponse } from '../types/index.ts';

// Routes that bypass auth
const PUBLIC_ROUTES = new Set(['/']);

export default fp(async function (fastify: FastifyInstance) {
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { url } = request;

      // Strip query string for matching
      const path = url.split('?')[0] ?? '/';

      // Browsers never send Authorization on OPTIONS preflight — skip auth
      if (request.method === 'OPTIONS' || PUBLIC_ROUTES.has(path)) {
        return;
      }

      const authHeader = request.headers['authorization'];

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const body: ErrorResponse = {
          error: {
            code: 'UNAUTHORIZED',
            message:
              'Missing or malformed Authorization header. Expected: Bearer <token>',
            details: {},
          },
        };
        return reply.status(401).send(body);
      }

      const token = authHeader.slice('Bearer '.length).trim();

      if (!token) {
        const body: ErrorResponse = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Bearer token must not be empty.',
            details: {},
          },
        };
        return reply.status(401).send(body);
      }

      // Stub: accept any non-empty token
      request.log.info({ token }, 'auth: token accepted (stub)');
    },
  );
});
