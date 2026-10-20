import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { registerScoresRoutes } from './routes/scores.js';
import type { ScoresRepo } from './scores-repo.js';

export interface AppOptions {
  repo: ScoresRepo;
  /** Carpeta con el cliente compilado. Si no existe, solo se sirve la API. */
  staticDir?: string;
  logger?: boolean;
}

export function buildApp(opts: AppOptions): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  registerScoresRoutes(app, opts.repo);

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.code(status).send({ error: status === 500 ? 'Error interno' : err.message });
  });

  if (opts.staticDir && existsSync(opts.staticDir)) {
    const indexPath = join(opts.staticDir, 'index.html');
    // wildcard: true sirve cualquier archivo que exista en el momento de la petición (no solo los que había al arrancar).
    app.register(fastifyStatic, { root: opts.staticDir, wildcard: true, index: ['index.html'] });
    app.setNotFoundHandler((req, reply) => {
      const path = req.url.split('?')[0];
      const looksLikeFile = /\.[a-z0-9]+$/i.test(path);
      if (path.startsWith('/api/') || req.method !== 'GET' || looksLikeFile || !existsSync(indexPath)) return reply.code(404).send({ error: 'No encontrado' });
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'No encontrado' }));
  }

  return app;
}
