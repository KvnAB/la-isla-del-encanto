import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { clamp, dist } from '../vec.js';
import { addItem, findSlot, removeItem } from './inventory.js';

export function nearCampfire(state: WorldState, p: PlayerState, cfg: GameConfig): boolean {
  return state.campfires.some((c) => dist(c.x, c.y, p.x, p.y) <= cfg.vitals.campfireRadius);
}

/** Coloca una fogata delante del jugador consumiendo una del slot seleccionado. */
export function placeCampfire(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[]): void {
  const slot = p.inventory[p.selectedSlot];
  if (!slot || slot.item !== 'campfire') return;
  removeItem(p.inventory, 'campfire', 1);
  const d = p.radius + cfg.campfire.placeDistance;
  const fire = { id: nextId(state), x: p.x + Math.cos(p.angle) * d, y: p.y + Math.sin(p.angle) * d, expiresAt: state.time + cfg.campfire.durationSeconds };
  state.campfires.push(fire);
  events.push({ type: 'campfirePlaced', playerId: p.id, entityId: fire.id });
}

export function stepCampfires(state: WorldState, cfg: GameConfig, dt: number, events: GameEvent[]): void {
  for (let i = state.campfires.length - 1; i >= 0; i--) if (state.campfires[i].expiresAt <= state.time) state.campfires.splice(i, 1);

  for (const p of state.players) {
    if (!p.alive) continue;
    if (!nearCampfire(state, p, cfg)) {
      p.cookTimer = 0;
      continue;
    }
    p.warmth = clamp(p.warmth + cfg.vitals.campfireWarmthPerSec * dt, 0, 100);
    if (findSlot(p.inventory, 'raw_steak') === -1) {
      p.cookTimer = 0;
      continue;
    }
    p.cookTimer += dt;
    if (p.cookTimer + 1e-6 >= cfg.campfire.cookSeconds) {
      p.cookTimer = 0;
      removeItem(p.inventory, 'raw_steak', 1);
      if (addItem(p.inventory, 'cooked_steak', 1) > 0) {
        addItem(p.inventory, 'raw_steak', 1); // sin hueco: devolver el crudo
        continue;
      }
      p.points += cfg.points.cook;
      events.push({ type: 'cooked', playerId: p.id });
    }
  }
}
