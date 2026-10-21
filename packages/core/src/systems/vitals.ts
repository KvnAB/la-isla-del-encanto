import type { GameConfig } from '../config.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { clamp } from '../vec.js';
import { nearCampfire } from './campfire.js';
import { findSlot } from './inventory.js';

/** El abrigo abriga solo si se tiene y está puesto. */
export function coatWorn(p: PlayerState): boolean {
  return p.coatOn && findSlot(p.inventory, 'coat1') !== -1;
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
    if (state.isNight) mult *= v.nightColdMult;
    if (p.inWater) mult *= v.waterColdMult;
    if (coatWorn(p)) mult *= v.coatColdMult;
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
  } else if (state.time >= p.noRegenUntil) {
    const good = bars.every((b) => b >= v.goodThreshold);
    p.health += (good ? v.healthRegenGood : v.healthRegenBase) * dt;
  }
  p.health = clamp(p.health, 0, 100);
}
