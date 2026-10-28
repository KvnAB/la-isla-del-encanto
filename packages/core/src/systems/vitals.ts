import type { GameConfig } from '../config.js';
import { terrainAt } from '../island.js';
import type { CoatId, GameEvent, PlayerState, WorldState } from '../types.js';
import { clamp } from '../vec.js';
import { nearCampfire } from './campfire.js';
import { findSlot } from './inventory.js';

/** El abrigo puesto (el mejor que se lleve), o null. Solo abriga si se tiene y está puesto. */
export function coatWorn(p: PlayerState): CoatId | null {
  if (!p.coatOn) return null;
  if (findSlot(p.inventory, 'coat2') !== -1) return 'coat2';
  if (findSlot(p.inventory, 'coat1') !== -1) return 'coat1';
  return null;
}

export function stepVitals(state: WorldState, p: PlayerState, cfg: GameConfig, dt: number, events: GameEvent[]): void {
  if (!p.alive) return;
  const v = cfg.vitals;
  const rate = 100 / v.drainSeconds;
  const before = { hunger: p.hunger, thirst: p.thirst, warmth: p.warmth };

  p.hunger -= rate * dt;
  if (p.inWater) p.thirst += v.thirstRefillPerSec * dt;
  else p.thirst -= rate * dt;

  if (!nearCampfire(state, p, cfg)) {
    let mult = 1;
    const snow = terrainAt(state.map, p.x, p.y) === 'snow';
    if (snow) mult *= state.isNight ? v.snowNightColdMult : v.snowColdMult;
    else if (state.isNight) mult *= v.nightColdMult;
    if (p.inWater) mult *= v.waterColdMult;
    const coat = coatWorn(p);
    if (coat) mult *= v.coatColdMult[coat];
    if (p.mount !== null) mult *= cfg.riding.coldMult; // la montura abriga
    p.warmth -= rate * mult * dt;
  }

  p.hunger = clamp(p.hunger, 0, 100);
  p.thirst = clamp(p.thirst, 0, 100);
  p.warmth = clamp(p.warmth, 0, 100);
  // Aviso al cruzar el umbral hacia abajo (una vez por cruce).
  for (const bar of ['hunger', 'thirst', 'warmth'] as const) if (before[bar] >= v.lowThreshold && p[bar] < v.lowThreshold) events.push({ type: 'vitalLow', playerId: p.id, bar });

  const bars = [p.hunger, p.thirst, p.warmth];
  const empty = bars.filter((b) => b <= 0).length;
  if (empty > 0) {
    p.health -= empty * v.healthLossPerEmptyBar * dt;
  } else if (p.health > 0 && state.time >= p.noRegenUntil) {
    // con la vida en 0 no se regenera: el jugador muere en este mismo paso
    const good = bars.every((b) => b >= v.goodThreshold);
    p.health += (good ? v.healthRegenGood : v.healthRegenBase) * dt;
  }
  p.health = clamp(p.health, 0, 100);
}
