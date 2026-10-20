import { Graphics } from 'pixi.js';
import { PALETTE } from '../palette';

/** Anillo fino que muestra el porcentaje de regeneración de un recurso roto. */
export function makeRegenRing(): Graphics {
  return new Graphics();
}

export function updateRegenRing(g: Graphics, progress: number, r: number): void {
  g.clear();
  g.circle(0, 0, r + 6).stroke({ width: 3, color: PALETTE.hudPanel, alpha: 0.35 });
  if (progress <= 0) return;
  g.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress)).stroke({ width: 3, color: PALETTE.hudAccent, cap: 'round' });
}
