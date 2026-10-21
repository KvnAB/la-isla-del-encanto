import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config.js';
import { isGround, terrainAt } from '../src/island.js';
import { Rng } from '../src/rng.js';
import { spawnPack } from '../src/systems/creatures.js';
import { World } from '../src/world.js';
import { clearWorld, makeWorld, placePlayerAt, putCreature, setInventory } from './helpers.js';
import type { CreatureKind, GameEvent, Slot } from '../src/types.js';

function setup(weapon: Slot | null, kind: CreatureKind, distance: number, cfg: GameConfig = DEFAULT_CONFIG) {
  const { world, id } = makeWorld(7, cfg);
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [weapon]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  const c = putCreature(world, kind, 1500 + distance, 1500);
  return { world, id, p, c };
}

/** Golpea n veces con 0.5 s entre golpes; la criatura se mantiene pegada. */
function hitTimes(world: World, id: number, c: { x: number; y: number }, n: number): GameEvent[] {
  const p = world.player(id);
  const all: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    p.health = 100; // el test mide golpes, no la supervivencia del jugador
    c.x = p.x + p.radius + 40;
    c.y = p.y;
    world.enqueue({ playerId: id, type: 'hit' });
    world.step();
    all.push(...world.drainEvents());
    world.stepSeconds(0.5);
    all.push(...world.drainEvents());
  }
  return all;
}

describe('combate contra criaturas', () => {
  const cases: [CreatureKind, Slot | null, number][] = [
    ['tiger', { item: 'wood_sword', count: 1 }, 15],
    ['tiger', null, 30],
    ['tiger', { item: 'stone_sword', count: 1 }, 10],
    ['tiger', { item: 'gold_sword', count: 1 }, 8],
    ['tiger', { item: 'wood_pickaxe', count: 1 }, 30],
    ['sheep', null, 20],
    ['sheep', { item: 'wood_sword', count: 1 }, 10],
    ['sheep', { item: 'stone_sword', count: 1 }, 7],
    ['sheep', { item: 'gold_sword', count: 1 }, 5],
    ['goblin', null, 8],
    ['goblin', { item: 'wood_sword', count: 1 }, 4],
    ['goblin', { item: 'stone_sword', count: 1 }, 3],
    ['goblin', { item: 'gold_sword', count: 1 }, 2],
  ];
  for (const [kind, weapon, hits] of cases) {
    it(`${kind} muere al golpe ${hits} con ${weapon?.item ?? 'puño'}`, () => {
      const { world, id, c } = setup(weapon, kind, 60);
      const before = hitTimes(world, id, c, hits - 1);
      expect(before.some((e) => e.type === 'creatureDied')).toBe(false);
      expect(world.getState().creatures).toHaveLength(1);
      const after = hitTimes(world, id, c, 1);
      expect(after).toContainEqual({ type: 'creatureDied', playerId: id, entityId: c.id, kind });
      expect(world.getState().creatures).toHaveLength(0);
    });
  }

  it('golpear emite creatureHit', () => {
    const { world, id, c } = setup({ item: 'wood_sword', count: 1 }, 'tiger', 60);
    const ev = hitTimes(world, id, c, 1);
    expect(ev).toContainEqual({ type: 'creatureHit', playerId: id, entityId: c.id, amount: 2 });
  });

  it('el tigre suelta piel y filete crudo, da 80 puntos y entra en cola de reaparición', () => {
    const { world, id, c } = setup({ item: 'stone_sword', count: 1 }, 'tiger', 60);
    hitTimes(world, id, c, 10);
    const s = world.getState();
    const items = s.groundItems.map((g) => `${g.item}x${g.count}`).sort();
    expect(items).toEqual(['raw_steakx1', 'tiger_peltx1']);
    for (const g of s.groundItems) expect(Math.hypot(g.x - c.x, g.y - c.y)).toBeLessThan(60);
    expect(world.player(id).points).toBe(80);
    expect(s.respawnQueue).toHaveLength(1);
    expect(s.respawnQueue[0].kind).toBe('tiger');
    expect(s.respawnQueue[0].at).toBeCloseTo(s.time - 0.5 + 45, 0);
  });

  it('la oveja suelta 2 de lana y da 40 puntos; el duende una aguja y 60', () => {
    const a = setup({ item: 'stone_sword', count: 1 }, 'sheep', 60);
    hitTimes(a.world, a.id, a.c, 7);
    expect(a.world.getState().groundItems.map((g) => `${g.item}x${g.count}`)).toEqual(['woolx2']);
    expect(a.p.points).toBe(40);
    const b = setup({ item: 'stone_sword', count: 1 }, 'goblin', 60);
    hitTimes(b.world, b.id, b.c, 3);
    expect(b.world.getState().groundItems.map((g) => `${g.item}x${g.count}`)).toEqual(['needlex1']);
    expect(b.p.points).toBe(60);
  });
});

