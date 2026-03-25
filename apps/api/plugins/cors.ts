import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export default fp(async function (fastify) {
  await fastify.register(cors, {
    // In production, replace with an explicit list of allowed origins.
    // e.g. origin: ['https://app.invy.com']
    origin: process.env.CORS_ORIGIN ?? true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
});
