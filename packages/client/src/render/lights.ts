import type { GameConfig, WorldState } from '@draycol/core';

/** Una fuente de luz de noche, en coordenadas de mundo. `warm` añade el resplandor naranja. */
export interface Light {
  x: number;
  y: number;
  r: number;
  warm: boolean;
}

/**
 * Luces de la noche: el jugador local siempre ve un círculo pequeño y frío alrededor de sí mismo;
 * con una antorcha en cualquier slot del inventario el círculo es grande y cálido. Cada fogata es otra luz cálida.
 */
export function lightsFor(state: WorldState, cfg: GameConfig, playerId: number): Light[] {
  const out: Light[] = [];
  const p = state.players.find((x) => x.id === playerId);
  if (p && p.alive) {
    const torch = p.inventory.some((s) => s?.item === 'torch');
    out.push({ x: p.x, y: p.y, r: torch ? cfg.lights.torch : cfg.lights.player, warm: torch });
  }
  for (const c of state.campfires) out.push({ x: c.x, y: c.y, r: cfg.lights.campfire, warm: true });
  return out;
}
