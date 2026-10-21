import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { World } from '../src/world.js';

describe('World', () => {
  it('crea un jugador con el objeto inicial y barras llenas en el spawn', () => {
    const w = new World(7);
    const id = w.addPlayer('Ana', 'wood_pickaxe');
    const p = w.player(id);
    expect(p.inventory).toHaveLength(12);
    expect(p.inventory[0]).toEqual({ item: 'wood_pickaxe', count: 1 });
    expect(p.inventory.slice(1).every((s) => s === null)).toBe(true);
    expect(p.selectedSlot).toBe(0);
    expect([p.health, p.hunger, p.thirst, p.warmth]).toEqual([100, 100, 100, 100]);
    expect(p.x).toBe(w.getState().map.spawnX);
    expect(p.y).toBe(w.getState().map.spawnY);
    expect(p.name).toBe('Ana');
    expect(p.alive).toBe(true);
    expect(w.getState().players).toHaveLength(1);
  });

  it('acepta espada de madera como objeto inicial', () => {
    const w = new World(7);
    const id = w.addPlayer('Bea', 'wood_sword');
    expect(w.player(id).inventory[0]).toEqual({ item: 'wood_sword', count: 1 });
  });

  it('el estado es serializable', () => {
    const w = new World(7);
    w.addPlayer('Ana', 'wood_pickaxe');
    expect(() => JSON.stringify(w.getState())).not.toThrow();
  });

  it('player() lanza si el id no existe', () => {
    const w = new World(7);
    expect(() => w.player(999)).toThrow();
  });

  it('step avanza tick y time', () => {
    const w = new World(7);
    w.step();
    w.step();
    expect(w.getState().tick).toBe(2);
    expect(w.getState().time).toBeCloseTo(2 / 30, 6);
  });
});

describe('isla fija', () => {
  it('sin semilla el mundo usa la isla de la configuración, igual en cada partida', () => {
    const a = new World();
    const b = new World();
    const c = new World(DEFAULT_CONFIG.island.seed);
    expect(a.getState().map).toEqual(b.getState().map);
    expect(a.getState().map).toEqual(c.getState().map);
    expect(a.getState().resources).toEqual(b.getState().resources);
  });
});
