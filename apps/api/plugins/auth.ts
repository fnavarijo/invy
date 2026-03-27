import fp from 'fastify-plugin';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ErrorResponse } from '../types/index.ts';

// Routes that bypass auth
const PUBLIC_ROUTES = new Set(['/']);

export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(clerkPlugin);

  // Waiting on completion of the clerkPlugin register
  await fastify.after();

  // Running it after onRequest so clerk has been loaded.
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { url } = request;
      const path = url.split('?')[0] ?? '/';

      // Browsers never send Authorization on OPTIONS preflight — skip auth
      if (request.method === 'OPTIONS' || PUBLIC_ROUTES.has(path)) {
        return;
      }

      const { isAuthenticated } = getAuth(request);

      if (!isAuthenticated) {
        const body: ErrorResponse = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not valid or active token.',
            details: {},
          },
        };
        return reply.status(401).send(body);
      }
    },
  );
});
