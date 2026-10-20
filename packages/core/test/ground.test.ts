import { describe, expect, it } from 'vitest';
import { clearWorld, makeWorld, placePlayerAt, putGroundItem, putResource, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function setup(slots: (Slot | null)[] = []) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, slots);
  const p = world.player(id);
  p.angle = 0;
  return { world, id, p };
}

function hit(world: ReturnType<typeof makeWorld>['world'], id: number) {
  world.enqueue({ playerId: id, type: 'hit' });
  world.step();
}

describe('objetos en el suelo', () => {
  it('golpear un objeto al alcance lo recoge', () => {
    const { world, id, p } = setup();
    putGroundItem(world, 'apple', 3, p.x + 50, p.y);
    hit(world, id);
    expect(p.inventory[0]).toEqual({ item: 'apple', count: 3 });
    expect(world.getState().groundItems).toHaveLength(0);
    expect(world.drainEvents()).toContainEqual({ type: 'itemPicked', playerId: id, item: 'apple', amount: 3 });
  });

  it('recoge aunque el objeto esté detrás (sin arco)', () => {
    const { world, id, p } = setup();
    putGroundItem(world, 'wood', 1, p.x - 50, p.y);
    hit(world, id);
    expect(p.inventory[0]).toEqual({ item: 'wood', count: 1 });
  });

  it('con objeto y recurso al alcance, recoge el objeto y no golpea el recurso', () => {
    const { world, id, p } = setup();
    const r = putResource(world, 'tree', 'small', p.x + 100, p.y);
    putGroundItem(world, 'stone', 2, p.x + 50, p.y);
    hit(world, id);
    expect(p.inventory[0]).toEqual({ item: 'stone', count: 2 });
    expect(r.remaining).toBe(20);
  });

  it('desaparece a los 60 s', () => {
    const { world, p } = setup();
    putGroundItem(world, 'wood', 1, p.x + 300, p.y);
    world.stepSeconds(59.9);
    expect(world.getState().groundItems).toHaveLength(1);
    world.stepSeconds(0.2);
    expect(world.getState().groundItems).toHaveLength(0);
  });

  it('inventario lleno de tipos distintos: el objeto nuevo se queda en el suelo con inventoryFull', () => {
    const { world, id, p } = setup([
      { item: 'wood', count: 1 },
      { item: 'stone', count: 1 },
      { item: 'apple', count: 1 },
      { item: 'wool', count: 1 },
      { item: 'needle', count: 1 },
      { item: 'tiger_pelt', count: 1 },
      { item: 'raw_steak', count: 1 },
      { item: 'cooked_steak', count: 1 },
    ]);
    const g = putGroundItem(world, 'campfire', 2, p.x + 50, p.y);
    hit(world, id);
    const s = world.getState();
    expect(s.groundItems).toHaveLength(1);
    expect(s.groundItems[0].count).toBe(2);
    expect(s.groundItems[0].id).toBe(g.id);
    const events = world.drainEvents();
    expect(events).toContainEqual({ type: 'inventoryFull', playerId: id });
    expect(events.some((e) => e.type === 'itemPicked')).toBe(false);
  });

  it('inventario lleno pero con el mismo tipo: sí apila', () => {
    const { world, id, p } = setup([
      { item: 'wood', count: 5 },
      { item: 'stone', count: 1 },
      { item: 'apple', count: 1 },
      { item: 'wool', count: 1 },
      { item: 'needle', count: 1 },
      { item: 'tiger_pelt', count: 1 },
      { item: 'raw_steak', count: 1 },
      { item: 'cooked_steak', count: 1 },
    ]);
    putGroundItem(world, 'wood', 7, p.x + 50, p.y);
    hit(world, id);
    expect(p.inventory[0]).toEqual({ item: 'wood', count: 12 });
    expect(world.getState().groundItems).toHaveLength(0);
  });

  it('recoger un objeto no da puntos', () => {
    const { world, id, p } = setup();
    putGroundItem(world, 'wood', 10, p.x + 50, p.y);
    hit(world, id);
    expect(p.points).toBe(0);
  });
});
