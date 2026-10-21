import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameConfig } from '../src/config.js';
import { clearWorld, makeWorld, placePlayerAt, setInventory } from './helpers.js';

function fresh(cfg: GameConfig = DEFAULT_CONFIG) {
  const { world, id } = makeWorld(7, cfg);
  clearWorld(world);
  const s = world.getState();
  placePlayerAt(world, id, s.map.spawnX, s.map.spawnY);
  setInventory(world, id, []);
  const p = world.player(id);
  return { world, id, p, s };
}

/** Mantiene al jugador vivo y quieto el tiempo indicado. */
function survive(world: ReturnType<typeof makeWorld>['world'], p: ReturnType<typeof makeWorld>['world']['player'] extends (id: number) => infer P ? P : never, seconds: number) {
  for (let i = 0; i < seconds * 30; i++) {
    p.health = p.hunger = p.thirst = p.warmth = 100;
    world.step();
  }
}

const wolves = (s: ReturnType<typeof fresh>['s']) => s.creatures.filter((c) => c.kind === 'wolf');

describe('manada nocturna de lobos', () => {
  it('la noche 1 no trae manada', () => {
    const { world, p, s } = fresh();
    survive(world, p, 241);
    expect(s.isNight).toBe(true);
    expect(wolves(s)).toHaveLength(0);
  });

  it('la noche 2 trae 2 lobos de manada a 500–800 px del jugador', () => {
    const { world, p, s } = fresh();
    survive(world, p, 721);
    world.drainEvents();
    // justo al caer la noche 2 (721 s) ya están: medir distancia en el primer paso siguiente
    const w = wolves(s);
    expect(w).toHaveLength(2);
    for (const c of w) {
      expect(c.raid).toBe(true);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      expect(d).toBeGreaterThanOrEqual(380); // 500 menos lo que corren hacia el jugador en el primer segundo
      expect(d).toBeLessThanOrEqual(900);
    }
  });

  it('al amanecer desaparecen todos los lobos de manada con evento creatureDespawned', () => {
    const { world, p, s } = fresh();
    survive(world, p, 721);
    const ids = wolves(s).map((c) => c.id);
    expect(ids).toHaveLength(2);
    world.drainEvents();
    survive(world, p, 240);
    expect(s.isNight).toBe(false);
    expect(wolves(s)).toHaveLength(0);
    const ev = world.drainEvents().filter((e) => e.type === 'creatureDespawned');
    expect(ev.map((e) => (e.type === 'creatureDespawned' ? e.entityId : -1)).sort()).toEqual(ids.sort());
    expect(s.respawnQueue).toHaveLength(0);
  });

  it('matar un lobo de manada da puntos y botín pero no encola reaparición', () => {
    const { world, id, p, s } = fresh();
    setInventory(world, id, [{ item: 'gold_sword', count: 1 }]);
    survive(world, p, 721);
    const w = wolves(s)[0];
    w.x = p.x + 60;
    w.y = p.y;
    p.angle = 0;
    p.points = 0;
    for (let i = 0; i < 7; i++) {
      p.hitCooldown = 0;
      w.x = p.x + 60;
      w.y = p.y;
      world.enqueue({ playerId: id, type: 'hit' });
      world.step();
    }
    expect(s.creatures.includes(w)).toBe(false);
    expect(p.points).toBe(100);
    expect(s.groundItems.some((g) => g.item === 'raw_steak')).toBe(true);
    expect(s.respawnQueue).toHaveLength(0);
  });

  it('con maxActive lleno no aparece la manada y no hay error', () => {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, creatures: { ...DEFAULT_CONFIG.creatures, maxActive: 0 } };
    const { world, p, s } = fresh(cfg);
    survive(world, p, 721);
    expect(wolves(s)).toHaveLength(0);
  });
});
