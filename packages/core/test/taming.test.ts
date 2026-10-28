import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';
import type { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, putResource, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function fresh(slots: (Slot | null)[] = [], seed = 7) {
  const { world, id } = makeWorld(seed);
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, slots);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p, s: world.getState() };
}

/** Avanza `seconds` manteniendo al jugador vivo y quieto. */
function survive(world: World, id: number, seconds: number) {
  const p = world.player(id);
  for (let i = 0; i < seconds * 30; i++) {
    p.health = p.hunger = p.thirst = p.warmth = 100;
    world.step();
  }
}

function use(world: World, id: number) {
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

describe('esqueleto y hueso', () => {
  it('el esqueleto es agresivo, vive en la hierba y suelta entre 1 y 2 huesos', () => {
    const d = DEFAULT_CONFIG.creatures.defs.skeleton;
    expect(d.aggressive).toBe(true);
    expect(d.biome).toBe('grass');
    expect(d.loot).toEqual([{ item: 'bone', count: 1, max: 2 }]);
    expect(ITEM_META.bone).toEqual({ stackable: true, usable: true, held: true });
  });

  it('matar esqueletos deja 1 o 2 huesos en el suelo, y ambas cantidades salen', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) {
      const { world, id, p, s } = fresh([{ item: 'diamond_sword', count: 1 }], seed);
      const c = putCreature(world, 'skeleton', p.x + p.radius + 40, p.y);
      for (let i = 0; i < 10 && s.creatures.includes(c); i++) {
        p.health = 100;
        c.x = p.x + p.radius + 40;
        c.y = p.y;
        p.hitCooldown = 0;
        world.enqueue({ playerId: id, type: 'hit' });
        world.step();
      }
      expect(s.creatures).not.toContain(c);
      const bones = s.groundItems.filter((g) => g.item === 'bone');
      expect(bones).toHaveLength(1);
      expect(bones[0].count).toBeGreaterThanOrEqual(1);
      expect(bones[0].count).toBeLessThanOrEqual(2);
      seen.add(bones[0].count);
    }
    expect([...seen].sort()).toEqual([1, 2]);
  });
});

describe('domar un puma con un hueso', () => {
  it('el puma salvaje es agresivo y se doma con hueso', () => {
    const d = DEFAULT_CONFIG.creatures.defs.puma;
    expect(d.aggressive).toBe(true);
    expect(d.biome).toBe('grass');
    expect(d.tameWith).toBe('bone');
  });

  it('usar el hueso apuntando a un puma al alcance lo doma: gasta el hueso, da puntos y encola un puma salvaje nuevo', () => {
    const { world, id, p, s } = fresh([{ item: 'bone', count: 2 }]);
    const c = putCreature(world, 'puma', p.x + p.radius + 40, p.y);
    c.mode = 'attack';
    const points = p.points;
    use(world, id);
    expect(c.owner).toBe(id);
    expect(p.inventory[0]).toEqual({ item: 'bone', count: 1 });
    expect(p.points).toBe(points + DEFAULT_CONFIG.taming.points);
    expect(world.drainEvents()).toContainEqual({ type: 'creatureTamed', playerId: id, entityId: c.id, kind: 'puma' });
    expect(s.respawnQueue).toEqual([{ kind: 'puma', at: expect.any(Number) }]);
  });

  it('usar el hueso sin puma delante no gasta nada', () => {
    const { world, id, p } = fresh([{ item: 'bone', count: 1 }]);
    putCreature(world, 'tiger', p.x + p.radius + 40, p.y);
    putCreature(world, 'puma', p.x + 400, p.y);
    use(world, id);
    expect(p.inventory[0]).toEqual({ item: 'bone', count: 1 });
    expect(world.drainEvents().some((e) => e.type === 'creatureTamed')).toBe(false);
  });

  it('un puma ya domado no acepta otro hueso', () => {
    const { world, id, p } = fresh([{ item: 'bone', count: 1 }]);
    const c = putCreature(world, 'puma', p.x + p.radius + 40, p.y);
    c.owner = id;
    use(world, id);
    expect(p.inventory[0]).toEqual({ item: 'bone', count: 1 });
  });
});

describe('puma domado', () => {
  it('no muerde a su dueño', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'puma', p.x + p.radius + c0(world), p.y);
    c.owner = id;
    for (let i = 0; i < 90; i++) world.step();
    expect(p.health).toBe(100);
  });

  it('los golpes del dueño no le hacen daño y pasan al recurso de detrás', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'puma', p.x + p.radius + 20, p.y);
    c.owner = id;
    const tree = putResource(world, 'tree', 'small', p.x + p.radius + 60, p.y);
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    expect(c.hp).toBe(DEFAULT_CONFIG.creatures.defs.puma.hp);
    const ev = world.drainEvents();
    expect(ev.some((e) => e.type === 'creatureHit')).toBe(false);
    expect(ev.some((e) => e.type === 'resourceHit' && e.entityId === tree.id)).toBe(true);
  });

  it('sigue al dueño hasta quedarse a la distancia de seguimiento', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'puma', p.x + 500, p.y);
    c.owner = id;
    survive(world, id, 4);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    expect(d).toBeLessThanOrEqual(DEFAULT_CONFIG.taming.followDist + 5);
    expect(d).toBeGreaterThan(p.radius + c.radius);
    expect(c.mode).toBe('follow');
  });

  it('ataca a un tigre que se acerca al dueño y el dueño cobra el botín y los puntos', () => {
    const { world, id, p, s } = fresh();
    const c = putCreature(world, 'puma', p.x - 60, p.y);
    c.owner = id;
    const t = putCreature(world, 'tiger', p.x + 250, p.y);
    const points = p.points;
    survive(world, id, 8);
    expect(s.creatures).not.toContain(t);
    expect(p.points).toBe(points + DEFAULT_CONFIG.creatures.defs.tiger.points);
    expect(s.groundItems.some((g) => g.item === 'tiger_pelt')).toBe(true);
    expect(world.drainEvents()).toContainEqual({ type: 'creatureDied', playerId: id, entityId: t.id, kind: 'tiger' });
  });

  it('un tigre muerde al puma domado si está más cerca que el jugador', () => {
    const { world, id, p } = fresh();
    const c = putCreature(world, 'puma', p.x + 200, p.y);
    c.owner = id;
    putCreature(world, 'tiger', p.x + 260, p.y);
    survive(world, id, 3);
    expect(c.hp).toBeLessThan(DEFAULT_CONFIG.creatures.defs.puma.hp);
  });

  it('si matan al puma domado no deja botín ni reaparece y avisa con petDied', () => {
    const { world, id, p, s } = fresh();
    const c = putCreature(world, 'puma', p.x + 200, p.y);
    c.owner = id;
    c.hp = 1;
    putCreature(world, 'tiger', p.x + 260, p.y);
    survive(world, id, 3);
    expect(s.creatures).not.toContain(c);
    expect(s.groundItems).toHaveLength(0);
    expect(s.respawnQueue).toHaveLength(0);
    expect(world.drainEvents()).toContainEqual({ type: 'petDied', playerId: id, entityId: c.id, kind: 'puma' });
  });
});

/** Distancia centro a centro a la que el puma está en rango de ataque del jugador. */
function c0(world: World): number {
  return world.cfg.creatures.defs.puma.radius + 4;
}
