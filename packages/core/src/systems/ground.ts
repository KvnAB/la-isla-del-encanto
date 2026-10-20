import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import type { GroundItemState, ItemId, WorldState } from '../types.js';

export function dropToGround(state: WorldState, item: ItemId, count: number, x: number, y: number, cfg: GameConfig): GroundItemState {
  const g: GroundItemState = { id: nextId(state), item, count, x, y, expiresAt: state.time + cfg.groundItemSeconds };
  state.groundItems.push(g);
  return g;
}
