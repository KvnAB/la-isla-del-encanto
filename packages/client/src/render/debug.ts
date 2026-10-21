import { Graphics } from 'pixi.js';
import { collisionRadius, type GameConfig, type WorldState } from '@draycol/core';

export interface HitboxCircle {
  x: number;
  y: number;
  /** Radio que bloquea el paso. */
  r: number;
  /** Radio dibujado (en recursos puede ser mayor que `r`). */
  visual: number;
  kind: 'resource' | 'creature' | 'player';
}

/** Círculos de colisión de todo lo sólido del mundo, para el overlay de depuración (tecla H en desarrollo). */
export function hitboxCircles(state: WorldState, cfg: GameConfig): HitboxCircle[] {
  const out: HitboxCircle[] = [];
  for (const r of state.resources) out.push({ x: r.x, y: r.y, r: collisionRadius(r, cfg), visual: r.radius, kind: 'resource' });
  for (const c of state.creatures) out.push({ x: c.x, y: c.y, r: c.radius, visual: c.radius, kind: 'creature' });
  for (const p of state.players) if (p.alive) out.push({ x: p.x, y: p.y, r: p.radius, visual: p.radius, kind: 'player' });
  return out;
}

const COLOR: Record<HitboxCircle['kind'], number> = { resource: 0xff3b3b, creature: 0xffb13b, player: 0x3bd1ff };

/** Pinta los círculos: el de colisión en color sólido y el dibujado, si es mayor, punteado tenue. */
export function drawHitboxes(g: Graphics, circles: HitboxCircle[]): void {
  g.clear();
  for (const c of circles) {
    g.circle(c.x, c.y, c.r).fill({ color: COLOR[c.kind], alpha: 0.12 }).stroke({ width: 2, color: COLOR[c.kind], alpha: 0.9 });
    if (c.visual > c.r + 0.5) g.circle(c.x, c.y, c.visual).stroke({ width: 1, color: COLOR[c.kind], alpha: 0.35 });
  }
}
