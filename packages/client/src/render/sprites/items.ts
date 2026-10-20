import { Container, Graphics } from 'pixi.js';
import type { ItemId } from '@draycol/core';
import { PALETTE } from '../palette';

const OL = PALETTE.skinOutline;

/** Icono de un objeto (en el suelo o en el HUD). Cabe en un círculo de radio ~16. */
export function makeGroundItem(item: ItemId): Container {
  const c = new Container();
  const g = new Graphics();
  switch (item) {
    case 'wood':
      g.roundRect(-16, -8, 32, 16, 5).fill(PALETTE.woodHead).stroke({ width: 3, color: OL });
      g.moveTo(-6, -8).lineTo(-6, 8).stroke({ width: 2.5, color: PALETTE.stump });
      g.moveTo(6, -8).lineTo(6, 8).stroke({ width: 2.5, color: PALETTE.stump });
      break;
    case 'stone':
      g.poly([-14, 3, -9, -11, 3, -14, 13, -6, 14, 6, 5, 13, -8, 11], true).fill(PALETTE.rock).stroke({ width: 3, color: PALETTE.rockOutline, join: 'round' });
      g.poly([-6, 0, -3, -7, 5, -8, 8, -3, 5, 4], true).fill(PALETTE.rockLight);
      break;
    case 'apple':
      g.circle(0, 1, 12).fill(PALETTE.apple).stroke({ width: 3, color: OL });
      g.roundRect(-2, -17, 4, 8, 2).fill(0x4b2e18);
      g.ellipse(4, -11, 5, 2.5).fill(0x4a9140);
      break;
    case 'raw_steak':
      g.ellipse(0, 0, 16, 11).fill(0xc9524a).stroke({ width: 3, color: OL });
      g.ellipse(-3, -1, 8, 5).fill(0xe07068);
      g.roundRect(9, -3, 9, 6, 3).fill(0xf3efe6).stroke({ width: 2, color: OL });
      break;
    case 'cooked_steak':
      g.ellipse(0, 0, 16, 11).fill(0x8a4a2b).stroke({ width: 3, color: OL });
      g.moveTo(-9, -4).lineTo(-1, 4).stroke({ width: 2.5, color: 0x5a2d16 });
      g.moveTo(-1, -5).lineTo(7, 3).stroke({ width: 2.5, color: 0x5a2d16 });
      g.roundRect(9, -3, 9, 6, 3).fill(0xf3efe6).stroke({ width: 2, color: OL });
      break;
    case 'wool':
      for (const [x, y] of [[-7, -5], [7, -5], [-7, 6], [7, 6], [0, 0]] as const) g.circle(x, y, 8).fill(PALETTE.sheepWool).stroke({ width: 2.5, color: PALETTE.sheepOutline });
      break;
    case 'tiger_pelt':
      g.roundRect(-16, -11, 32, 22, 8).fill(PALETTE.tiger).stroke({ width: 3, color: PALETTE.tigerOutline });
      for (const x of [-9, -1, 7]) g.roundRect(x - 1.5, -9, 3.5, 18, 1.5).fill(PALETTE.tigerStripe);
      break;
    case 'needle':
      g.moveTo(-12, 12).lineTo(12, -12).stroke({ width: 3.5, color: 0xd8dde3, cap: 'round' });
      g.moveTo(-12, 12).lineTo(12, -12).stroke({ width: 1.2, color: OL, cap: 'round', alpha: 0.5 });
      g.ellipse(-9, 9, 3.5, 2.2).stroke({ width: 2, color: OL });
      break;
    case 'wood_pickaxe':
    case 'stone_pickaxe':
      drawPickaxe(g, item === 'stone_pickaxe', 0.55);
      break;
    case 'wood_sword':
    case 'stone_sword':
      drawSword(g, item === 'stone_sword', 0.55);
      break;
    case 'campfire':
      g.moveTo(-12, -6).lineTo(12, 6).stroke({ width: 6, color: PALETTE.fireLog, cap: 'round' });
      g.moveTo(-12, 6).lineTo(12, -6).stroke({ width: 6, color: PALETTE.fireLog, cap: 'round' });
      g.moveTo(0, -17).quadraticCurveTo(10, -6, 5, 1).quadraticCurveTo(0, -3, -5, 1).quadraticCurveTo(-10, -6, 0, -17).fill(PALETTE.fireOuter).stroke({ width: 2, color: PALETTE.fireOutline });
      g.moveTo(0, -10).quadraticCurveTo(5, -4, 2, 0).quadraticCurveTo(0, -1, -2, 0).quadraticCurveTo(-5, -4, 0, -10).fill(PALETTE.fireInner);
      break;
    case 'coat1':
      g.roundRect(-14, -14, 28, 28, 7).fill(0x8a5a3c).stroke({ width: 3, color: OL });
      g.poly([-8, -14, 0, -4, 8, -14], true).fill(PALETTE.sheepWool).stroke({ width: 2, color: OL, join: 'round' });
      g.moveTo(0, -4).lineTo(0, 12).stroke({ width: 2, color: OL, alpha: 0.5 });
      break;
  }
  c.addChild(g);
  return c;
}

/** Pico apuntando hacia arriba (mango vertical, cabeza arriba). `k` escala. */
export function drawPickaxe(g: Graphics, stone: boolean, k = 1): void {
  g.roundRect(-5 * k, -40 * k, 10 * k, 60 * k, 4 * k).fill(PALETTE.woodHandle).stroke({ width: 3, color: OL });
  const head = stone ? PALETTE.stoneHead : PALETTE.woodHead;
  g.moveTo(-32 * k, -44 * k)
    .quadraticCurveTo(0, -64 * k, 32 * k, -44 * k)
    .lineTo(27 * k, -33 * k)
    .quadraticCurveTo(0, -48 * k, -27 * k, -33 * k)
    .closePath()
    .fill(head)
    .stroke({ width: 3, color: stone ? PALETTE.rockOutline : OL, join: 'round' });
}

/** Espada apuntando hacia arriba. */
export function drawSword(g: Graphics, stone: boolean, k = 1): void {
  const blade = stone ? PALETTE.stoneHead : PALETTE.woodHead;
  g.roundRect(-4 * k, -2 * k, 8 * k, 26 * k, 3 * k).fill(PALETTE.woodHandle).stroke({ width: 3, color: OL });
  g.roundRect(-14 * k, -8 * k, 28 * k, 8 * k, 3 * k).fill(stone ? PALETTE.rockMid : PALETTE.stump).stroke({ width: 3, color: OL });
  g.poly([-7 * k, -8 * k, 7 * k, -8 * k, 7 * k, -46 * k, 0, -60 * k, -7 * k, -46 * k], true).fill(blade).stroke({ width: 3, color: stone ? PALETTE.rockOutline : OL, join: 'round' });
  g.moveTo(0, -12 * k).lineTo(0, -46 * k).stroke({ width: 1.5 * k, color: OL, alpha: 0.35 });
}
