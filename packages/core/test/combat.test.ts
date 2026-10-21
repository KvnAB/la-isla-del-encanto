import { describe, expect, it } from 'vitest';
import { terrainAt } from '../src/island.js';
import { collisionRadius } from '../src/systems/resources.js';
import { clearWorld, findLandNextTo, makeWorld, placePlayerAt, putCreature, putResource, setInventory } from './helpers.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, []);
  const p = world.player(id);
  p.angle = 0;
  return { world, id, p };
}

describe('empujón al golpear', () => {
  it('golpear a una oveja la empuja 26 px y el evento lleva el daño', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'sheep', p.x + 60, p.y);
    c.wanderTimer = 99;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(c.x).toBeCloseTo(p.x + 60 + 26, 0);
    expect(c.y).toBeCloseTo(p.y, 0);
    expect(world.drainEvents()).toContainEqual({ type: 'creatureHit', playerId: id, entityId: c.id, amount: 1 });
  });

  it('la oveja no atraviesa un árbol al ser empujada, pero el golpe cuenta', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'sheep', p.x + 60, p.y);
    c.wanderTimer = 99;
    const tree = putResource(world, 'tree', 'small', p.x + 60 + c.radius + 10 + 36, p.y);
    const limit = tree.x - collisionRadius(tree, world.cfg) - c.radius;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(c.x).toBeLessThanOrEqual(limit + 0.5);
    expect(c.x).toBeGreaterThan(p.x + 60);
    expect(world.drainEvents().some((e) => e.type === 'creatureHit')).toBe(true);
  });
});

describe('empujón al recibir daño', () => {
  it('el tigre que golpea empuja al jugador 18 px y lo registra como último atacante', () => {
    const { world, p } = fresh();
    const c = putCreature(world, 'tiger', p.x + c0(world, 'tiger'), p.y);
    c.mode = 'attack';
    const before = Math.hypot(p.x - c.x, p.y - c.y);
    // paso a paso hasta el primer mordisco: en ese mismo paso el jugador ya ha sido empujado
    for (let i = 0; i < 30 && p.health >= 100; i++) world.step();
    expect(p.health).toBeLessThan(100);
    expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeGreaterThanOrEqual(before + 17);
    expect(p.lastHitBy).toBe('tiger');
    expect(p.lastHitAt).toBeCloseTo(0, 0);
  });
});

/** Distancia a la que un tigre está en rango de ataque del jugador (radios + 8). */
function c0(world: ReturnType<typeof makeWorld>['world'], kind: 'tiger'): number {
  return world.cfg.creatures.defs[kind].radius + world.cfg.player.radius + 4;
}

describe('empujón y agua', () => {
  it('una criatura empujada hacia un río no cae al agua (se quedaría atrapada); el golpe cuenta', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const spot = findLandNextTo(world, 'water', 60);
    placePlayerAt(world, id, spot.x - 20, spot.y);
    setInventory(world, id, []);
    const p = world.player(id);
    p.angle = 0;
    const c = putCreature(world, 'sheep', spot.x + 40, spot.y); // a 20 px del agua: el empujón de 26 la metería dentro
    c.wanderTimer = 99;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(terrainAt(world.getState().map, c.x, c.y)).not.toBe('water');
    expect(world.drainEvents().some((e) => e.type === 'creatureHit')).toBe(true);
  });
});
