import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/types.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, setInventory } from './helpers.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, []);
  return { world, id, p: world.player(id) };
}

function died(events: GameEvent[]) {
  return events.find((e) => e.type === 'playerDied');
}

describe('causa de muerte', () => {
  it('un tigre que mata deja cause creature/tiger', () => {
    const { world, id, p } = fresh();
    putCreature(world, 'tiger', p.x + 50, p.y);
    p.health = 5;
    world.stepSeconds(2);
    expect(p.alive).toBe(false);
    expect(died(world.drainEvents())).toEqual(expect.objectContaining({ type: 'playerDied', playerId: id, cause: { kind: 'creature', creature: 'tiger' } }));
  });

  it('morir de sed con el hambre llena', () => {
    const { world, p } = fresh();
    p.thirst = 0;
    p.health = 3;
    world.stepSeconds(3);
    expect(died(world.drainEvents())).toEqual(expect.objectContaining({ cause: { kind: 'thirst' } }));
  });

  it('morir de frío', () => {
    const { world, p } = fresh();
    p.warmth = 0;
    p.health = 3;
    world.stepSeconds(3);
    expect(died(world.drainEvents())).toEqual(expect.objectContaining({ cause: { kind: 'cold' } }));
  });

  it('un golpe antiguo no cuenta: gana la barra vacía', () => {
    const { world, p } = fresh();
    p.lastHitBy = 'sheep';
    p.lastHitAt = world.getState().time - 10;
    p.hunger = 0;
    p.health = 2;
    world.stepSeconds(3);
    expect(died(world.drainEvents())).toEqual(expect.objectContaining({ cause: { kind: 'hunger' } }));
  });

  it('sin barras vacías ni golpes recientes (filete crudo con poca vida) cae en hunger', () => {
    const { world, id, p } = fresh();
    setInventory(world, id, [{ item: 'raw_steak', count: 1 }]);
    p.health = 5;
    world.enqueue({ playerId: id, type: 'useSlot' });
    world.step();
    expect(p.alive).toBe(false);
    expect(died(world.drainEvents())).toEqual(expect.objectContaining({ cause: { kind: 'hunger' } }));
  });
});
