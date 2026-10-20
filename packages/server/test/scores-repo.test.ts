import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.js';
import { ScoresRepo } from '../src/scores-repo.js';

function repo() {
  return new ScoresRepo(openDb(':memory:'));
}

describe('ScoresRepo', () => {
  it('ordena por puntos, luego días, luego más reciente', () => {
    const r = repo();
    r.insert({ name: 'A', days: 2, points: 500 });
    r.insert({ name: 'B', days: 1, points: 900 });
    r.insert({ name: 'C', days: 3, points: 500 });
    expect(r.top(10).map((s) => s.name)).toEqual(['B', 'C', 'A']);
  });

  it('insert devuelve la fila y su posición', () => {
    const r = repo();
    r.insert({ name: 'A', days: 2, points: 500 });
    r.insert({ name: 'B', days: 1, points: 900 });
    r.insert({ name: 'C', days: 3, points: 500 });
    const d = r.insert({ name: 'D', days: 0, points: 100 });
    expect(d.rank).toBe(4);
    expect(d.row.name).toBe('D');
    expect(d.row.id).toBeTypeOf('number');
    expect(d.row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const e = r.insert({ name: 'E', days: 5, points: 900 });
    expect(e.rank).toBe(1);
  });

  it('con empate total, la más reciente va antes', () => {
    const r = repo();
    r.insert({ name: 'A', days: 1, points: 100 });
    const b = r.insert({ name: 'B', days: 1, points: 100 });
    expect(b.rank).toBe(1);
    expect(r.top(10).map((s) => s.name)).toEqual(['B', 'A']);
  });

  it('el mismo nombre produce filas distintas', () => {
    const r = repo();
    r.insert({ name: 'Juan', days: 1, points: 100 });
    r.insert({ name: 'Juan', days: 2, points: 200 });
    expect(r.top(10)).toHaveLength(2);
  });

  it('top respeta el límite', () => {
    const r = repo();
    for (let i = 0; i < 5; i++) r.insert({ name: `P${i}`, days: i, points: i * 10 });
    expect(r.top(2)).toHaveLength(2);
    expect(r.top(2)[0].name).toBe('P4');
  });

  it('una base vacía devuelve lista vacía', () => {
    expect(repo().top(10)).toEqual([]);
  });
});
