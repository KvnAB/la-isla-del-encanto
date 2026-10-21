import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { terrainAt } from '../src/island.js';
import { resourceAvailable, resourceCapacity, spawnResources } from '../src/systems/resources.js';
import { Rng } from '../src/rng.js';
import { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putResource, setInventory } from './helpers.js';
import type { ResourceKind, Size, Slot } from '../src/types.js';

/** Jugador en (1500,1500) apuntando a +x, con el slot 0 = tool; recurso a 60 px delante. */
function setup(tool: Slot | null, kind: ResourceKind, size: Size, remaining?: number) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [tool]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  const r = putResource(world, kind, size, 1500 + p.radius + 60 + world.cfg.resources.radius[kind][size] - 10, 1500, remaining);
  return { world, id, p, r };
}

function hit(world: World, id: number) {
  world.enqueue({ playerId: id, type: 'hit' });
  world.step();
}

const count = (world: World, id: number, item: string) =>
  world
    .player(id)
    .inventory.filter((s) => s?.item === item)
    .reduce((a, s) => a + (s?.count ?? 0), 0);

describe('golpear recursos', () => {
  it('árbol con pico de madera da 2 de madera y 2 puntos', () => {
    const { world, id, r } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small');
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(2);
    expect(r.remaining).toBe(18);
    expect(world.player(id).points).toBe(2);
    expect(world.drainEvents()).toContainEqual({ type: 'resourceHit', playerId: id, entityId: r.id, item: 'wood', amount: 2 });
  });

  it('árbol con la mano da 1, con pico de piedra 3, con espada 1', () => {
    const a = setup(null, 'tree', 'small');
    hit(a.world, a.id);
    expect(count(a.world, a.id, 'wood')).toBe(1);
    const b = setup({ item: 'stone_pickaxe', count: 1 }, 'tree', 'small');
    hit(b.world, b.id);
    expect(count(b.world, b.id, 'wood')).toBe(3);
    const c = setup({ item: 'wood_sword', count: 1 }, 'tree', 'small');
    hit(c.world, c.id);
    expect(count(c.world, c.id, 'wood')).toBe(1);
  });

  it('roca con la mano no da nada ni emite evento', () => {
    const { world, id, r } = setup(null, 'rock', 'small');
    hit(world, id);
    expect(count(world, id, 'stone')).toBe(0);
    expect(r.remaining).toBe(20);
    expect(world.drainEvents().some((e) => e.type === 'resourceHit')).toBe(false);
  });

  it('roca con pico de madera da 1, con pico de piedra 2', () => {
    const a = setup({ item: 'wood_pickaxe', count: 1 }, 'rock', 'medium');
    hit(a.world, a.id);
    expect(count(a.world, a.id, 'stone')).toBe(1);
    const b = setup({ item: 'stone_pickaxe', count: 1 }, 'rock', 'medium');
    hit(b.world, b.id);
    expect(count(b.world, b.id, 'stone')).toBe(2);
  });

  it('frutal pequeño da 3 manzanas de golpe y se rompe', () => {
    const { world, id, r } = setup(null, 'apple_tree', 'small');
    hit(world, id);
    expect(count(world, id, 'apple')).toBe(3);
    expect(r.remaining).toBe(0);
    expect(r.brokenAt).toBe(0);
    expect(world.drainEvents()).toContainEqual({ type: 'resourceBroken', entityId: r.id });
  });

  it('frutal mediano da 4, grande 6', () => {
    const m = setup(null, 'apple_tree', 'medium');
    hit(m.world, m.id);
    expect(count(m.world, m.id, 'apple')).toBe(4);
    const l = setup(null, 'apple_tree', 'large');
    hit(l.world, l.id);
    expect(count(l.world, l.id, 'apple')).toBe(6);
  });

  it('entrega solo lo que queda y se rompe', () => {
    const { world, id, r } = setup({ item: 'stone_pickaxe', count: 1 }, 'tree', 'small', 2);
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(2);
    expect(r.remaining).toBe(0);
    expect(r.brokenAt).toBe(0);
    expect(world.drainEvents()).toContainEqual({ type: 'resourceBroken', entityId: r.id });
  });

  it('roto al 50% tiene la mitad disponible y se puede golpear', () => {
    const { world, id, r } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small', 0);
    r.brokenAt = 0;
    world.stepSeconds(30);
    expect(resourceAvailable(r, world.cfg, world.getState().time)).toBe(10);
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(2);
    expect(r.remaining).toBe(8);
    expect(r.brokenAt).toBeNull();
  });

  it('roto al 0% no da nada ni emite evento', () => {
    const { world, id, r } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small', 0);
    r.brokenAt = 0;
    expect(resourceAvailable(r, world.cfg, 0)).toBe(0);
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(0);
    expect(world.drainEvents().some((e) => e.type === 'resourceHit')).toBe(false);
  });

  it('roto al 100% recupera toda la capacidad', () => {
    const { world, r } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small', 0);
    r.brokenAt = 0;
    world.stepSeconds(60);
    expect(resourceAvailable(r, world.cfg, world.getState().time)).toBe(20);
    world.stepSeconds(100);
    expect(resourceAvailable(r, world.cfg, world.getState().time)).toBe(20);
  });

  it('respeta el cooldown de golpe', () => {
    const { world, id } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small');
    world.enqueue({ playerId: id, type: 'hit' });
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(count(world, id, 'wood')).toBe(2);
    world.stepSeconds(0.2);
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(2);
    world.stepSeconds(0.3);
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(4);
  });

  it('no golpea fuera del arco de apuntado', () => {
    const { world, id, p } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small');
    p.angle = Math.PI;
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(0);
  });

  it('no golpea fuera de alcance', () => {
    const { world, id, r } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small');
    r.x += 100;
    hit(world, id);
    expect(count(world, id, 'wood')).toBe(0);
  });

  it('golpear fija swing a 1', () => {
    const { world, id, p } = setup({ item: 'wood_pickaxe', count: 1 }, 'tree', 'small');
    hit(world, id);
    expect(p.swing).toBeGreaterThan(0.9);
  });
});

