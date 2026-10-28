import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import type { World } from '../src/world.js';
import { clearWorld, findLandNextTo, makeWorld, placePlayerAt, putCreature, setInventory } from './helpers.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [{ item: 'bone', count: 3 }]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p, s: world.getState() };
}

function pet(world: World, id: number, dx = 60, dy = 0) {
  const p = world.player(id);
  const c = putCreature(world, 'puma', p.x + dx, p.y + dy);
  c.owner = id;
  c.hp = DEFAULT_CONFIG.taming.hp;
  return c;
}

function cmd(world: World, id: number, c: object) {
  world.enqueue({ playerId: id, ...c } as Parameters<World['enqueue']>[0]);
  world.step();
}

function survive(world: World, id: number, seconds: number) {
  const p = world.player(id);
  for (let i = 0; i < seconds * 30; i++) {
    p.health = p.hunger = p.thirst = p.warmth = 100;
    world.step();
  }
}

describe('nombre del puma', () => {
  it('al domar recibe un nombre por defecto numerado por dueño', () => {
    const { world, id, p } = fresh();
    const a = putCreature(world, 'puma', p.x + p.radius + 40, p.y);
    cmd(world, id, { type: 'useSlot' });
    expect(a.name).toBe('Puma 1');
    const b = putCreature(world, 'puma', p.x + p.radius + 40, p.y);
    p.hitCooldown = 0;
    cmd(world, id, { type: 'useSlot' });
    expect(b.name).toBe('Puma 2');
  });

  it('rename cambia el nombre (recortado a 16 letras) solo de los pumas propios', () => {
    const { world, id, p } = fresh();
    const mine = pet(world, id);
    const other = putCreature(world, 'puma', p.x - 100, p.y);
    other.owner = 999;
    other.name = 'Ajeno';
    cmd(world, id, { type: 'rename', entityId: mine.id, name: '  Canela  ' });
    expect(mine.name).toBe('Canela');
    expect(world.drainEvents()).toContainEqual({ type: 'petRenamed', playerId: id, entityId: mine.id, name: 'Canela' });
    cmd(world, id, { type: 'rename', entityId: other.id, name: 'Robado' });
    expect(other.name).toBe('Ajeno');
    cmd(world, id, { type: 'rename', entityId: mine.id, name: 'abcdefghijklmnopqrstuvwxyz' });
    expect(mine.name).toBe('abcdefghijklmnop');
    cmd(world, id, { type: 'rename', entityId: mine.id, name: '   ' });
    expect(mine.name).toBe('abcdefghijklmnop'); // vacío: se queda como estaba
  });
});

describe('dormir', () => {
  it('la orden sleep lo deja dormido donde está, sin seguir ni cazar', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 300);
    cmd(world, id, { type: 'petSleep', entityId: c.id });
    expect(c.mode).toBe('sleep');
    const x = c.x;
    putCreature(world, 'tiger', p.x + 100, p.y);
    survive(world, id, 3);
    expect(c.mode).toBe('sleep');
    expect(c.x).toBe(x);
  });

  it('dormido nadie le hace daño y se cura 10 por segundo', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 60);
    c.hp = 20;
    cmd(world, id, { type: 'petSleep', entityId: c.id });
    const t = putCreature(world, 'tiger', c.x + 30, c.y);
    survive(world, id, 4);
    expect(c.hp).toBeCloseTo(20 + 4 * DEFAULT_CONFIG.taming.sleepRegenPerSec, 0);
    expect(DEFAULT_CONFIG.taming.sleepRegenPerSec).toBe(10);
    expect(world.getState().creatures).toContain(c);
    // el tigre, sin poder morder al puma, ha ido a por el jugador
    expect(t.mode === 'chase' || t.mode === 'attack').toBe(true);
  });

  it('no se puede dormir montado', () => {
    const { world, id } = fresh();
    const c = pet(world, id, 10);
    cmd(world, id, { type: 'mount' });
    cmd(world, id, { type: 'petSleep', entityId: c.id });
    expect(c.mode).not.toBe('sleep');
  });
});

describe('llamar', () => {
  it('la orden call lo despierta y viene corriendo a 300 hasta ponerse a seguir', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 900);
    cmd(world, id, { type: 'petSleep', entityId: c.id });
    cmd(world, id, { type: 'petCall', entityId: c.id });
    expect(c.mode).toBe('come');
    const d0 = Math.hypot(c.x - p.x, c.y - p.y);
    survive(world, id, 1);
    const d1 = Math.hypot(c.x - p.x, c.y - p.y);
    expect(d0 - d1).toBeCloseTo(DEFAULT_CONFIG.riding.runSpeed, -1);
    survive(world, id, 3);
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThanOrEqual(DEFAULT_CONFIG.taming.followDist + 5);
    expect(c.mode).toBe('follow');
  });

  it('si al venir se queda atascado más de 5 s, aparece al lado del dueño', () => {
    const { world, id, p } = fresh();
    const spot = findLandNextTo(world, 'water', 120);
    placePlayerAt(world, id, spot.x, spot.y);
    const c = pet(world, id, 0);
    c.x = spot.x + 120 + 200; // al otro lado del agua
    c.y = spot.y;
    cmd(world, id, { type: 'petCall', entityId: c.id });
    survive(world, id, 7);
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThanOrEqual(DEFAULT_CONFIG.taming.followDist + 5);
    expect(c.mode).toBe('follow');
  });

  it('viniendo no se distrae con presas', () => {
    const { world, id, p } = fresh();
    const c = pet(world, id, 600);
    cmd(world, id, { type: 'petCall', entityId: c.id });
    putCreature(world, 'tiger', p.x + 300, p.y + 100);
    survive(world, id, 1);
    expect(c.mode).toBe('come');
  });
});
