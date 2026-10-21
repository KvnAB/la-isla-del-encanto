import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';
import { availableRecipes, craft } from '../src/systems/crafting.js';
import { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putResource, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function setup(tool: Slot | null) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [tool]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  const r = putResource(world, 'gold_rock', 'medium', 1500 + p.radius + 60 + world.cfg.resources.radius.gold_rock.medium - 10, 1500);
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

describe('oro', () => {
  it('la roca de oro con pico de piedra da 1 de oro por golpe', () => {
    const { world, id, r } = setup({ item: 'stone_pickaxe', count: 1 });
    hit(world, id);
    expect(count(world, id, 'gold')).toBe(1);
    expect(r.remaining).toBe(DEFAULT_CONFIG.resources.goldCapacity.medium - 1);
    expect(world.drainEvents()).toContainEqual({ type: 'resourceHit', playerId: id, entityId: r.id, item: 'gold', amount: 1 });
  });

  it('con pico de madera o la mano no da nada ni emite evento', () => {
    for (const tool of [{ item: 'wood_pickaxe' as const, count: 1 }, null]) {
      const { world, id, r } = setup(tool);
      hit(world, id);
      expect(count(world, id, 'gold')).toBe(0);
      expect(r.remaining).toBe(DEFAULT_CONFIG.resources.goldCapacity.medium);
      expect(world.drainEvents().some((e) => e.type === 'resourceHit')).toBe(false);
    }
  });

  it('el pico de oro saca 2 de oro, 4 de madera y 3 de piedra', () => {
    const { world, id } = setup({ item: 'gold_pickaxe', count: 1 });
    hit(world, id);
    expect(count(world, id, 'gold')).toBe(2);
    expect(DEFAULT_CONFIG.resources.woodPerHit.gold_pickaxe).toBe(4);
    expect(DEFAULT_CONFIG.resources.stonePerHit.gold_pickaxe).toBe(3);
  });

  it('la isla fija tiene rocas de oro', () => {
    const w = new World();
    expect(w.getState().resources.filter((r) => r.kind === 'gold_rock').length).toBe(DEFAULT_CONFIG.resources.counts.gold_rock);
  });
});

describe('pico de oro', () => {
  it('requiere pico de piedra, 20 oro, 10 piedra y 30 madera', () => {
    const { world, id } = makeWorld();
    setInventory(world, id, [{ item: 'stone_pickaxe', count: 1 }, { item: 'gold', count: 20 }, { item: 'stone', count: 10 }, { item: 'wood', count: 30 }]);
    const p = world.player(id);
    expect(availableRecipes(p.inventory, world.cfg)).toContain('gold_pickaxe');
    expect(craft(p, 'gold_pickaxe', world.cfg, [])).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'gold_pickaxe', count: 1 });
    expect(p.inventory.slice(1).every((s) => s === null)).toBe(true);
  });

  it('no está disponible sin pico de piedra o con 19 de oro', () => {
    const { world, id } = makeWorld();
    setInventory(world, id, [{ item: 'wood_pickaxe', count: 1 }, { item: 'gold', count: 20 }, { item: 'stone', count: 10 }, { item: 'wood', count: 30 }]);
    expect(availableRecipes(world.player(id).inventory, world.cfg)).not.toContain('gold_pickaxe');
    setInventory(world, id, [{ item: 'stone_pickaxe', count: 1 }, { item: 'gold', count: 19 }, { item: 'stone', count: 10 }, { item: 'wood', count: 30 }]);
    expect(availableRecipes(world.player(id).inventory, world.cfg)).not.toContain('gold_pickaxe');
  });
});

describe('espada de oro', () => {
  it('requiere espada de piedra, 20 oro, 30 piedra y 60 madera, la sustituye en su slot y da 200 puntos', () => {
    const { world, id } = makeWorld();
    setInventory(world, id, [{ item: 'stone_sword', count: 1 }, { item: 'gold', count: 20 }, { item: 'stone', count: 30 }, { item: 'wood', count: 60 }]);
    const p = world.player(id);
    const before = p.points;
    expect(availableRecipes(p.inventory, world.cfg)).toContain('gold_sword');
    expect(craft(p, 'gold_sword', world.cfg, [])).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'gold_sword', count: 1 });
    expect(p.inventory.slice(1).every((s) => s === null)).toBe(true);
    expect(p.points - before).toBe(200);
  });

  it('no está disponible sin espada de piedra o con 19 de oro', () => {
    const { world, id } = makeWorld();
    setInventory(world, id, [{ item: 'wood_sword', count: 1 }, { item: 'gold', count: 20 }, { item: 'stone', count: 30 }, { item: 'wood', count: 60 }]);
    expect(availableRecipes(world.player(id).inventory, world.cfg)).not.toContain('gold_sword');
    setInventory(world, id, [{ item: 'stone_sword', count: 1 }, { item: 'gold', count: 19 }, { item: 'stone', count: 30 }, { item: 'wood', count: 60 }]);
    expect(availableRecipes(world.player(id).inventory, world.cfg)).not.toContain('gold_sword');
  });

  it('hace 4 de daño y es un arma no apilable', () => {
    expect(DEFAULT_CONFIG.weaponDamage.gold_sword).toBe(4);
    expect(ITEM_META.gold_sword).toEqual({ stackable: false, weapon: 'gold_sword' });
  });
});
