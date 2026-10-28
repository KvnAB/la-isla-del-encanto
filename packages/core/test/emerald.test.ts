import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';
import { availableRecipes, craft } from '../src/systems/crafting.js';
import { resourceCapacity } from '../src/systems/resources.js';
import { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, putResource, setInventory } from './helpers.js';
import type { ResourceKind, Slot } from '../src/types.js';

function setup(tool: Slot | null, kind: ResourceKind = 'emerald_rock') {
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

describe('esmeralda', () => {
  it('roca de esmeralda: 6 en la nieve, capacidad 2 / 4 / 6', () => {
    expect(DEFAULT_CONFIG.resources.counts.emerald_rock).toBe(6);
    expect(DEFAULT_CONFIG.resources.biome.emerald_rock).toBe('snow');
    expect(resourceCapacity('emerald_rock', 'small', DEFAULT_CONFIG)).toBe(2);
    expect(resourceCapacity('emerald_rock', 'medium', DEFAULT_CONFIG)).toBe(4);
    expect(resourceCapacity('emerald_rock', 'large', DEFAULT_CONFIG)).toBe(6);
    expect(ITEM_META.emerald).toEqual({ stackable: true });
  });

  it('solo el pico de diamante (1) o el de esmeralda (2) sacan esmeralda; el de oro nada', () => {
    const a = setup({ item: 'diamond_pickaxe', count: 1 });
    hit(a.world, a.id);
    expect(count(a.world, a.id, 'emerald')).toBe(1);
    const b = setup({ item: 'emerald_pickaxe', count: 1 });
    hit(b.world, b.id);
    expect(count(b.world, b.id, 'emerald')).toBe(2);
    const c = setup({ item: 'gold_pickaxe', count: 1 });
    hit(c.world, c.id);
    expect(count(c.world, c.id, 'emerald')).toBe(0);
    expect(c.r.remaining).toBe(4);
  });

  it('el pico de esmeralda saca 6 madera, 5 piedra, 4 oro y 3 diamante por golpe', () => {
    const cases: [ResourceKind, string, number][] = [
      ['tree', 'wood', 6],
      ['rock', 'stone', 5],
      ['gold_rock', 'gold', 4],
      ['diamond_rock', 'diamond', 3],
    ];
    for (const [kind, item, n] of cases) {
      const t = setup({ item: 'emerald_pickaxe', count: 1 }, kind);
      hit(t.world, t.id);
      expect(count(t.world, t.id, item), kind).toBe(n);
    }
  });

  it('la espada de esmeralda hace 9 de daño (tigre en 4 golpes) y golpea cada 0,25 s en vez de 0,4', () => {
    expect(DEFAULT_CONFIG.weaponDamage.emerald_sword).toBe(9);
    expect(Math.ceil(DEFAULT_CONFIG.creatures.defs.tiger.hp / 9)).toBe(4);
    const { world, id } = makeWorld();
    clearWorld(world);
    placePlayerAt(world, id, 1500, 1500);
    setInventory(world, id, [{ item: 'emerald_sword', count: 1 }, { item: 'diamond_sword', count: 1 }]);
    const p = world.player(id);
    p.angle = 0;
    p.selectedSlot = 0;
    const t = putCreature(world, 'tiger', 1500 + p.radius + 40, 1500);
    t.wanderTimer = 99;
    hit(world, id);
    expect(t.hp).toBe(21);
    expect(p.hitCooldown).toBeCloseTo(0.25 - DEFAULT_CONFIG.stepSeconds, 3);
    p.selectedSlot = 1;
    hit(world, id);
    expect(p.hitCooldown).toBeCloseTo(0.4 - DEFAULT_CONFIG.stepSeconds, 3);
  });

  it('recetas: pico (10 esmeralda + 15 diamante + 20 oro, consume el de diamante) y espada (10 + 15 + 60 madera)', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    setInventory(world, id, [{ item: 'diamond_pickaxe', count: 1 }, { item: 'emerald', count: 10 }, { item: 'diamond', count: 15 }, { item: 'gold', count: 20 }]);
    const p = world.player(id);
    expect(availableRecipes(p.inventory, DEFAULT_CONFIG)).toContain('emerald_pickaxe');
    expect(availableRecipes(p.inventory, DEFAULT_CONFIG)).not.toContain('emerald_sword');
    expect(craft(p, 'emerald_pickaxe', DEFAULT_CONFIG, [])).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'emerald_pickaxe', count: 1 });
    expect(count(world, id, 'emerald')).toBe(0);
    const sword = DEFAULT_CONFIG.recipes.find((r) => r.id === 'emerald_sword')!;
    expect(sword.cost).toEqual({ emerald: 10, diamond: 15, wood: 60 });
    expect(sword.consumes).toBe('diamond_sword');
    expect(sword.points).toBe(800);
  });
});
