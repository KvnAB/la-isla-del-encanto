import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import { findLandSpot, isGround, terrainAt } from '../island.js';
import type { Rng } from '../rng.js';
import type { CreatureKind, CreatureState, GameEvent, PlayerState, WorldState } from '../types.js';
import { angleTo, dist, norm } from '../vec.js';
import { dropToGround } from './ground.js';
import { inArc, inReach, nearest } from './hit.js';
import { removeItem } from './inventory.js';
import { moveCircle, resourceSolids, type Solid } from './movement.js';
import { weaponClassOf } from './resources.js';

function makeCreature(state: WorldState, kind: CreatureKind, x: number, y: number, cfg: GameConfig): CreatureState {
  const def = cfg.creatures.defs[kind];
  return { id: nextId(state), kind, x, y, angle: 0, radius: def.radius, hp: def.hp, mode: 'wander', targetX: x, targetY: y, attackCooldown: 0, wanderTimer: 0, raid: false, owner: null };
}

function fitsOnLand(state: WorldState, x: number, y: number, r: number): boolean {
  for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
    if (!isGround(terrainAt(state.map, x + dx, y + dy))) return false;
  }
  return true;
}

function farFromPlayers(state: WorldState, x: number, y: number, d: number): boolean {
  return state.players.every((p) => !p.alive || dist(p.x, p.y, x, y) >= d);
}

function spotFree(state: WorldState, x: number, y: number, radius: number): boolean {
  if (!fitsOnLand(state, x, y, radius)) return false;
  return !state.resources.some((r) => dist(r.x, r.y, x, y) < r.radius + radius + 10);
}

export interface SpawnNear {
  x: number;
  y: number;
  min: number;
  max: number;
}

/**
 * Crea una manada de `packSize` (o `size`) criaturas: la primera en un punto libre del bioma de la definición
 * (si tras 300 intentos no hay sitio en ese bioma, en cualquier terreno firme), lejos de los jugadores;
 * las demás a 40–70 px de ella. Con `near`, en un anillo [min, max] alrededor de ese punto y en cualquier bioma.
 * Respeta `maxActive`. Devuelve las criaturas creadas (vacío si no cabe ninguna).
 */
export function spawnPack(state: WorldState, kind: CreatureKind, cfg: GameConfig, rng: Rng, events: GameEvent[], near?: SpawnNear, size?: number, raid = false): CreatureState[] {
  const def = cfg.creatures.defs[kind];
  const want = size ?? def.packSize ?? 1;
  const out: CreatureState[] = [];
  const room = () => state.creatures.length < cfg.creatures.maxActive;
  if (!room()) return out;

  const ref = state.players[0] ?? { x: state.map.spawnX, y: state.map.spawnY };
  let first: { x: number; y: number } | null = null;
  for (let i = 0; i < 600 && !first; i++) {
    let p: { x: number; y: number };
    if (near) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(near.min, near.max);
      p = { x: near.x + Math.cos(a) * d, y: near.y + Math.sin(a) * d };
      if (!isGround(terrainAt(state.map, p.x, p.y))) continue;
    } else {
      p = findLandSpot(state.map, rng, { x: ref.x, y: ref.y, d: cfg.creatures.minSpawnDistFromPlayer }, i < 300 ? def.biome : undefined);
      if (!farFromPlayers(state, p.x, p.y, cfg.creatures.minSpawnDistFromPlayer)) continue;
    }
    if (!spotFree(state, p.x, p.y, def.radius)) continue;
    first = p;
  }
  if (!first) return out;

  const add = (x: number, y: number) => {
    const c = makeCreature(state, kind, x, y, cfg);
    c.raid = raid;
    if (raid) c.mode = 'chase'; // la manada aparece fuera de su radio de detección: nace persiguiendo
    state.creatures.push(c);
    out.push(c);
    events.push({ type: 'creatureSpawned', entityId: c.id, kind });
  };
  add(first.x, first.y);
  for (let k = 1; k < want && room(); k++) {
    let placed = false;
    for (let i = 0; i < 40 && !placed; i++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(40, 70) + def.radius;
      const x = first.x + Math.cos(a) * d;
      const y = first.y + Math.sin(a) * d;
      if (!spotFree(state, x, y, def.radius)) continue;
      add(x, y);
      placed = true;
    }
    if (!placed) add(first.x, first.y); // sin hueco alrededor: encima de la primera, ellas se separan al moverse
  }
  return out;
}

