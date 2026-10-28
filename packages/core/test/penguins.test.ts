import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import type { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, setInventory } from './helpers.js';
import type { GameEvent } from '../src/types.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [{ item: 'diamond_sword', count: 1 }]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p, s: world.getState() };
}

/** Mata un pingüino pegado al jugador (2 golpes de espada de diamante) y devuelve los eventos. */
function killPenguin(world: World, id: number): GameEvent[] {
  const p = world.player(id);
  const c = putCreature(world, 'penguin', p.x + p.radius + 30, p.y);
  c.wanderTimer = 99;
  const all: GameEvent[] = [];
  for (let i = 0; i < 6 && world.getState().creatures.includes(c); i++) {
    c.x = p.x + p.radius + 30;
    c.y = p.y;
    p.hitCooldown = 0;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    all.push(...world.drainEvents());
  }
  expect(world.getState().creatures).not.toContain(c);
  return all;
}

describe('pingüinos', () => {
  it('son casi tan rápidos como el jugador y hay 6 en la nieve', () => {
    const d = DEFAULT_CONFIG.creatures.defs.penguin;
    expect(d.speed).toBe(200);
    expect(d.speed).toBeLessThan(DEFAULT_CONFIG.player.speed);
    expect(d.initialCount).toBe(6);
    expect(DEFAULT_CONFIG.slotReward).toEqual({ creature: 'penguin', killsPerSlot: 3, maxSlots: 20 });
  });

  it('cada 3 pingüinos dan una casilla más, con aviso de progreso por el camino', () => {
    const { world, id, p } = fresh();
    expect(p.inventory).toHaveLength(12);
    expect(killPenguin(world, id)).toContainEqual({ type: 'slotProgress', playerId: id, kills: 1, needed: 3 });
    expect(p.slotKills).toBe(1);
    expect(killPenguin(world, id)).toContainEqual({ type: 'slotProgress', playerId: id, kills: 2, needed: 3 });
    const ev = killPenguin(world, id);
    expect(ev).toContainEqual({ type: 'slotUnlocked', playerId: id, slots: 13 });
    expect(ev.some((e) => e.type === 'slotProgress')).toBe(false);
    expect(p.inventory).toHaveLength(13);
    expect(p.inventory[12]).toBeNull();
    expect(p.slotKills).toBe(0);
  });

  it('la casilla nueva se puede seleccionar y usar', () => {
    const { world, id, p } = fresh();
    for (let i = 0; i < 3; i++) killPenguin(world, id);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 12 });
    world.step();
    expect(p.selectedSlot).toBe(12);
  });

  it('tope de 20 casillas: a partir de ahí los pingüinos ya no cuentan', () => {
    const { world, id, p } = fresh();
    for (let i = 0; i < 24; i++) killPenguin(world, id);
    expect(p.inventory).toHaveLength(20);
    const ev = killPenguin(world, id);
    expect(p.inventory).toHaveLength(20);
    expect(p.slotKills).toBe(0);
    expect(ev.some((e) => e.type === 'slotProgress' || e.type === 'slotUnlocked')).toBe(false);
  });

  it('otras criaturas no cuentan para la casilla', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'goblin', p.x + p.radius + 30, p.y);
    c.wanderTimer = 99;
    for (let i = 0; i < 4 && world.getState().creatures.includes(c); i++) {
      c.x = p.x + p.radius + 30;
      c.y = p.y;
      p.hitCooldown = 0;
      world.enqueue({ playerId: id, type: 'hit' });
      world.step();
    }
    expect(world.getState().creatures).not.toContain(c);
    expect(p.slotKills).toBe(0);
    expect(world.drainEvents().some((e) => e.type === 'slotProgress')).toBe(false);
  });
});
