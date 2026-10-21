import { describe, expect, it } from 'vitest';
import { clearWorld, makeWorld, placePlayerAt, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function setup(slots: (Slot | null)[]) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, slots);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p };
}

function placeFire(world: ReturnType<typeof makeWorld>['world'], id: number) {
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

describe('fogata', () => {
  it('useSlot con fogata la coloca delante, consume una y emite campfirePlaced', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 2 }]);
    placeFire(world, id);
    const s = world.getState();
    expect(s.campfires).toHaveLength(1);
    expect(s.campfires[0].x).toBeGreaterThan(p.x);
    expect(s.campfires[0].expiresAt).toBeCloseTo(90 + 1 / 30, 1);
    expect(p.inventory[0]).toEqual({ item: 'campfire', count: 1 });
    expect(world.drainEvents()).toContainEqual({ type: 'campfirePlaced', playerId: id, entityId: s.campfires[0].id });
  });

  it('dos useSlot en pasos consecutivos colocan una sola fogata', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 3 }]);
    placeFire(world, id);
    placeFire(world, id);
    placeFire(world, id);
    expect(world.getState().campfires).toHaveLength(1);
    expect(p.inventory[0]).toEqual({ item: 'campfire', count: 2 });
  });

  it('desaparece a los 90 s', () => {
    const { world, id } = setup([{ item: 'campfire', count: 1 }]);
    placeFire(world, id);
    world.stepSeconds(89.5);
    expect(world.getState().campfires).toHaveLength(1);
    world.stepSeconds(1);
    expect(world.getState().campfires).toHaveLength(0);
  });

  it('cerca de la fogata el frío sube 20/s', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }]);
    placeFire(world, id);
    p.warmth = 20;
    world.stepSeconds(2);
    expect(p.warmth).toBeCloseTo(60, 0);
  });

  it('cocina un filete crudo cada 4 s con +10 puntos y evento cooked', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }, { item: 'raw_steak', count: 3 }]);
    placeFire(world, id);
    world.drainEvents();
    world.stepSeconds(3.9);
    expect(p.inventory[1]).toEqual({ item: 'raw_steak', count: 3 });
    world.stepSeconds(0.2);
    expect(p.inventory[1]).toEqual({ item: 'raw_steak', count: 2 });
    expect(p.inventory.some((s) => s?.item === 'cooked_steak' && s.count === 1)).toBe(true);
    expect(p.points).toBe(10);
    expect(world.drainEvents()).toContainEqual({ type: 'cooked', playerId: id });
    world.stepSeconds(8);
    expect(p.inventory.some((s) => s?.item === 'raw_steak')).toBe(false);
    expect(p.inventory.find((s) => s?.item === 'cooked_steak')?.count).toBe(3);
    expect(p.points).toBe(30);
  });

  it('alejarse reinicia el temporizador de cocina', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }, { item: 'raw_steak', count: 1 }]);
    placeFire(world, id);
    world.stepSeconds(3);
    placePlayerAt(world, id, 1500, 1500 + 400);
    world.stepSeconds(1);
    placePlayerAt(world, id, 1500, 1500);
    world.stepSeconds(3);
    expect(p.inventory[1]).toEqual({ item: 'raw_steak', count: 1 });
    world.stepSeconds(1.1);
    expect(p.inventory[1]).toBeNull();
  });

  it('sin filetes crudos no cocina nada', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }]);
    placeFire(world, id);
    world.stepSeconds(10);
    expect(p.points).toBe(0);
  });

  it('cerca de la fogata el frío no baja aunque sea de noche', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }]);
    world.stepSeconds(240.5);
    placeFire(world, id);
    p.warmth = 100;
    world.stepSeconds(5);
    expect(p.warmth).toBe(100);
  });
});

describe('pescado en la fogata', () => {
  it('cocina pescado crudo en 4 s y da 10 puntos', () => {
    const { world, id, p } = setup([{ item: 'campfire', count: 1 }, { item: 'raw_fish', count: 1 }]);
    placeFire(world, id);
    world.drainEvents();
    world.stepSeconds(4.1);
    expect(p.inventory.some((s) => s?.item === 'raw_fish')).toBe(false);
    expect(p.inventory.some((s) => s?.item === 'cooked_fish' && s.count === 1)).toBe(true);
    expect(p.points).toBe(10);
    expect(world.drainEvents()).toContainEqual({ type: 'cooked', playerId: id });
  });
});