/** Crea una criatura sola en su bioma, lejos de los jugadores. null si se alcanzó maxActive o no hay sitio. */
export function spawnCreature(state: WorldState, kind: CreatureKind, cfg: GameConfig, rng: Rng): CreatureState | null {
  return spawnPack(state, kind, cfg, rng, [], undefined, 1)[0] ?? null;
}

export function spawnInitialCreatures(state: WorldState, cfg: GameConfig, rng: Rng, events: GameEvent[] = []): void {
  for (const kind of Object.keys(cfg.creatures.defs) as CreatureKind[]) {
    const def = cfg.creatures.defs[kind];
    for (let n = 0; n < def.initialCount; n += def.packSize ?? 1) spawnPack(state, kind, cfg, rng, events, undefined, Math.min(def.packSize ?? 1, def.initialCount - n));
  }
}

/**
 * Desplaza un círculo `distance` px alejándose de `from`, respetando terreno y recursos.
 * Las criaturas no nadan (`canSwim` falso): si el empujón las metiera en agua se quedarían atrapadas, así que se descarta.
 */
function knockback(state: WorldState, cfg: GameConfig, body: { x: number; y: number; radius: number }, from: { x: number; y: number }, distance: number, canSwim: boolean): void {
  const [dx, dy] = norm(body.x - from.x, body.y - from.y);
  if (dx === 0 && dy === 0) return;
  const [nx, ny] = moveCircle(state.map, body.x, body.y, body.radius, dx * distance, dy * distance, resourceSolids(state, cfg));
  if (!canSwim && terrainAt(state.map, nx, ny) === 'water') return;
  body.x = nx;
  body.y = ny;
}

/**
 * Quita una criatura muerta del mundo. Salvaje: suelta el botín (con `max`, cantidad al azar), da sus puntos
 * a `killer` y, si no es de manada, se encola su reaparición. Domada: solo avisa a su dueño con `petDied`.
 */
export function killCreature(state: WorldState, c: CreatureState, cfg: GameConfig, rng: Rng, events: GameEvent[], killer: PlayerState | null): void {
  const i = state.creatures.indexOf(c);
  if (i !== -1) state.creatures.splice(i, 1);
  if (c.owner !== null) {
    events.push({ type: 'petDied', playerId: c.owner, entityId: c.id, kind: c.kind });
    return;
  }
  const def = cfg.creatures.defs[c.kind];
  def.loot.forEach((l, k) => {
    const a = (k / Math.max(1, def.loot.length)) * Math.PI * 2 + rng.next() * 0.5;
    const d = def.loot.length > 1 ? 18 : 0;
    const count = l.max !== undefined ? rng.int(l.count, l.max) : l.count;
    dropToGround(state, l.item, count, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, cfg);
  });
  if (killer) {
    killer.points += def.points;
    events.push({ type: 'creatureDied', playerId: killer.id, entityId: c.id, kind: c.kind });
  }
  if (!c.raid) state.respawnQueue.push({ kind: c.kind, at: state.time + cfg.creatures.respawnSeconds });
}

export function hitCreature(state: WorldState, p: PlayerState, c: CreatureState, cfg: GameConfig, rng: Rng, events: GameEvent[]): void {
  if (c.owner !== null) return; // a las domadas no se les pega
  const weapon = weaponClassOf(p.inventory[p.selectedSlot]);
  const amount = cfg.weaponDamage[weapon];
  c.hp -= amount;
  knockback(state, cfg, c, p, cfg.combat.creatureKnockback, false);
  events.push({ type: 'creatureHit', playerId: p.id, entityId: c.id, amount });
  if (c.hp <= 0) killCreature(state, c, cfg, rng, events, p);
}

/**
 * Doma la criatura salvaje más cercana al alcance y en arco cuyo `tameWith` sea el objeto seleccionado:
 * gasta una unidad, la criatura pasa a seguir al jugador con `taming.hp` de vida, suma `taming.points` y se encola una salvaje nueva
 * (así la isla no se queda sin ellas). Devuelve false si no había ninguna.
 */
