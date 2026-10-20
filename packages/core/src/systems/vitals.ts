import type { GameConfig } from '../config.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { clamp } from '../vec.js';
import { nearCampfire } from './campfire.js';
import { findSlot } from './inventory.js';

export function stepVitals(state: WorldState, p: PlayerState, cfg: GameConfig, dt: number, _events: GameEvent[]): void {
  if (!p.alive) return;
  const v = cfg.vitals;
  const rate = 100 / v.drainSeconds;

  p.hunger -= rate * dt;
  if (p.inWater) p.thirst += v.thirstRefillPerSec * dt;
  else p.thirst -= rate * dt;

  if (!nearCampfire(state, p, cfg)) {
    let mult = 1;
    if (state.isNight) mult *= v.nightColdMult;
    if (p.inWater) mult *= v.waterColdMult;
    if (findSlot(p.inventory, 'coat1') !== -1) mult *= v.coatColdMult;
    p.warmth -= rate * mult * dt;
  }

  p.hunger = clamp(p.hunger, 0, 100);
  p.thirst = clamp(p.thirst, 0, 100);
  p.warmth = clamp(p.warmth, 0, 100);

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
