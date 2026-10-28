import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';
import type { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, setInventory } from './helpers.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  const map = world.getState().map;
  placePlayerAt(world, id, map.spawnX, map.spawnY); // el centro: hierba a 100 px a la redonda (en 1500,1500 hay agua cerca)
  setInventory(world, id, [{ item: 'stone_wall', count: 2 }, { item: 'diamond_pickaxe', count: 1 }]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p, s: world.getState() };
}

function use(world: World, id: number) {
  world.player(id).hitCooldown = 0;
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

function survive(world: World, id: number, seconds: number) {
  const p = world.player(id);
  for (let i = 0; i < seconds * 30; i++) {
    p.health = p.hunger = p.thirst = p.warmth = 100;
    world.step();
  }
}

describe('muro de piedra', () => {
  it('receta 1 esmeralda + 30 piedra, colocable y apilable; anillo de 10 piedras a 100 px con 5 de vida', () => {
    const r = DEFAULT_CONFIG.recipes.find((x) => x.id === 'stone_wall')!;
    expect(r.cost).toEqual({ emerald: 1, stone: 30 });
    expect(ITEM_META.stone_wall).toEqual({ stackable: true, placeable: true });
    expect(DEFAULT_CONFIG.wall).toEqual({ stones: 10, ringRadius: 100, stoneRadius: 20, hp: 5 });
  });

  it('usarlo coloca un anillo de piedras alrededor del jugador y gasta uno', () => {
    const { world, id, p, s } = fresh();
    use(world, id);
    expect(p.inventory[0]).toEqual({ item: 'stone_wall', count: 1 });
    expect(s.walls).toHaveLength(10);
    for (const w of s.walls) {
      expect(Math.hypot(w.x - p.x, w.y - p.y)).toBeCloseTo(100, 0);
      expect(w.radius).toBe(20);
      expect(w.hp).toBe(5);
    }
    expect(world.drainEvents()).toContainEqual({ type: 'wallPlaced', playerId: id });
  });

  it('un tigre no entra en el anillo: se queda fuera sin morder', () => {
    const { world, id, p } = fresh();
    use(world, id);
    const t = putCreature(world, 'tiger', p.x + 250, p.y);
    survive(world, id, 5);
    expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(100);
    expect(p.health).toBe(100);
  });

  it('el jugador sale del anillo andando', () => {
    const { world, id, p } = fresh();
    use(world, id);
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1.5);
    expect(p.x - world.getState().map.spawnX).toBeGreaterThan(200);
  });

  it('golpear una piedra con el pico 5 veces la rompe', () => {
    const { world, id, p, s } = fresh();
    use(world, id);
    // apuntar a la piedra de la derecha y acercarse
    const stone = s.walls.find((w) => Math.abs(w.y - p.y) < 1 && w.x > p.x)!;
    p.x = stone.x - stone.radius - p.radius - 10;
    p.selectedSlot = 1;
    for (let i = 0; i < 4; i++) {
      p.hitCooldown = 0;
      world.enqueue({ playerId: id, type: 'hit' });
      world.step();
    }
    expect(s.walls).toContain(stone);
    expect(stone.hp).toBe(1);
    expect(world.drainEvents().filter((e) => e.type === 'wallHit')).toHaveLength(4);
    p.hitCooldown = 0;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(s.walls).not.toContain(stone);
    expect(s.walls).toHaveLength(9);
    expect(world.drainEvents()).toContainEqual({ type: 'wallBroken', entityId: stone.id });
  });

  it('las criaturas domadas pasan el muro', () => {
    const { world, id, p } = fresh();
    use(world, id);
    const c = putCreature(world, 'puma', p.x + 300, p.y);
    c.owner = id;
    survive(world, id, 4);
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(100);
  });
});