describe('spawnResources', () => {
  it('coloca 132 recursos en tierra, lejos del spawn y sin solapar', () => {
    const world = new World(1);
    const s = world.getState();
    expect(s.resources.length).toBe(132);
    const kinds = { tree: 0, apple_tree: 0, rock: 0, gold_rock: 0 };
    for (const r of s.resources) {
      kinds[r.kind]++;
      expect(['land', 'sand']).toContain(terrainAt(s.map, r.x, r.y));
      expect(Math.hypot(r.x - s.map.spawnX, r.y - s.map.spawnY)).toBeGreaterThanOrEqual(200);
      expect(r.remaining).toBe(resourceCapacity(r.kind, r.size, DEFAULT_CONFIG));
    }
    expect(kinds).toEqual({ tree: 60, apple_tree: 18, rock: 40, gold_rock: 14 });
    for (let i = 0; i < s.resources.length; i++)
      for (let j = i + 1; j < s.resources.length; j++) {
        const a = s.resources[i];
        const b = s.resources[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.radius + b.radius + 20);
      }
  });

  it('usa los tres tamaños', () => {
    const world = new World(1);
    const sizes = new Set(world.getState().resources.map((r) => r.size));
    expect(sizes.size).toBe(3);
  });

  it('spawnResources es determinista', () => {
    const a = new World(3).getState().resources;
    const b = new World(3).getState().resources;
    expect(a).toEqual(b);
  });

  it('spawnResources sobre un estado vacío coloca la tanda completa', () => {
    const w = new World(3);
    w.getState().resources.length = 0;
    spawnResources(w.getState(), w.cfg, new Rng(1));
    expect(w.getState().resources.length).toBe(132);
  });
});
