import { Container, Graphics } from 'pixi.js';
import { PALETTE } from '../palette';

export interface CampfireView extends Container {
  flame: Graphics;
  glow: Graphics;
}

export function makeCampfire(): CampfireView {
  const c = new Container() as CampfireView;
  const logs = new Graphics();
  for (const sign of [1, -1]) {
    logs.moveTo(-18, -9 * sign).lineTo(18, 9 * sign).stroke({ width: 9, color: PALETTE.fireLog, cap: 'round' });
    logs.moveTo(-18, -9 * sign).lineTo(18, 9 * sign).stroke({ width: 3, color: PALETTE.skinOutline, cap: 'round', alpha: 0.35 });
  }
  c.addChild(logs);
  const flame = new Graphics();
  drawFlame(flame, 1);
  c.addChild(flame);
  c.flame = flame;
  c.glow = new Graphics();
  return c;
}

function drawFlame(g: Graphics, k: number): void {
  g.clear();
  g.moveTo(0, -26 * k)
    .bezierCurveTo(10 * k, -16 * k, 14 * k, -7, 9, 1)
    .bezierCurveTo(6, -4, 3, -6, 0, -1)
    .bezierCurveTo(-3, -6, -6, -4, -9, 1)
    .bezierCurveTo(-14 * k, -7, -10 * k, -16 * k, 0, -26 * k)
    .closePath()
    .fill(PALETTE.fireOuter)
    .stroke({ width: 2.5, color: PALETTE.fireOutline });
  g.moveTo(0, -16 * k)
    .bezierCurveTo(6 * k, -10 * k, 7, -4, 4, 0)
    .bezierCurveTo(2, -3, -2, -3, -4, 0)
    .bezierCurveTo(-7, -4, -6 * k, -10 * k, 0, -16 * k)
    .closePath()
    .fill(PALETTE.fireInner);
}

/** Parpadeo sutil de la llama. */
export function animateCampfire(c: CampfireView, t: number): void {
  const k = 1 + Math.sin(t * 9) * 0.07 + Math.sin(t * 23) * 0.04;
  drawFlame(c.flame, k);
  c.flame.rotation = Math.sin(t * 7) * 0.05;
}
