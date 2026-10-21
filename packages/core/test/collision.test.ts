import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { collisionRadius } from '../src/systems/resources.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, putResource } from './helpers.js';

/** Camina hacia +x durante 2 s contra lo que haya y devuelve la distancia final al centro del recurso. */
function walkInto(kind: 'tree' | 'apple_tree' | 'rock' | 'gold_rock', size: 'small' | 'medium' | 'large', broken = false) {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  const r = putResource(world, kind, size, 1500 + 200, 1500, broken ? 0 : undefined);
  if (broken) r.brokenAt = world.getState().time;
  world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
  world.stepSeconds(2);
  const p = world.player(id);
  return { dist: Math.hypot(p.x - r.x, p.y - r.y), p, r, world };
}

describe('radio de colisión de los recursos', () => {
  it('el bloqueo del árbol queda por dentro del dibujo (75 % del radio)', () => {
    const { dist, p, r } = walkInto('tree', 'large');
    expect(DEFAULT_CONFIG.resources.collision.tree).toBe(0.75);
    expect(dist).toBeCloseTo(p.radius + r.radius * 0.75, 0);
    expect(dist).toBeLessThan(p.radius + r.radius - 10);
  });

  it('frutal al 85 %, roca y roca de oro al 90 %', () => {
    expect(walkInto('apple_tree', 'medium').dist).toBeCloseTo(22 + 50 * 0.85, 0);
    expect(walkInto('rock', 'large').dist).toBeCloseTo(22 + 56 * 0.9, 0);
    expect(walkInto('gold_rock', 'small').dist).toBeCloseTo(22 + 28 * 0.9, 0);
  });

  it('un recurso roto (tocón o escombro) bloquea solo la mitad del radio', () => {
    const { dist, p, r } = walkInto('tree', 'large', true);
    expect(dist).toBeCloseTo(p.radius + r.radius * 0.5, 0);
    expect(collisionRadius(r, DEFAULT_CONFIG)).toBe(35);
  });

  it('las criaturas usan el mismo radio reducido al rodear recursos', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    placePlayerAt(world, id, 1500, 1500);
    const p = world.player(id);
    p.health = 100;
    const tree = putResource(world, 'tree', 'large', 1500 + 150, 1500);
    // el tigre está dentro del radio de agresión, al otro lado del árbol, en línea recta hacia el jugador
    const c = putCreature(world, 'tiger', 1500 + 150 + 70 + 30 + 5, 1500);
    world.stepSeconds(0.5);
    // en medio segundo sigue pegado al árbol: su distancia al centro nunca baja del radio de colisión + el suyo
    expect(Math.hypot(c.x - tree.x, c.y - tree.y)).toBeGreaterThanOrEqual(c.radius + collisionRadius(tree, DEFAULT_CONFIG) - 0.5);
    // ...pero sí ha podido acercarse más que el radio dibujado
    expect(Math.hypot(c.x - tree.x, c.y - tree.y)).toBeLessThan(c.radius + tree.radius);
  });
});

describe('criaturas y jugador', () => {
  it('el jugador atraviesa a las criaturas (no bloquean el paso)', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    placePlayerAt(world, id, 1500, 1500);
    const p = world.player(id);
    const c = putCreature(world, 'sheep', 1500 + 80, 1500);
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    // sin bloqueo avanzaría ~220 px; bloqueado se quedaría a 22 + 26 = 48 px del centro de la oveja
    expect(p.x - 1500).toBeGreaterThan(180);
    expect(p.x).toBeGreaterThan(c.x + 10);
  });

  it('pero la criatura sigue sin atravesar al jugador cuando lo persigue', () => {
    const { world, id } = makeWorld();
    clearWorld(world);
    placePlayerAt(world, id, 1500, 1500);
    const p = world.player(id);
    p.health = 100;
    const c = putCreature(world, 'tiger', 1500 + 200, 1500);
    world.stepSeconds(1.5);
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeGreaterThanOrEqual(c.radius + p.radius - 0.5);
  });
});
