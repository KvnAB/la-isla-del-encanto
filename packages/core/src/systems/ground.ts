import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import type { GameEvent, GroundItemState, ItemId, PlayerState, WorldState } from '../types.js';
import { addItem } from './inventory.js';

export function dropToGround(state: WorldState, item: ItemId, count: number, x: number, y: number, cfg: GameConfig): GroundItemState {
  const g: GroundItemState = { id: nextId(state), item, count, x, y, expiresAt: state.time + cfg.groundItemSeconds };
  state.groundItems.push(g);
  return g;
}

/** Elimina los objetos vencidos. */
export function stepGroundItems(state: WorldState): void {
  const now = state.time;
  for (let i = state.groundItems.length - 1; i >= 0; i--) if (state.groundItems[i].expiresAt <= now) state.groundItems.splice(i, 1);
}

/** Intenta recoger. Lo que no cabe se queda en el suelo. */
export function tryPickup(state: WorldState, p: PlayerState, g: GroundItemState, events: GameEvent[]): void {
  const notAdded = addItem(p.inventory, g.item, g.count);
  const picked = g.count - notAdded;
  if (picked <= 0) {
    events.push({ type: 'inventoryFull', playerId: p.id });
    return;
  }
  events.push({ type: 'itemPicked', playerId: p.id, item: g.item, amount: picked });
  g.count = notAdded;
  if (g.count <= 0) {
    const i = state.groundItems.indexOf(g);
    if (i !== -1) state.groundItems.splice(i, 1);
  }
}
