import type { GameConfig } from '../config.js';
import { isWalkable, terrainAt } from '../island.js';
import type { IslandMap, PlayerState, WorldState } from '../types.js';
import { collisionRadius } from './resources.js';

export interface Solid {
  x: number;
  y: number;
  radius: number;
}

/** Los recursos como sólidos, con su radio de colisión (no el dibujado). */
export function resourceSolids(state: WorldState, cfg: GameConfig): Solid[] {
  return state.resources.map((r) => ({ x: r.x, y: r.y, radius: collisionRadius(r, cfg) }));
}

function circleFits(map: IslandMap, x: number, y: number, r: number): boolean {
  return (
    isWalkable(terrainAt(map, x + r, y)) &&
    isWalkable(terrainAt(map, x - r, y)) &&
    isWalkable(terrainAt(map, x, y + r)) &&
    isWalkable(terrainAt(map, x, y - r))
  );
}

/**
 * Mueve un círculo (x,y,r) por (dx,dy) resolviendo contra terreno no caminable (eje a eje)
 * y contra círculos sólidos (empuje a lo largo de la normal). Devuelve la nueva posición.
 */
export function moveCircle(map: IslandMap, x: number, y: number, r: number, dx: number, dy: number, solids: Solid[]): [number, number] {
  let nx = x + dx;
  if (!circleFits(map, nx, y, r)) nx = x;
  let ny = y + dy;
  if (!circleFits(map, nx, ny, r)) ny = y;

  for (const s of solids) {
    const ox = nx - s.x;
    const oy = ny - s.y;
    const d = Math.hypot(ox, oy);
    const minD = r + s.radius;
    if (d >= minD) continue;
    if (d < 1e-6) {
      nx += minD;
      continue;
    }
    const push = minD - d;
    nx += (ox / d) * push;
    ny += (oy / d) * push;
  }
  // Si el empuje lo metió en terreno no caminable, deshacer el movimiento.
  if (!circleFits(map, nx, ny, r)) return [x, y];
  return [nx, ny];
}

export function stepPlayerMovement(state: WorldState, p: PlayerState, cfg: GameConfig, dt: number, solids: Solid[]): void {
  p.inWater = terrainAt(state.map, p.x, p.y) === 'water';
  if (p.moveDx === 0 && p.moveDy === 0) return;
  const speed = cfg.player.speed * (p.inWater ? cfg.player.waterSpeedMult : 1);
  const [nx, ny] = moveCircle(state.map, p.x, p.y, p.radius, p.moveDx * speed * dt, p.moveDy * speed * dt, solids);
  p.x = nx;
  p.y = ny;
  p.inWater = terrainAt(state.map, p.x, p.y) === 'water';
}
