import type { FastifyInstance } from 'fastify';
import type { ScoresRepo } from '../scores-repo.js';

export const NAME_MAX = 16;
export const DAYS_MAX = 10_000;
export const POINTS_MAX = 10_000_000;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

export interface ValidScore {
  name: string;
  days: number;
  points: number;
}

/** Valida el cuerpo del POST. Devuelve el récord normalizado o un mensaje de error. */
export function validateScore(body: unknown): { ok: true; value: ValidScore } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' };
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string') return { ok: false, error: 'El nombre es obligatorio' };
  const name = b.name.trim();
  if (name.length === 0) return { ok: false, error: 'El nombre es obligatorio' };
  if ([...name].length > NAME_MAX) return { ok: false, error: `El nombre no puede superar ${NAME_MAX} caracteres` };
  const isInt = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
  if (!isInt(b.days, DAYS_MAX)) return { ok: false, error: 'Días inválidos' };
  if (!isInt(b.points, POINTS_MAX)) return { ok: false, error: 'Puntos inválidos' };
  return { ok: true, value: { name, days: b.days, points: b.points } };
}

export function parseLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return LIMIT_DEFAULT;
  return Math.min(n, LIMIT_MAX);
}

export function registerScoresRoutes(app: FastifyInstance, repo: ScoresRepo): void {
  app.get('/api/health', async () => ({ ok: true }));

  app.get<{ Querystring: { limit?: string } }>('/api/scores', async (req) => ({ scores: repo.top(parseLimit(req.query.limit)) }));

  app.post('/api/scores', async (req, reply) => {
    const v = validateScore(req.body);
    if (!v.ok) return reply.code(400).send({ error: v.error });
    const { row, rank } = repo.insert(v.value);
    return reply.code(201).send({ score: row, rank });
  });
}