export function tameCreature(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[]): boolean {
  const slot = p.inventory[p.selectedSlot];
  if (!slot) return false;
  const c = nearest(p, state.creatures, (t) => t.owner === null && cfg.creatures.defs[t.kind].tameWith === slot.item && inReach(p, t, cfg) && inArc(p, t, cfg));
  if (!c) return false;
  removeItem(p.inventory, slot.item, 1);
  c.owner = p.id;
  c.mode = 'follow';
  c.hp = cfg.taming.hp;
  c.attackCooldown = 0;
  p.points += cfg.taming.points;
  events.push({ type: 'creatureTamed', playerId: p.id, entityId: c.id, kind: c.kind });
  state.respawnQueue.push({ kind: c.kind, at: state.time + cfg.creatures.respawnSeconds });
  return true;
}

/** Al caer la noche: por cada criatura con `nightRaid`, una manada cerca del jugador (en cualquier bioma). */
export function onNightfall(state: WorldState, cfg: GameConfig, rng: Rng, events: GameEvent[]): void {
  const p = state.players.find((x) => x.alive);
  if (!p) return;
  const { min, max } = cfg.creatures.nightRaidDist;
  for (const kind of Object.keys(cfg.creatures.defs) as CreatureKind[]) {
    const n = cfg.creatures.defs[kind].nightRaid;
    if (n) spawnPack(state, kind, cfg, rng, events, { x: p.x, y: p.y, min, max }, n, true);
  }
}

/** Al amanecer: las manadas nocturnas desaparecen estén donde estén, sin botín ni reaparición. */
export function onDawn(state: WorldState, events: GameEvent[]): void {
  for (let i = state.creatures.length - 1; i >= 0; i--) {
    const c = state.creatures[i];
    if (!c.raid) continue;
    state.creatures.splice(i, 1);
    events.push({ type: 'creatureDespawned', entityId: c.id, kind: c.kind });
  }
}

/** Lo que una criatura salvaje puede perseguir y morder: un jugador vivo o una criatura domada. */
interface Target {
  x: number;
  y: number;
  radius: number;
  player: PlayerState | null;
  pet: CreatureState | null;
}