describe('IA de criaturas', () => {
  it('el tigre a 300 px persigue y se acerca', () => {
    const { world, c, p } = setup(null, 'tiger', 300);
    const d0 = Math.hypot(c.x - p.x, c.y - p.y);
    world.stepSeconds(0.5);
    expect(c.mode).toBe('chase');
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(d0 - 50);
  });

  it('el tigre a 1000 px deambula', () => {
    const { world, c } = setup(null, 'tiger', 1000);
    world.stepSeconds(1);
    expect(c.mode).toBe('wander');
  });

  it('el duende a 200 px huye y se aleja', () => {
    const { world, c, p } = setup(null, 'goblin', 200);
    const d0 = Math.hypot(c.x - p.x, c.y - p.y);
    world.stepSeconds(0.5);
    expect(c.mode).toBe('flee');
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeGreaterThan(d0 + 50);
  });

  it('el duende nunca hace daño', () => {
    const { world, p } = setup(null, 'goblin', 10);
    world.stepSeconds(5);
    expect(world.drainEvents().some((e) => e.type === 'playerDamaged')).toBe(false);
    expect(p.health).toBe(100);
  });

  it('el tigre pegado ataca 7 veces en 6.5 s y mata al jugador', () => {
    const { world, id, p, c } = setup(null, 'tiger', 55);
    const events: GameEvent[] = [];
    for (let i = 0; i < 6.5 * 30; i++) {
      c.x = p.x + p.radius + c.radius + 2;
      c.y = p.y;
      world.step();
      events.push(...world.drainEvents());
    }
    const dmg = events.filter((e) => e.type === 'playerDamaged');
    expect(dmg).toHaveLength(7);
    for (const e of dmg) if (e.type === 'playerDamaged') expect(e.amount).toBeCloseTo(100 / 7, 2);
    expect(p.health).toBeLessThanOrEqual(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'playerDied', playerId: id }));
    expect(p.alive).toBe(false);
  });

  it('la oveja hace 12.5 de daño', () => {
    const { world, p, c } = setup(null, 'sheep', 55);
    c.x = p.x + p.radius + c.radius + 2;
    world.stepSeconds(0.5);
    const dmg = world.drainEvents().filter((e) => e.type === 'playerDamaged');
    expect(dmg.length).toBeGreaterThanOrEqual(1);
    if (dmg[0].type === 'playerDamaged') expect(dmg[0].amount).toBe(12.5);
  });

  it('las criaturas no entran en el mar', () => {
    const { world } = makeWorld(1);
    const s = world.getState();
    world.stepSeconds(20);
    for (const c of s.creatures) expect(terrainAt(s.map, c.x, c.y)).not.toBe('sea');
  });
});

describe('colisiones entre criaturas y jugador', () => {
  it('el tigre que persigue nunca se superpone al jugador', () => {
    const { world, c, p } = setup(null, 'tiger', 300);
    for (let i = 0; i < 90; i++) {
      world.step();
      expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeGreaterThanOrEqual(c.radius + p.radius - 1);
    }
    expect(c.mode).toBe('attack');
  });

  it('el jugador sí atraviesa una oveja quieta (regla del 2026-10-21: las criaturas no lo bloquean)', () => {
    const { world, id, c, p } = setup(null, 'sheep', 120);
    c.mode = 'wander';
    c.wanderTimer = 99;
    c.targetX = c.x;
    c.targetY = c.y;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    expect(p.x).toBeGreaterThan(c.x + c.radius);
  });
});

