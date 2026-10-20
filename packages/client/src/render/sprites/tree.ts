import { Container, Graphics } from 'pixi.js';
import type { Size } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

const APPLE_SPOTS: [number, number][] = [
  [-0.4, -0.29],
  [0.34, -0.45],
  [0.53, 0.24],
  [-0.16, 0.53],
  [-0.6, 0.29],
  [0.05, -0.05],
];

/** Copa en tres capas con contorno; frutal con manzanas. */
export function makeTree(size: Size, kind: 'tree' | 'apple_tree', r: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.circle(0, 0, r).fill(PALETTE.treeDark).stroke({ width: OUTLINE_WIDTH, color: PALETTE.outlineTree });
  g.circle(0, 0, r * 0.85).fill(PALETTE.treeMid);
  g.circle(0, 0, r * 0.57).fill(PALETTE.treeLight);
  c.addChild(g);
  if (kind === 'apple_tree') {
    const apples = new Graphics();
    const count = size === 'small' ? 3 : size === 'medium' ? 4 : 6;
    const ar = Math.max(5, r * 0.11);
    for (let i = 0; i < count; i++) {
      const [ax, ay] = APPLE_SPOTS[i];
      apples.circle(ax * r, ay * r, ar).fill(PALETTE.apple).stroke({ width: 2.5, color: PALETTE.appleOutline });
    }
    c.addChild(apples);
  }
  return c;
}

/** Tocón: lo que queda de un árbol vaciado. */
export function makeStump(r: number): Container {
  const c = new Container();
  const sr = Math.max(10, r * 0.42);
  const g = new Graphics();
  g.circle(0, 0, sr).fill(PALETTE.stump).stroke({ width: 3, color: PALETTE.stumpDark });
  g.circle(0, 0, sr * 0.68).stroke({ width: 2, color: PALETTE.stumpDark, alpha: 0.6 });
  g.circle(0, 0, sr * 0.38).stroke({ width: 2, color: PALETTE.stumpDark, alpha: 0.6 });
  c.addChild(g);
  return c;
}
