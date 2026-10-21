import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';
import { terrainAt } from '../src/island.js';
import { availableRecipes, craft } from '../src/systems/crafting.js';
import { resourceCapacity } from '../src/systems/resources.js';
import { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, putResource, setInventory } from './helpers.js';
import type { ResourceKind, Slot } from '../src/types.js';

function setup(tool: Slot | null, kind: ResourceKind = 'diamond_rock') {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [tool]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  const r = putResource(world, kind, 'medium', 1500 + p.radius + 60 + world.cfg.resources.radius[kind].medium - 10, 1500);
  return { world, id, p, r };
}

function hit(world: World, id: number) {
  world.player(id).hitCooldown = 0;
  world.enqueue({ playerId: id, type: 'hit' });
  world.step();
}

const count = (world: World, id: number, item: string) =>
  world
    .player(id)
    .inventory.filter((s) => s?.item === item)
    .reduce((a, s) => a + (s?.count ?? 0), 0);

describe('diamante', () => {
  it('capacidad por tamaño 3 / 5 / 8', () => {
    expect(resourceCapacity('diamond_rock', 'small', DEFAULT_CONFIG)).toBe(3);
    expect(resourceCapacity('diamond_rock', 'medium', DEFAULT_CONFIG)).toBe(5);
    expect(resourceCapacity('diamond_rock', 'large', DEFAULT_CONFIG)).toBe(8);
  });

  it('con pico de oro 1 diamante por golpe; con pico de diamante 2; con pico de piedra nada', () => {
    const a = setup({ item: 'gold_pickaxe', count: 1 });
    hit(a.world, a.id);
    expect(count(a.world, a.id, 'diamond')).toBe(1);
    const b = setup({ item: 'diamond_pickaxe', count: 1 });
    hit(b.world, b.id);
    expect(count(b.world, b.id, 'diamond')).toBe(2);
    const c = setup({ item: 'stone_pickaxe', count: 1 });
    hit(c.world, c.id);
    expect(count(c.world, c.id, 'diamond')).toBe(0);
    expect(c.r.remaining).toBe(5);
  });

  it('el pico de diamante saca 5 madera, 4 piedra y 3 oro por golpe', () => {
    const t = setup({ item: 'diamond_pickaxe', count: 1 }, 'tree');
    hit(t.world, t.id);
    expect(count(t.world, t.id, 'wood')).toBe(5);
    const s = setup({ item: 'diamond_pickaxe', count: 1 }, 'rock');
    hit(s.world, s.id);
    expect(count(s.world, s.id, 'stone')).toBe(4);
    const g = setup({ item: 'diamond_pickaxe', count: 1 }, 'gold_rock');
    hit(g.world, g.id);
    expect(count(g.world, g.id, 'gold')).toBe(3);
  });

  it('recetas: pico y espada de diamante consumen las de oro y dan 400 puntos', () => {
    const { world, id } = makeWorld();
    const p = world.player(id);
    setInventory(world, id, [
      { item: 'gold_pickaxe', count: 1 },
      { item: 'gold_sword', count: 1 },
      { item: 'diamond', count: 30 },
      { item: 'gold', count: 40 },
      { item: 'stone', count: 30 },
      { item: 'wood', count: 60 },
    ]);
    expect(availableRecipes(p.inventory, world.cfg)).toEqual(expect.arrayContaining(['diamond_pickaxe', 'diamond_sword']));
    expect(craft(p, 'diamond_pickaxe', world.cfg, [])).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'diamond_pickaxe', count: 1 });
    expect(craft(p, 'diamond_sword', world.cfg, [])).toBe(true);
    expect(p.inventory[1]).toEqual({ item: 'diamond_sword', count: 1 });
    expect(count(world, id, 'diamond')).toBe(0);
    expect(count(world, id, 'gold')).toBe(0);
    expect(count(world, id, 'stone')).toBe(0);
    expect(count(world, id, 'wood')).toBe(0);
    expect(p.points).toBe(800);
    expect(ITEM_META.diamond_pickaxe.tool).toBe('diamond_pickaxe');
    expect(ITEM_META.diamond_sword.weapon).toBe('diamond_sword');
  });

  it('la espada de diamante hace 6: tigre en 5 golpes', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    placePlayerAt(world, id, 1500, 1500);
    setInventory(world, id, [{ item: 'diamond_sword', count: 1 }]);
    const p = world.player(id);
    p.angle = 0;
    const c = putCreature(world, 'tiger', 1500 + 60, 1500);
    for (let i = 0; i < 5; i++) {
      c.x = 1560;
      c.y = 1500;
      hit(world, id);
    }
    expect(world.getState().creatures).toHaveLength(0);
    expect(world.cfg.weaponDamage.diamond_sword).toBe(6);
  });

  it('las rocas de diamante están todas en nieve y los frutales nunca', () => {
    const world = new World(1);
    const s = world.getState();
    const diamonds = s.resources.filter((r) => r.kind === 'diamond_rock');
    expect(diamonds).toHaveLength(8);
    for (const r of diamonds) expect(terrainAt(s.map, r.x, r.y)).toBe('snow');
    for (const r of s.resources.filter((r) => r.kind === 'apple_tree')) expect(terrainAt(s.map, r.x, r.y)).not.toBe('snow');
  });
});