function nearestTarget(state: WorldState, c: CreatureState): { t: Target; d: number } | null {
  let best: Target | null = null;
  let bestD = Infinity;
  const consider = (t: Target) => {
    const d = dist(c.x, c.y, t.x, t.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  };
  for (const p of state.players) if (p.alive) consider({ x: p.x, y: p.y, radius: p.radius, player: p, pet: null });
  for (const o of state.creatures) if (o !== c && o.owner !== null) consider({ x: o.x, y: o.y, radius: o.radius, player: null, pet: o });
  return best ? { t: best, d: bestD } : null;
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

function wanderStep(state: WorldState, c: CreatureState, speed: number, dt: number, rng: Rng, solids: Solid[]): void {
  c.wanderTimer -= dt;
  if (c.wanderTimer <= 0) {
    c.wanderTimer = 2 + rng.next() * 3;
    pickWanderTarget(state, c, rng);
  }
  if (dist(c.x, c.y, c.targetX, c.targetY) > 4) moveToward(state, c, c.targetX, c.targetY, speed * 0.5, dt, solids);
}

/** Muerde a una criatura domada; si muere, desaparece sin botín. */
function biteCreature(state: WorldState, pet: CreatureState, amount: number, cfg: GameConfig, rng: Rng, events: GameEvent[]): void {
  pet.hp -= amount;
  if (pet.hp <= 0) killCreature(state, pet, cfg, rng, events, null);
}

/**
 * Criatura domada: `hunt` a la criatura salvaje agresiva más cercana a menos de `taming.guardRadius` del dueño
 * (el dueño cobra botín y puntos si la mata); si no hay, `follow` al dueño hasta `taming.followDist` y se cura
 * `taming.regenPerSec` por segundo hasta `taming.hp`.
 * Pasa por debajo del jugador (no lo trata como sólido) para no quedarse atascada tras él.
 * Sin dueño vivo, pasea.
 */
function stepPet(state: WorldState, c: CreatureState, cfg: GameConfig, dt: number, rng: Rng, events: GameEvent[], solids: Solid[]): void {
  const def = cfg.creatures.defs[c.kind];
  const owner = state.players.find((p) => p.id === c.owner && p.alive);
  if (!owner) {
    c.mode = 'wander';
    wanderStep(state, c, def.speed, dt, rng, solids);
    return;
  }
  let target: CreatureState | null = null;
  let bestD = Infinity;
  for (const o of state.creatures) {
    if (o === c || o.owner !== null || !cfg.creatures.defs[o.kind].aggressive) continue;
    if (dist(owner.x, owner.y, o.x, o.y) > cfg.taming.guardRadius) continue;
    const d = dist(c.x, c.y, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      target = o;
    }
  }
  if (target) {
    c.mode = 'hunt';
    const range = c.radius + target.radius + 8;
    if (bestD > range) {
      moveToward(state, c, target.x, target.y, def.speed, dt, solids);
      return;
    }
    c.angle = angleTo(c.x, c.y, target.x, target.y);
    if (c.attackCooldown <= 0 && def.damage > 0) {
      target.hp -= def.damage;
      c.attackCooldown = def.attackCooldown;
      events.push({ type: 'petHit', playerId: owner.id, entityId: target.id, amount: def.damage });
      if (target.hp <= 0) killCreature(state, target, cfg, rng, events, owner);
    }
    return;
  }
  c.mode = 'follow';
  c.hp = Math.min(cfg.taming.hp, c.hp + cfg.taming.regenPerSec * dt);
  if (dist(c.x, c.y, owner.x, owner.y) > cfg.taming.followDist) moveToward(state, c, owner.x, owner.y, def.speed, dt, solids);
}

export function stepCreatures(state: WorldState, cfg: GameConfig, dt: number, rng: Rng, events: GameEvent[]): void {
  const resourceOnly = resourceSolids(state, cfg);
  const solids: Solid[] = [...resourceOnly, ...state.players.filter((p) => p.alive)];
  // copia: una criatura puede morir (y salir de la lista) durante el paso de otra
  for (const c of [...state.creatures]) {
    if (!state.creatures.includes(c)) continue;
    const def = cfg.creatures.defs[c.kind];
    if (c.attackCooldown > 0) c.attackCooldown = Math.max(0, c.attackCooldown - dt);
    if (c.owner !== null) {
      stepPet(state, c, cfg, dt, rng, events, resourceOnly);
      continue;
    }
    const near = nearestTarget(state, c);
    const attackRange = near ? c.radius + near.t.radius + 8 : 0;

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
        wanderStep(state, c, def.speed, dt, rng, solids);
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
        moveToward(state, c, near.t.x, near.t.y, def.speed, dt, solids);
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
        c.angle = angleTo(c.x, c.y, near.t.x, near.t.y);
        if (c.attackCooldown <= 0 && def.damage > 0) {
          c.attackCooldown = def.attackCooldown;
          if (near.t.player) {
            const p = near.t.player;
            p.health -= def.damage;
            p.noRegenUntil = state.time + cfg.vitals.regenDelayAfterDamage;
            p.lastHitBy = c.kind;
            p.lastHitAt = state.time;
            knockback(state, cfg, p, c, cfg.combat.playerKnockback, true);
            events.push({ type: 'playerDamaged', playerId: p.id, amount: def.damage, byEntityId: c.id });
          } else if (near.t.pet) {
            biteCreature(state, near.t.pet, def.damage, cfg, rng, events);
          }
        }
        break;
      }
      case 'flee': {
        if (!near || near.d > def.fleeRadius * 2) {
          c.mode = 'wander';
          break;
        }
        const ax = c.x + (c.x - near.t.x);
        const ay = c.y + (c.y - near.t.y);
        const before = { x: c.x, y: c.y };
        moveToward(state, c, ax, ay, def.speed, dt, solids);
        // bloqueado contra agua/mar: intentar un desvío lateral
        if (dist(before.x, before.y, c.x, c.y) < 1e-3) {
          const a = angleTo(near.t.x, near.t.y, c.x, c.y) + (rng.next() < 0.5 ? 1 : -1) * Math.PI * 0.5;
          moveToward(state, c, c.x + Math.cos(a) * 100, c.y + Math.sin(a) * 100, def.speed, dt, solids);
        }
        break;
      }
      default:
        // `follow`/`hunt` solo tienen sentido domada; si perdió el dueño vuelve a pasear
        c.mode = 'wander';
        break;
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
