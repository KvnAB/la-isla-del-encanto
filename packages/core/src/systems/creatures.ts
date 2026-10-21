import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import { findLandSpot, terrainAt } from '../island.js';
import type { Rng } from '../rng.js';
import type { CreatureKind, CreatureState, GameEvent, PlayerState, WorldState } from '../types.js';
import { angleTo, dist } from '../vec.js';
import { dropToGround } from './ground.js';
import { moveCircle, resourceSolids, type Solid } from './movement.js';
import { weaponClassOf } from './resources.js';

const KINDS: CreatureKind[] = ['tiger', 'sheep', 'goblin'];

function makeCreature(state: WorldState, kind: CreatureKind, x: number, y: number, cfg: GameConfig): CreatureState {
  const def = cfg.creatures.defs[kind];
  return { id: nextId(state), kind, x, y, angle: 0, radius: def.radius, hp: def.hp, mode: 'wander', targetX: x, targetY: y, attackCooldown: 0, wanderTimer: 0 };
}

function fitsOnLand(state: WorldState, x: number, y: number, r: number): boolean {
  for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
    const t = terrainAt(state.map, x + dx, y + dy);
    if (t !== 'land' && t !== 'sand') return false;
  }
  return true;
}

function farFromPlayers(state: WorldState, x: number, y: number, d: number): boolean {
  return state.players.every((p) => !p.alive || dist(p.x, p.y, x, y) >= d);
}

/** Crea una criatura en tierra, lejos de los jugadores. null si se alcanzó maxActive o no hay sitio. */
export function spawnCreature(state: WorldState, kind: CreatureKind, cfg: GameConfig, rng: Rng): CreatureState | null {
  if (state.creatures.length >= cfg.creatures.maxActive) return null;
  const def = cfg.creatures.defs[kind];
  const ref = state.players[0] ?? { x: state.map.spawnX, y: state.map.spawnY };
  for (let i = 0; i < 300; i++) {
    const p = findLandSpot(state.map, rng, { x: ref.x, y: ref.y, d: cfg.creatures.minSpawnDistFromPlayer });
    if (!fitsOnLand(state, p.x, p.y, def.radius)) continue;
    if (!farFromPlayers(state, p.x, p.y, cfg.creatures.minSpawnDistFromPlayer)) continue;
    if (state.resources.some((r) => dist(r.x, r.y, p.x, p.y) < r.radius + def.radius + 10)) continue;
    const c = makeCreature(state, kind, p.x, p.y, cfg);
    state.creatures.push(c);
    return c;
  }
  return null;
}

export function spawnInitialCreatures(state: WorldState, cfg: GameConfig, rng: Rng, events: GameEvent[] = []): void {
  for (const kind of KINDS) {
    for (let i = 0; i < cfg.creatures.defs[kind].initialCount; i++) {
      const c = spawnCreature(state, kind, cfg, rng);
      if (c) events.push({ type: 'creatureSpawned', entityId: c.id, kind });
    }
  }
}

export function hitCreature(state: WorldState, p: PlayerState, c: CreatureState, cfg: GameConfig, rng: Rng, events: GameEvent[]): void {
  const weapon = weaponClassOf(p.inventory[p.selectedSlot]);
  c.hp -= cfg.weaponDamage[weapon];
  events.push({ type: 'creatureHit', playerId: p.id, entityId: c.id });
  if (c.hp > 0) return;

  const def = cfg.creatures.defs[c.kind];
  const i = state.creatures.indexOf(c);
  if (i !== -1) state.creatures.splice(i, 1);
  def.loot.forEach((l, k) => {
    const a = (k / Math.max(1, def.loot.length)) * Math.PI * 2 + rng.next() * 0.5;
    const d = def.loot.length > 1 ? 18 : 0;
    dropToGround(state, l.item, l.count, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, cfg);
  });
  p.points += def.points;
  events.push({ type: 'creatureDied', playerId: p.id, entityId: c.id, kind: c.kind });
  state.respawnQueue.push({ kind: c.kind, at: state.time + cfg.creatures.respawnSeconds });
}

