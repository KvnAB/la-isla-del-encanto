import { Container, Graphics } from 'pixi.js';
import type { Rng, Size } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

function polygon(rng: Rng, r: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const rr = r * rng.range(0.82, 1);
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return pts;
}

function scaled(pts: number[], k: number, ox = 0, oy = 0): number[] {
  return pts.map((v, i) => v * k + (i % 2 === 0 ? ox : oy));
}

/** Roca poligonal irregular con dos facetas claras. */
export function makeRock(_size: Size, r: number, rng: Rng): Container {
  const c = new Container();
  const g = new Graphics();
  const outer = polygon(rng, r, 7);
  g.poly(outer, true).fill(PALETTE.rock).stroke({ width: OUTLINE_WIDTH, color: PALETTE.rockOutline, join: 'round' });
  g.poly(scaled(outer, 0.58, -r * 0.08, -r * 0.1), true).fill(PALETTE.rockMid);
  g.poly(scaled(outer, 0.26, -r * 0.18, -r * 0.24), true).fill(PALETTE.rockLight);
  c.addChild(g);
  return c;
}

/** Escombro: lo que queda de una roca vaciada. */
export function makeRubble(r: number, rng: Rng): Container {
  const c = new Container();
  const g = new Graphics();
  for (let i = 0; i < 4; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = r * rng.range(0.15, 0.5);
    const pr = Math.max(5, r * rng.range(0.14, 0.24));
    g.poly(scaled(polygon(rng, pr, 5), 1, Math.cos(a) * d, Math.sin(a) * d), true)
      .fill(PALETTE.rock)
      .stroke({ width: 2.5, color: PALETTE.rockOutline, join: 'round' });
  }
  c.addChild(g);
  return c;
}
