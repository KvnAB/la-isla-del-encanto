import { describe, expect, it } from 'vitest';
import { makeWorld } from './helpers.js';

describe('ciclo día/noche', () => {
  it('empieza de día con 240 s restantes', () => {
    const { world } = makeWorld();
    const s = world.getState();
    expect(s.isNight).toBe(false);
    expect(s.day).toBe(1);
    expect(s.phaseRemaining).toBeCloseTo(240, 0);
  });

  it('pasa a noche a los 240 s', () => {
    const { world } = makeWorld();
    world.stepSeconds(239);
    expect(world.getState().isNight).toBe(false);
    expect(world.getState().day).toBe(1);
    world.stepSeconds(2);
    expect(world.getState().isNight).toBe(true);
    expect(world.getState().phaseRemaining).toBeCloseTo(239, 0);
  });

  it('a los 480 s empieza el día 2 y emite dayPassed', () => {
    const { world } = makeWorld();
    world.stepSeconds(480.5);
    const s = world.getState();
    expect(s.day).toBe(2);
    expect(s.isNight).toBe(false);
    expect(world.drainEvents()).toContainEqual({ type: 'dayPassed', day: 1 });
  });

  it('drainEvents vacía la cola', () => {
    const { world } = makeWorld();
    world.stepSeconds(480.5);
    world.drainEvents();
    expect(world.drainEvents()).toEqual([]);
  });
});

describe('nightFell', () => {
  it('emite nightFell una sola vez al pasar de día a noche', () => {
    const { world } = makeWorld();
    world.stepSeconds(239);
    world.drainEvents();
    world.stepSeconds(2);
    const ev = world.drainEvents().filter((e) => e.type === 'nightFell');
    expect(ev).toEqual([{ type: 'nightFell', day: 1 }]);
    world.stepSeconds(200);
    expect(world.drainEvents().filter((e) => e.type === 'nightFell')).toHaveLength(0);
  });

  it('cada noche emite el suyo con el día en curso', () => {
    const { world } = makeWorld();
    world.stepSeconds(721);
    const ev = world.drainEvents().filter((e) => e.type === 'nightFell');
    expect(ev).toEqual([
      { type: 'nightFell', day: 1 },
      { type: 'nightFell', day: 2 },
    ]);
  });
});
