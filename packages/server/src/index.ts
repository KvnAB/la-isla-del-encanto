import { CORE_VERSION } from '@draycol/core';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { openDb } from './db.js';
import { ScoresRepo } from './scores-repo.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const dbPath = process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'scores.db');
const staticDir = process.env.STATIC_DIR ?? resolve(here, '..', '..', 'client', 'dist');

const app = buildApp({ repo: new ScoresRepo(openDb(dbPath)), staticDir, logger: true });

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Draycol Survival (core ${CORE_VERSION}) en http://localhost:${port} — base de datos: ${dbPath}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
