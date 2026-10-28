import type { GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import { isGround, terrainAt } from '../island.js';
import type { GameEvent, PlayerState, WallState, WorldState } from '../types.js';
import { removeItem } from './inventory.js';
import type { Solid } from './movement.js';

/** Las piedras del muro como sólidos (para criaturas salvajes). */
export function wallSolids(state: WorldState): Solid[] {
  return state.walls;
}

/** Coloca un anillo de piedras alrededor del jugador gastando un `stone_wall`; las que caerían en agua o mar se saltan. */
export function placeWall(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[]): void {
  const slot = p.inventory[p.selectedSlot];
  if (!slot || slot.item !== 'stone_wall') return;
  removeItem(p.inventory, 'stone_wall', 1);
  const { stones, ringRadius, stoneRadius, hp } = cfg.wall;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2 + p.angle;
    const x = p.x + Math.cos(a) * ringRadius;
    const y = p.y + Math.sin(a) * ringRadius;
    if (!isGround(terrainAt(state.map, x, y))) continue;
    state.walls.push({ id: nextId(state), x, y, radius: stoneRadius, hp });
  }
  events.push({ type: 'wallPlaced', playerId: p.id });
}

/** Un golpe de pico a una piedra; a 0 desaparece. */
export function hitWall(state: WorldState, p: PlayerState, w: WallState, events: GameEvent[]): void {
  w.hp -= 1;
  if (w.hp > 0) {
    events.push({ type: 'wallHit', playerId: p.id, entityId: w.id, hp: w.hp });
    return;
  }
  const i = state.walls.indexOf(w);
  if (i !== -1) state.walls.splice(i, 1);
  events.push({ type: 'wallBroken', entityId: w.id });
}
