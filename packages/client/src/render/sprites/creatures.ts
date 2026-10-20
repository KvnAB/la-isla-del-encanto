import { Container, Graphics } from 'pixi.js';
import type { CreatureKind } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

/** Silueta cenital; el frente mira a +x. */
export function makeCreature(kind: CreatureKind, r: number): Container {
  const c = new Container();
  const g = new Graphics();
  switch (kind) {
    case 'tiger': {
      const bw = r * 1.8;
      const bh = r * 1.13;
      g.ellipse(0, 0, bw, bh).fill(PALETTE.tiger).stroke({ width: OUTLINE_WIDTH, color: PALETTE.tigerOutline });
      for (const sx of [-0.62, -0.2, 0.22]) g.roundRect(sx * bw - r * 0.15, -bh * 0.88, r * 0.3, bh * 1.76, r * 0.12).fill(PALETTE.tigerStripe);
      const hx = bw * 0.9;
      const hr = r * 0.8;
      g.circle(hx, 0, hr).fill(PALETTE.tiger).stroke({ width: OUTLINE_WIDTH, color: PALETTE.tigerOutline });
      g.circle(hx - hr * 0.35, -hr * 0.85, hr * 0.33).fill(PALETTE.tiger).stroke({ width: 3, color: PALETTE.tigerOutline });
      g.circle(hx - hr * 0.35, hr * 0.85, hr * 0.33).fill(PALETTE.tiger).stroke({ width: 3, color: PALETTE.tigerOutline });
      g.circle(hx + hr * 0.3, -hr * 0.33, hr * 0.14).fill(0x111111);
      g.circle(hx + hr * 0.3, hr * 0.33, hr * 0.14).fill(0x111111);
      g.ellipse(hx + hr * 0.75, 0, hr * 0.3, hr * 0.22).fill(PALETTE.tigerNose).stroke({ width: 2.5, color: PALETTE.tigerOutline });
      // cola
      g.moveTo(-bw * 0.95, 0)
        .quadraticCurveTo(-bw * 1.35, -r * 0.5, -bw * 1.25, -r * 1.1)
        .stroke({ width: r * 0.28, color: PALETTE.tiger, cap: 'round' });
      g.moveTo(-bw * 0.95, 0)
        .quadraticCurveTo(-bw * 1.35, -r * 0.5, -bw * 1.25, -r * 1.1)
        .stroke({ width: r * 0.1, color: PALETTE.tigerOutline, cap: 'round', alpha: 0.5 });
      break;
    }
    case 'sheep': {
      const wr = r * 0.78;
      const spots: [number, number][] = [
        [-0.85, -0.62],
        [0.7, -0.7],
        [-0.78, 0.7],
        [0.78, 0.62],
        [0, 0],
      ];
      for (const [sx, sy] of spots) g.circle(sx * r, sy * r, wr).fill(PALETTE.sheepWool).stroke({ width: OUTLINE_WIDTH, color: PALETTE.sheepOutline });
      g.circle(0, 0, r).fill(PALETTE.sheepWool);
      const hx = r * 1.4;
      const hr = r * 0.62;
      g.circle(hx, 0, hr).fill(PALETTE.sheepFace).stroke({ width: OUTLINE_WIDTH, color: 0x1a1614 });
      g.circle(hx + hr * 0.35, -hr * 0.38, hr * 0.2).fill(PALETTE.sheepEye);
      g.circle(hx + hr * 0.35, hr * 0.38, hr * 0.2).fill(PALETTE.sheepEye);
      break;
    }
    case 'goblin': {
      g.circle(0, 0, r).fill(PALETTE.goblin).stroke({ width: OUTLINE_WIDTH, color: PALETTE.goblinOutline });
      // orejas puntiagudas hacia atrás
      g.poly([-r * 0.5, -r * 0.65, -r * 1.55, -r * 1.3, -r * 0.1, -r * 1.0], true).fill(PALETTE.goblin).stroke({ width: 3, color: PALETTE.goblinOutline, join: 'round' });
      g.poly([-r * 0.5, r * 0.65, -r * 1.55, r * 1.3, -r * 0.1, r * 1.0], true).fill(PALETTE.goblin).stroke({ width: 3, color: PALETTE.goblinOutline, join: 'round' });
      g.circle(r * 0.5, -r * 0.22, r * 0.14).fill(0x111111);
      g.circle(r * 0.5, r * 0.22, r * 0.14).fill(0x111111);
      break;
    }
  }
  c.addChild(g);
  return c;
}
