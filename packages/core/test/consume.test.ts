import { describe, expect, it } from 'vitest';
import { clearWorld, findLandNextTo, makeWorld, placePlayerAt, setInventory } from './helpers.js';
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
  it('selectSlot 11 selecciona, 12 se ignora', () => {
    const { world, id, p } = playerWith([null]);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 11 });
    world.step();
    expect(p.selectedSlot).toBe(11);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 12 });
    world.step();
    expect(p.selectedSlot).toBe(11);
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

describe('cantimplora', () => {
  function byWater(slot: Slot) {
    const { world, id } = makeWorld();
    clearWorld(world);
    const spot = findLandNextTo(world, 'water', 60);
    placePlayerAt(world, id, spot.x, spot.y);
    setInventory(world, id, [slot]);
    const p = world.player(id);
    p.angle = 0;
    p.selectedSlot = 0;
    return { world, id, p, spot };
  }
  function useNow(world: ReturnType<typeof makeWorld>['world'], id: number) {
    world.player(id).hitCooldown = 0;
    use(world, id);
  }

  it('llenar la cantimplora apuntando al agua', () => {
    const { world, id, p } = byWater({ item: 'canteen', count: 1 });
    useNow(world, id);
    expect(p.inventory[0]).toEqual({ item: 'canteen_full', count: 3 });
    expect(world.drainEvents()).toContainEqual({ type: 'canteenFilled', playerId: id });
  });

  it('en tierra lejos del agua no pasa nada', () => {
    const { world, id, p } = byWater({ item: 'canteen', count: 1 });
    p.angle = Math.PI;
    useNow(world, id);
    expect(p.inventory[0]).toEqual({ item: 'canteen', count: 1 });
  });

  it('beber da 40 de sed y gasta un trago; al tercero vuelve a estar vacía', () => {
    const { world, id, p } = byWater({ item: 'canteen_full', count: 3 });
    p.angle = Math.PI;
    p.thirst = 10;
    useNow(world, id);
    expect(p.thirst).toBeCloseTo(50, 0);
    expect(p.inventory[0]).toEqual({ item: 'canteen_full', count: 2 });
    useNow(world, id);
    useNow(world, id);
    expect(p.inventory[0]).toEqual({ item: 'canteen', count: 1 });
    expect(world.drainEvents().filter((e) => e.type === 'drank')).toHaveLength(3);
  });

  it('dentro del agua la llena rellena en vez de beber', () => {
    const { world, id, p, spot } = byWater({ item: 'canteen_full', count: 1 });
    placePlayerAt(world, id, spot.x + 80, spot.y);
    world.step();
    expect(p.inWater).toBe(true);
    p.thirst = 10;
    useNow(world, id);
    expect(p.inventory[0]).toEqual({ item: 'canteen_full', count: 3 });
    expect(p.thirst).toBeLessThan(100); // el agua rellena sola la sed, pero no por el trago
  });

  it('bayas y pescado como comida', () => {
    const { world, id, p } = playerWith([{ item: 'berry', count: 2 }, { item: 'cooked_fish', count: 1 }]);
    p.hunger = 50;
    useNow(world, id);
    expect(p.hunger).toBeCloseTo(60, 0);
    p.selectedSlot = 1;
    useNow(world, id);
    expect(p.hunger).toBeCloseTo(95, 0);
  });
});
