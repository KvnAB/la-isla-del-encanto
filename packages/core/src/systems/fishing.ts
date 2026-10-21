import type { GameConfig } from '../config.js';
import { terrainAt } from '../island.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { addItem } from './inventory.js';

/** ¿Hay agua (río o lago, nunca mar) donde está el jugador o a lo largo de su línea de apuntado hasta el alcance? */
export function aimedAtWater(state: WorldState, p: PlayerState, cfg: GameConfig): boolean {
  if (p.inWater) return true;
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  for (let d = p.radius + 10; d <= p.radius + cfg.player.reach; d += 20) if (terrainAt(state.map, p.x + cos * d, p.y + sin * d) === 'water') return true;
  return false;
}

/** Lanza la caña si hay agua delante y no se está pescando ya. */
export function startFishing(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[]): void {
  if (p.fishingUntil > 0) return;
  if (!aimedAtWater(state, p, cfg)) return;
  p.fishingUntil = state.time + cfg.fishing.seconds;
  events.push({ type: 'fishingStarted', playerId: p.id });
}

/** Cada paso: moverse o soltar la caña cancela; al cumplirse el tiempo, un pescado crudo y puntos. */
export function stepFishing(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[]): void {
  if (p.fishingUntil <= 0) return;
  const moving = p.moveDx !== 0 || p.moveDy !== 0;
  if (moving || p.inventory[p.selectedSlot]?.item !== 'fishing_rod') {
    p.fishingUntil = 0;
    return;
  }
  if (state.time < p.fishingUntil) return;
  p.fishingUntil = 0;
  if (addItem(p.inventory, 'raw_fish', 1) > 0) {
    events.push({ type: 'inventoryFull', playerId: p.id });
    return;
  }
  p.points += cfg.fishing.points;
  events.push({ type: 'fished', playerId: p.id });
}
