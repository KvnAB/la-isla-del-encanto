import { describe, expect, it } from 'vitest';
import { terrainAt } from '../src/island.js';
import { clearWorld, findLandNextTo, findTerrainCell, makeWorld, placePlayerAt } from './helpers.js';

describe('movimiento del jugador', () => {
  it('se mueve a 220 px/s en tierra sin cambiar el ángulo', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const p = world.player(id);
    const x0 = p.x;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    expect(p.x - x0).toBeCloseTo(220, -1);
    expect(p.angle).toBe(0);
  });

  it('normaliza la dirección diagonal', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const p = world.player(id);
    const x0 = p.x;
    const y0 = p.y;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 1 });
    world.stepSeconds(1);
    expect(Math.hypot(p.x - x0, p.y - y0)).toBeCloseTo(220, -1);
  });

  it('aim fija el ángulo', () => {
    const { world, id } = makeWorld();
    world.enqueue({ playerId: id, type: 'aim', angle: 1.2 });
    world.step();
    expect(world.player(id).angle).toBe(1.2);
  });

  it('no entra en el mar', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const map = world.getState().map;
    const spot = findLandNextTo(world, 'sea', 60);
    placePlayerAt(world, id, spot.x, spot.y);
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(2);
    const p = world.player(id);
    expect(terrainAt(map, p.x + p.radius, p.y)).not.toBe('sea');
    expect(terrainAt(map, p.x, p.y)).not.toBe('sea');
  });

  it('en agua va a la mitad de velocidad y marca inWater', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const spot = findTerrainCell(world, 'water');
    placePlayerAt(world, id, spot.x, spot.y);
    const p = world.player(id);
    world.step();
    expect(p.inWater).toBe(true);
    const x0 = p.x;
    world.enqueue({ playerId: id, type: 'move', dx: 0, dy: 1 });
    world.stepSeconds(0.2);
    // 0.2 s * 110 px/s = 22 px (si no sale del agua)
    expect(Math.abs(p.y - (spot.y + 22)) < 3 || p.inWater === false).toBe(true);
  });

  it('un move (0,0) detiene al jugador', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    const p = world.player(id);
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(0.5);
    world.enqueue({ playerId: id, type: 'move', dx: 0, dy: 0 });
    world.step();
    const x1 = p.x;
    world.stepSeconds(0.5);
    expect(p.x).toBe(x1);
  });
});
