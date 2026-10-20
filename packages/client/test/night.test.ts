import { describe, expect, it } from 'vitest';
import { nightAmount } from '../src/render/night';

const DAY = 240;

describe('nightAmount', () => {
  it('al empezar la partida (día 1, segundo 0) no hay oscuridad', () => {
    expect(nightAmount(false, DAY, DAY, 1)).toBe(0);
    expect(nightAmount(false, DAY - 5, DAY, 1)).toBe(0);
  });

  it('a mitad del día es 0', () => {
    expect(nightAmount(false, 120, DAY, 1)).toBe(0);
    expect(nightAmount(false, 120, DAY, 3)).toBe(0);
  });

  it('sube de 0 a 1 en los últimos 20 s del día', () => {
    expect(nightAmount(false, 20, DAY, 1)).toBeCloseTo(0, 5);
    expect(nightAmount(false, 10, DAY, 1)).toBeCloseTo(0.5, 5);
    expect(nightAmount(false, 0.5, DAY, 1)).toBeGreaterThan(0.9);
  });

  it('de noche es 1', () => {
    expect(nightAmount(true, 240, DAY, 1)).toBe(1);
    expect(nightAmount(true, 1, DAY, 1)).toBe(1);
  });

  it('en los primeros 20 s del día 2 baja de 1 a 0', () => {
    expect(nightAmount(false, DAY, DAY, 2)).toBeCloseTo(1, 5);
    expect(nightAmount(false, DAY - 10, DAY, 2)).toBeCloseTo(0.5, 5);
    expect(nightAmount(false, DAY - 20, DAY, 2)).toBeCloseTo(0, 5);
  });
});
