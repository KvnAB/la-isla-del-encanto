import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { ScoresRepo } from '../src/scores-repo.js';

function app(staticDir?: string) {
  const a = buildApp({ repo: new ScoresRepo(openDb(':memory:')), staticDir });
  apps.push(a);
  return a;
}
const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  for (const a of apps) await a.close();
  apps.length = 0;
});

const post = (a: ReturnType<typeof buildApp>, body: unknown) => a.inject({ method: 'POST', url: '/api/scores', payload: body });

describe('API de récords', () => {
  it('GET vacío devuelve lista vacía', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/scores' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ scores: [] });
  });

  it('POST válido devuelve 201 con la fila y el puesto', async () => {
    const a = app();
    const res = await post(a, { name: 'Ana', days: 2, points: 1240 });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.rank).toBe(1);
    expect(body.score).toMatchObject({ name: 'Ana', days: 2, points: 1240 });
    const list = await a.inject({ method: 'GET', url: '/api/scores' });
    expect(list.json().scores).toHaveLength(1);
  });

  it('recorta espacios del nombre', async () => {
    const res = await post(app(), { name: '  Ana  ', days: 1, points: 10 });
    expect(res.json().score.name).toBe('Ana');
  });

  it('rechaza nombre vacío o solo espacios', async () => {
    expect((await post(app(), { name: '   ', days: 1, points: 10 })).statusCode).toBe(400);
    expect((await post(app(), { name: '', days: 1, points: 10 })).statusCode).toBe(400);
    expect((await post(app(), { days: 1, points: 10 })).statusCode).toBe(400);
  });

  it('rechaza nombre de más de 16 caracteres', async () => {
    const res = await post(app(), { name: 'a'.repeat(17), days: 1, points: 10 });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeTypeOf('string');
    expect((await post(app(), { name: 'a'.repeat(16), days: 1, points: 10 })).statusCode).toBe(201);
  });

  it('acepta nombres con emoji y acentos dentro del límite', async () => {
    const res = await post(app(), { name: 'José 🐯', days: 1, points: 10 });
    expect(res.statusCode).toBe(201);
    expect(res.json().score.name).toBe('José 🐯');
  });

  it('rechaza puntos negativos, decimales, texto o excesivos', async () => {
    expect((await post(app(), { name: 'A', days: 1, points: -1 })).statusCode).toBe(400);
    expect((await post(app(), { name: 'A', days: 1, points: 1.5 })).statusCode).toBe(400);
    expect((await post(app(), { name: 'A', days: 1, points: '10' })).statusCode).toBe(400);
    expect((await post(app(), { name: 'A', days: 1, points: 10_000_001 })).statusCode).toBe(400);
    expect((await post(app(), { name: 'A', days: -1, points: 10 })).statusCode).toBe(400);
    expect((await post(app(), { name: 'A', days: 10001, points: 10 })).statusCode).toBe(400);
  });

  it('rechaza cuerpo que no es JSON', async () => {
    const res = await app().inject({ method: 'POST', url: '/api/scores', payload: 'hola', headers: { 'content-type': 'text/plain' } });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('limit se acota a 100 y por defecto es 20', async () => {
    const a = app();
    for (let i = 0; i < 25; i++) await post(a, { name: `P${i}`, days: 0, points: i });
    expect((await a.inject({ method: 'GET', url: '/api/scores' })).json().scores).toHaveLength(20);
    expect((await a.inject({ method: 'GET', url: '/api/scores?limit=1000' })).json().scores).toHaveLength(25);
    expect((await a.inject({ method: 'GET', url: '/api/scores?limit=3' })).json().scores).toHaveLength(3);
    expect((await a.inject({ method: 'GET', url: '/api/scores?limit=abc' })).json().scores).toHaveLength(20);
    expect((await a.inject({ method: 'GET', url: '/api/scores?limit=0' })).json().scores).toHaveLength(20);
  });

  it('GET /api/health responde ok', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/health' });
    expect(res.json()).toEqual({ ok: true });
  });

  it('sirve el cliente estático y hace fallback a index.html', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draycol-static-'));
    writeFileSync(join(dir, 'index.html'), '<h1>cliente</h1>');
    writeFileSync(join(dir, 'app.js'), 'console.log(1)');
    const a = app(dir);
    expect((await a.inject({ method: 'GET', url: '/' })).body).toContain('cliente');
    expect((await a.inject({ method: 'GET', url: '/app.js' })).body).toContain('console.log');
    expect((await a.inject({ method: 'GET', url: '/cualquier-ruta' })).body).toContain('cliente');
    expect((await a.inject({ method: 'GET', url: '/api/nada' })).statusCode).toBe(404);
  });

  it('sirve archivos creados después de arrancar y da 404 a assets inexistentes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draycol-static-'));
    writeFileSync(join(dir, 'index.html'), '<h1>cliente</h1>');
    const a = app(dir);
    await a.ready();
    writeFileSync(join(dir, 'nuevo.js'), 'console.log(2)');
    const res = await a.inject({ method: 'GET', url: '/nuevo.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('javascript');
    expect((await a.inject({ method: 'GET', url: '/assets/no-existe.js' })).statusCode).toBe(404);
  });
});
