import { describe, expect, it } from 'vitest';
import { clearWorld, makeWorld, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function playerWith(slots: (Slot | null)[], selected = 0) {
  const { world, id } = makeWorld();
  clearWorld(world);
  setInventory(world, id, slots);
  const p = world.player(id);
  p.selectedSlot = selected;
  return { world, id, p };
}

function use(world: ReturnType<typeof makeWorld>['world'], id: number) {
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

describe('comer', () => {
  it('manzana: +20 hambre, consume una, evento ate', () => {
    const { world, id, p } = playerWith([{ item: 'apple', count: 2 }]);
    p.hunger = 50;
    use(world, id);
    expect(p.hunger).toBeCloseTo(70, 0);
    expect(p.inventory[0]).toEqual({ item: 'apple', count: 1 });
    expect(world.drainEvents()).toContainEqual({ type: 'ate', playerId: id, item: 'apple' });
  });

  it('filete crudo: +15 hambre, -10 vida', () => {
    const { world, id, p } = playerWith([{ item: 'raw_steak', count: 1 }]);
    p.hunger = 50;
    use(world, id);
    expect(p.hunger).toBeCloseTo(65, 0);
    expect(p.health).toBeCloseTo(90, 0);
    expect(p.inventory[0]).toBeNull();
  });

  it('filete cocinado: +45 hambre con tope 100', () => {
    const { world, id, p } = playerWith([{ item: 'cooked_steak', count: 1 }]);
    p.hunger = 70;
    use(world, id);
    expect(p.hunger).toBeCloseTo(100, 0);
  });

  it('dos useSlot en pasos consecutivos solo comen una manzana (cooldown)', () => {
    const { world, id, p } = playerWith([{ item: 'apple', count: 4 }]);
    p.hunger = 10;
    use(world, id);
    use(world, id);
    use(world, id);
    expect(p.inventory[0]).toEqual({ item: 'apple', count: 3 });
    expect(p.hunger).toBeCloseTo(30, 0);
    world.stepSeconds(0.4);
    use(world, id);
    expect(p.inventory[0]).toEqual({ item: 'apple', count: 2 });
  });

  it('usar un pico no hace nada', () => {
    const { world, id, p } = playerWith([{ item: 'wood_pickaxe', count: 1 }]);
    p.hunger = 50;
    use(world, id);
    expect(p.hunger).toBeCloseTo(50, 0);
    expect(p.inventory[0]).toEqual({ item: 'wood_pickaxe', count: 1 });
  });

  it('usar un slot vacío no hace nada', () => {
    const { world, id, p } = playerWith([null]);
    use(world, id);
    expect(p.inventory[0]).toBeNull();
  });
});

describe('seleccionar y tirar', () => {
  it('selectSlot 7 selecciona, 9 se ignora', () => {
    const { world, id, p } = playerWith([null]);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 7 });
    world.step();
    expect(p.selectedSlot).toBe(7);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 9 });
    world.step();
    expect(p.selectedSlot).toBe(7);
  });

  it('dropSlot tira todo el slot al suelo delante del jugador durante 60 s', () => {
    const { world, id, p } = playerWith([{ item: 'wood', count: 12 }]);
    p.angle = 0;
    world.enqueue({ playerId: id, type: 'dropSlot', slot: 0 });
    world.step();
    const s = world.getState();
    expect(p.inventory[0]).toBeNull();
    expect(s.groundItems).toHaveLength(1);
    expect(s.groundItems[0].item).toBe('wood');
    expect(s.groundItems[0].count).toBe(12);
    expect(s.groundItems[0].x).toBeGreaterThan(p.x);
    expect(s.groundItems[0].expiresAt).toBeCloseTo(60, 1);
    expect(world.drainEvents()).toContainEqual({ type: 'itemDropped', playerId: id, item: 'wood', amount: 12 });
  });

  it('dropSlot de un slot vacío no hace nada', () => {
    const { world, id } = playerWith([null]);
    world.enqueue({ playerId: id, type: 'dropSlot', slot: 0 });
    world.step();
    expect(world.getState().groundItems).toHaveLength(0);
  });
});