describe('aparición y reaparición', () => {
  it('spawnInitialCreatures crea 3 tigres, 4 ovejas, 3 duendes y 2 lobos en tierra lejos del spawn', () => {
    const world = new World(1);
    const s = world.getState();
    const counts = { tiger: 0, sheep: 0, goblin: 0, wolf: 0 };
    for (const c of s.creatures) {
      counts[c.kind]++;
      expect(['land', 'sand', 'snow']).toContain(terrainAt(s.map, c.x, c.y));
      expect(Math.hypot(c.x - s.map.spawnX, c.y - s.map.spawnY)).toBeGreaterThanOrEqual(600);
    }
    expect(counts).toEqual({ tiger: 3, sheep: 4, goblin: 3, wolf: 2 });
  });

  it('un tigre muerto reaparece a los 45 s lejos del jugador', () => {
    const { world, id, c } = setup({ item: 'stone_sword', count: 1 }, 'tiger', 60);
    hitTimes(world, id, c, 10);
    world.drainEvents();
    const s = world.getState();
    expect(s.creatures).toHaveLength(0);
    world.stepSeconds(44);
    expect(s.creatures).toHaveLength(0);
    world.stepSeconds(1.5);
    expect(s.creatures).toHaveLength(1);
    expect(s.creatures[0].kind).toBe('tiger');
    expect(s.creatures[0].hp).toBe(30);
    const p = world.player(id);
    expect(Math.hypot(s.creatures[0].x - p.x, s.creatures[0].y - p.y)).toBeGreaterThanOrEqual(600);
    expect(world.drainEvents()).toContainEqual({ type: 'creatureSpawned', entityId: s.creatures[0].id, kind: 'tiger' });
    expect(s.respawnQueue).toHaveLength(0);
  });

  it('no reaparece mientras se alcance maxActive', () => {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, creatures: { ...DEFAULT_CONFIG.creatures, maxActive: 1 } };
    const { world, id, c } = setup({ item: 'stone_sword', count: 1 }, 'tiger', 60, cfg);
    hitTimes(world, id, c, 10);
    const s = world.getState();
    putCreature(world, 'sheep', 100, 100);
    world.stepSeconds(50);
    expect(s.creatures.filter((x) => x.kind === 'tiger')).toHaveLength(0);
    expect(s.respawnQueue).toHaveLength(1);
    s.creatures.length = 0;
    world.stepSeconds(0.1);
    expect(s.creatures.filter((x) => x.kind === 'tiger')).toHaveLength(1);
  });
});

describe('manadas y bioma al aparecer', () => {
  it('los lobos iniciales aparecen en pareja (a menos de 120 px uno del otro)', () => {
    const world = new World(1);
    const wolves = world.getState().creatures.filter((c) => c.kind === 'wolf');
    expect(wolves).toHaveLength(2);
    expect(Math.hypot(wolves[0].x - wolves[1].x, wolves[0].y - wolves[1].y)).toBeLessThan(120);
    // sin nieve en el mapa de esta semilla, caen a cualquier terreno firme (documentado en spawnPack)
    for (const w of wolves) expect(isGround(terrainAt(world.getState().map, w.x, w.y))).toBe(true);
  });

  it('spawnPack con near coloca la manada entre min y max del punto', () => {
    const { world } = makeWorld();
    const s = world.getState();
    s.creatures.length = 0;
    const events: GameEvent[] = [];
    const pack = spawnPack(s, 'wolf', world.cfg, new Rng(3), events, { x: s.map.spawnX, y: s.map.spawnY, min: 500, max: 800 });
    expect(pack).toHaveLength(2);
    for (const w of pack) {
      const d = Math.hypot(w.x - s.map.spawnX, w.y - s.map.spawnY);
      expect(d).toBeGreaterThanOrEqual(480);
      expect(d).toBeLessThanOrEqual(900);
      expect(isGround(terrainAt(s.map, w.x, w.y))).toBe(true);
    }
    expect(events.filter((e) => e.type === 'creatureSpawned')).toHaveLength(2);
  });

  it('spawnPack respeta maxActive', () => {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, creatures: { ...DEFAULT_CONFIG.creatures, maxActive: 1 } };
    const { world } = makeWorld(7, cfg);
    const s = world.getState();
    s.creatures.length = 0;
    const pack = spawnPack(s, 'wolf', cfg, new Rng(3), []);
    expect(pack).toHaveLength(1);
  });
});
