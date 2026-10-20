import { describe, expect, it } from 'vitest';
import { Rng } from '../src/rng.js';

describe('Rng', () => {
  it('produce la misma secuencia para la misma semilla', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const sa = [a.next(), a.next(), a.next(), a.next(), a.next()];
    const sb = [b.next(), b.next(), b.next(), b.next(), b.next()];
    expect(sa).toEqual(sb);
  });

  it('produce valores en [0,1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('semillas distintas dan secuencias distintas', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('int(1,6) solo produce enteros entre 1 y 6', () => {
    const r = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('pick devuelve un elemento del array', () => {
    const r = new Rng(9);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(r.pick(arr));
  });
});