function nearestPlayer(state: WorldState, c: CreatureState): { p: PlayerState; d: number } | null {
  let best: PlayerState | null = null;
  let bestD = Infinity;
  for (const p of state.players) {
    if (!p.alive) continue;
    const d = dist(c.x, c.y, p.x, p.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { p: best, d: bestD } : null;
}

function pickWanderTarget(state: WorldState, c: CreatureState, rng: Rng): void {
  for (let i = 0; i < 8; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = 80 + rng.next() * 220;
    const x = c.x + Math.cos(a) * r;
    const y = c.y + Math.sin(a) * r;
    if (fitsOnLand(state, x, y, c.radius)) {
      c.targetX = x;
      c.targetY = y;
      return;
    }
  }
  c.targetX = c.x;
  c.targetY = c.y;
}

function moveToward(state: WorldState, c: CreatureState, tx: number, ty: number, speed: number, dt: number, solids: Solid[]): void {
  const d = dist(c.x, c.y, tx, ty);
  if (d < 1e-3) return;
  const step = Math.min(d, speed * dt);
  const dx = ((tx - c.x) / d) * step;
  const dy = ((ty - c.y) / d) * step;
  c.angle = Math.atan2(dy, dx);
  const [nx, ny] = moveCircle(state.map, c.x, c.y, c.radius, dx, dy, solids);
  // las criaturas no nadan: si el destino es agua, no se mueven
  if (terrainAt(state.map, nx, ny) === 'water') return;
  c.x = nx;
  c.y = ny;
}

export function stepCreatures(state: WorldState, cfg: GameConfig, dt: number, rng: Rng, events: GameEvent[]): void {
  const solids: Solid[] = [...resourceSolids(state, cfg), ...state.players.filter((p) => p.alive)];
  for (const c of state.creatures) {
    const def = cfg.creatures.defs[c.kind];
    if (c.attackCooldown > 0) c.attackCooldown = Math.max(0, c.attackCooldown - dt);
    const near = nearestPlayer(state, c);
    const attackRange = near ? c.radius + near.p.radius + 8 : 0;

    switch (c.mode) {
      case 'wander': {
        if (near && def.aggressive && near.d <= def.aggroRadius) {
          c.mode = 'chase';
          break;
        }
        if (near && !def.aggressive && def.fleeRadius > 0 && near.d <= def.fleeRadius) {
          c.mode = 'flee';
          break;
        }
        c.wanderTimer -= dt;
        if (c.wanderTimer <= 0) {
          c.wanderTimer = 2 + rng.next() * 3;
          pickWanderTarget(state, c, rng);
        }
        if (dist(c.x, c.y, c.targetX, c.targetY) > 4) moveToward(state, c, c.targetX, c.targetY, def.speed * 0.5, dt, solids);
        break;
      }
      case 'chase': {
        if (!near || near.d > def.aggroRadius * 1.5) {
          c.mode = 'wander';
          break;
        }
        if (near.d <= attackRange) {
          c.mode = 'attack';
          break;
        }
        moveToward(state, c, near.p.x, near.p.y, def.speed, dt, solids);
        break;
      }
      case 'attack': {
        if (!near) {
          c.mode = 'wander';
          break;
        }
        if (near.d > attackRange + 6) {
          c.mode = 'chase';
          break;
        }
        c.angle = angleTo(c.x, c.y, near.p.x, near.p.y);
        if (c.attackCooldown <= 0 && def.damage > 0) {
          near.p.health -= def.damage;
          near.p.noRegenUntil = state.time + cfg.vitals.regenDelayAfterDamage;
          c.attackCooldown = def.attackCooldown;
          events.push({ type: 'playerDamaged', playerId: near.p.id, amount: def.damage, byEntityId: c.id });
        }
        break;
      }
      case 'flee': {
        if (!near || near.d > def.fleeRadius * 2) {
          c.mode = 'wander';
          break;
        }
        const ax = c.x + (c.x - near.p.x);
        const ay = c.y + (c.y - near.p.y);
        const before = { x: c.x, y: c.y };
        moveToward(state, c, ax, ay, def.speed, dt, solids);
        // bloqueado contra agua/mar: intentar un desvío lateral
        if (dist(before.x, before.y, c.x, c.y) < 1e-3) {
          const a = angleTo(near.p.x, near.p.y, c.x, c.y) + (rng.next() < 0.5 ? 1 : -1) * Math.PI * 0.5;
          moveToward(state, c, c.x + Math.cos(a) * 100, c.y + Math.sin(a) * 100, def.speed, dt, solids);
        }
        break;
      }
    }
  }
}

export function stepRespawns(state: WorldState, cfg: GameConfig, rng: Rng, events: GameEvent[]): void {
  for (let i = state.respawnQueue.length - 1; i >= 0; i--) {
    const q = state.respawnQueue[i];
    if (q.at > state.time) continue;
    const c = spawnCreature(state, q.kind, cfg, rng);
    if (!c) continue;
    state.respawnQueue.splice(i, 1);
    events.push({ type: 'creatureSpawned', entityId: c.id, kind: c.kind });
  }
}
