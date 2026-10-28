import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { terrainAt } from '../src/island.js';
import type { World } from '../src/world.js';
import { clearWorld, findLandNextTo, makeWorld, placePlayerAt, putCreature, putResource, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function fresh(slots: (Slot | null)[] = []) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, slots);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p, s: world.getState() };
}

function pet(world: World, id: number, dx = 40, dy = 0) {
  const p = world.player(id);
  const c = putCreature(world, 'puma', p.x + dx, p.y + dy);
  c.owner = id;
  c.hp = DEFAULT_CONFIG.taming.hp;
  return c;
}

function cmd(world: World, id: number, c: Parameters<World['enqueue']>[0] extends infer T ? Omit<T, 'playerId'> : never) {
  world.enqueue({ playerId: id, ...c } as Parameters<World['enqueue']>[0]);
  world.step();
}

/** Avanza manteniendo al jugador vivo. */
function survive(world: World, id: number, seconds: number) {
  const p = world.player(id);
  for (let i = 0; i < seconds * 30; i++) {
    p.health = p.hunger = p.thirst = p.warmth = 100;
    world.step();
  }
}

describe('montar el puma domado', () => {
  it('configuración: distancia para montar, velocidades y frío', () => {
    expect(DEFAULT_CONFIG.riding).toEqual({ mountDist: 70, walkSpeed: 160, runSpeed: 300, coldMult: 0.5 });
  });

  it('la orden mount sube al jugador a su puma cercano y otra vez lo baja', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 40);
    cmd(world, id, { type: 'mount' });
    expect(p.mount).toBe(c.id);
    expect(world.drainEvents()).toContainEqual({ type: 'mounted', playerId: id, entityId: c.id });
    cmd(world, id, { type: 'mount' });
    expect(p.mount).toBeNull();
    expect(world.drainEvents()).toContainEqual({ type: 'dismounted', playerId: id });
  });

  it('no monta un puma lejano ni uno salvaje', () => {
    const { world, id, p } = fresh();
    pet(world, id, 200);
    putCreature(world, 'puma', p.x - 30, p.y); // salvaje
    cmd(world, id, { type: 'mount' });
    expect(p.mount).toBeNull();
  });

  it('montado, WASD mueve al puma con el jugador encima: andando a 160 y corriendo a 300', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 10);
    cmd(world, id, { type: 'mount' });
    const x0 = p.x;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    expect(p.x - x0).toBeCloseTo(160, -1);
    expect(c.x).toBeCloseTo(p.x, 0);
    expect(c.y).toBeCloseTo(p.y, 0);
    expect(c.mode).toBe('ride');
    cmd(world, id, { type: 'run', on: true });
    const x1 = p.x;
    world.stepSeconds(1);
    expect(p.x - x1).toBeCloseTo(300, -1);
    cmd(world, id, { type: 'run', on: false });
    const x2 = p.x;
    world.stepSeconds(1);
    expect(p.x - x2).toBeCloseTo(160, -1);
  });

  it('a pie, correr no cambia la velocidad', () => {
    const { world, id, p } = fresh();
    cmd(world, id, { type: 'run', on: true });
    const x0 = p.x;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    expect(p.x - x0).toBeCloseTo(DEFAULT_CONFIG.player.speed, -1);
  });

  it('montado no entra en el agua: se para en la orilla', () => {
    const { world, id, p, s } = fresh();
    const spot = findLandNextTo(world, 'water', 120);
    placePlayerAt(world, id, spot.x, spot.y);
    pet(world, id, 10);
    cmd(world, id, { type: 'mount' });
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    survive(world, id, 3);
    expect(terrainAt(s.map, p.x, p.y)).not.toBe('water');
    expect(p.inWater).toBe(false);
    expect(p.mount).not.toBeNull();
  });

  it('montado no golpea, no fabrica ni pone fogatas, pero sí come', () => {
    const { world, id, p, s } = fresh([{ item: 'campfire', count: 1 }, { item: 'apple', count: 1 }, { item: 'wood', count: 40 }]);
    pet(world, id, 10);
    const tree = putResource(world, 'tree', 'small', p.x + p.radius + 50, p.y);
    cmd(world, id, { type: 'mount' });
    world.drainEvents();
    cmd(world, id, { type: 'hit' });
    expect(tree.remaining).toBe(DEFAULT_CONFIG.resources.capacity.small);
    cmd(world, id, { type: 'useSlot' }); // fogata seleccionada
    expect(s.campfires).toHaveLength(0);
    expect(p.inventory[0]).toEqual({ item: 'campfire', count: 1 });
    cmd(world, id, { type: 'craft', recipeId: 'wood_sword' });
    expect(p.inventory.some((sl) => sl?.item === 'wood_sword')).toBe(false);
    p.selectedSlot = 1;
    p.hunger = 50;
    p.hitCooldown = 0;
    cmd(world, id, { type: 'useSlot' });
    expect(p.hunger).toBeCloseTo(70, 0);
    expect(world.drainEvents().some((e) => e.type === 'resourceHit' || e.type === 'crafted' || e.type === 'campfirePlaced')).toBe(false);
  });

  it('montado el frío baja a la mitad', () => {
    const a = fresh();
    const b = fresh();
    pet(b.world, b.id, 10);
    cmd(b.world, b.id, { type: 'mount' });
    a.world.stepSeconds(20);
    b.world.stepSeconds(20);
    const lostA = 100 - a.p.warmth;
    const lostB = 100 - b.p.warmth;
    expect(lostB).toBeCloseTo(lostA / 2, 1);
  });

  it('el puma caza con el jinete encima y el jugador va donde él', () => {
    const { world, id, p, s } = fresh();
    pet(world, id, 10);
    const c = s.creatures[0];
    cmd(world, id, { type: 'mount' });
    const t = putCreature(world, 'tiger', p.x + 250, p.y);
    survive(world, id, 8);
    expect(s.creatures).not.toContain(t);
    expect(p.mount).toBe(c.id);
    expect(p.x).toBeCloseTo(c.x, 0);
    expect(p.y).toBeCloseTo(c.y, 0);
  });

  it('si matan al puma montado, el jugador cae al suelo sin daño', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 10);
    cmd(world, id, { type: 'mount' });
    c.hp = 1;
    putCreature(world, 'tiger', p.x + 70, p.y);
    world.drainEvents();
    for (let i = 0; i < 30 && p.mount !== null; i++) world.step();
    expect(p.mount).toBeNull();
    expect(p.alive).toBe(true);
    expect(p.health).toBe(100); // montado, los mordiscos se los lleva la montura
    const ev = world.drainEvents();
    expect(ev).toContainEqual({ type: 'petDied', playerId: id, entityId: c.id, kind: 'puma' });
    expect(ev).toContainEqual({ type: 'dismounted', playerId: id });
  });
});
