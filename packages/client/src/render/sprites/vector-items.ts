import { Container, Graphics } from 'pixi.js';
import { Rng, type ItemId } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';
import { drawFlatRock, drawGoldNugget } from './vector-resources';

/**
 * Objetos y fogata en estilo plano. `drawItem` dibuja dentro de un cuadrado de lado 2*s centrado en (0,0).
 */

const OL = PALETTE.outline;
const WOOD = { base: 0xa8703c, light: 0xc98e52, dark: 0x6b4423 };
const ROPE = 0xd9b870;
const STONE = { base: PALETTE.rock, light: PALETTE.rockLight };
const MEAT = { raw: 0xd94a3c, rawLight: 0xf2a59a, fat: 0xf8ebe4, cooked: 0xa5552a, cookedDark: 0x6e3417, bone: 0xf3ead8 };
const FUR = { orange: PALETTE.tiger, stripe: PALETTE.tigerStripe, wool: PALETTE.sheepWool, woolShade: 0xd9d5cc };
const METAL = { base: 0xcfd6dc, light: 0xf2f5f7, dark: 0x8c969e };
const GOLD = { base: PALETTE.gold, light: PALETTE.goldLight, dark: PALETTE.goldDark };

export type PickaxeMaterial = 'wood' | 'stone' | 'gold';
export type SwordMaterial = PickaxeMaterial;
const ow = (s: number): number => Math.max(OUTLINE_WIDTH, s * 0.12);

/** Pico apuntando hacia arriba (-y). */
export function drawPickaxe(g: Graphics, s: number, material: PickaxeMaterial): void {
  const o = ow(s) * 0.8;
  const head = material === 'gold' ? GOLD : STONE;
  g.moveTo(-s * 0.1, s * 0.95).lineTo(s * 0.1, -s * 0.55).stroke({ width: s * 0.2 + o * 2, color: OL, cap: 'round' });
  g.moveTo(-s * 0.1, s * 0.95).lineTo(s * 0.1, -s * 0.55).stroke({ width: s * 0.2, color: WOOD.base, cap: 'round' });
  if (material !== 'wood') {
    g.moveTo(-s * 0.9, -s * 0.3).quadraticCurveTo(0, -s * 1.0, s * 0.95, -s * 0.35).lineTo(s * 0.7, -s * 0.55).quadraticCurveTo(0, -s * 0.75, -s * 0.65, -s * 0.5).closePath().fill(head.base).stroke({ width: o * 1.4, color: OL, join: 'round' });
    g.moveTo(-s * 0.5, -s * 0.5).quadraticCurveTo(0, -s * 0.88, s * 0.6, -s * 0.5).quadraticCurveTo(0, -s * 0.7, -s * 0.5, -s * 0.5).fill(head.light);
    if (material === 'gold') g.circle(s * 0.55, -s * 0.42, s * 0.07).fill(0xffffff, 0.85);
  } else {
    g.moveTo(-s * 0.9, -s * 0.3).quadraticCurveTo(0, -s * 1.05, s * 0.95, -s * 0.35).stroke({ width: s * 0.22 + o * 2, color: OL, cap: 'round' });
    g.moveTo(-s * 0.9, -s * 0.3).quadraticCurveTo(0, -s * 1.05, s * 0.95, -s * 0.35).stroke({ width: s * 0.22, color: WOOD.base, cap: 'round' });
  }
  for (const k of [-0.1, 0.1]) g.moveTo(s * k - s * 0.1, -s * 0.78).lineTo(s * k + s * 0.14, -s * 0.5).stroke({ width: s * 0.09, color: ROPE, cap: 'round' });
}

/** Espada apuntando hacia arriba (-y). */
export function drawSword(g: Graphics, s: number, material: SwordMaterial): void {
  const o = ow(s) * 0.8;
  const gold = material === 'gold';
  g.roundRect(-s * 0.1, s * 0.25, s * 0.2, s * 0.7, s * 0.07).fill(WOOD.dark).stroke({ width: o * 1.2, color: OL });
  // la guarda de la espada de oro también es dorada
  g.roundRect(-s * 0.42, s * 0.15, s * 0.84, s * 0.17, s * 0.06).fill(gold ? GOLD.dark : WOOD.base).stroke({ width: o * 1.2, color: OL });
  const blade = gold ? GOLD.base : material === 'stone' ? METAL.base : WOOD.light;
  const edge = gold ? GOLD.light : material === 'stone' ? METAL.light : 0xe0b47a;
  g.poly([-s * 0.2, s * 0.15, -s * 0.2, -s * 0.55, 0, -s * 0.98, s * 0.2, -s * 0.55, s * 0.2, s * 0.15], true).fill(blade).stroke({ width: o * 1.4, color: OL, join: 'round' });
  g.poly([-s * 0.1, s * 0.1, -s * 0.1, -s * 0.5, 0, -s * 0.8, 0, s * 0.1], true).fill(edge);
  if (gold) g.circle(s * 0.08, -s * 0.45, s * 0.07).fill(0xffffff, 0.85); // brillo, como en el pico de oro
}

export function drawItem(g: Graphics, item: ItemId, s: number, seed = 1): void {
  const o = ow(s);
  const rng = new Rng(seed);
  switch (item) {
    case 'wood': {
      // dos tablones cruzados
      for (const [rot, col] of [[-0.9, WOOD.base], [-0.6, WOOD.light]] as const) {
        const c = Math.cos(rot);
        const sn = Math.sin(rot);
        const P = (lx: number, ly: number): [number, number] => [lx * c - ly * sn, lx * sn + ly * c];
        const pts = [...P(-s * 0.95, -s * 0.2), ...P(s * 0.95, -s * 0.2), ...P(s * 0.95, s * 0.2), ...P(-s * 0.95, s * 0.2)];
        g.poly(pts, true).fill(col).stroke({ width: o, color: OL, join: 'round' });
        const [ax, ay] = P(-s * 0.8, 0);
        const [bx, by] = P(s * 0.8, 0);
        g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: Math.max(1.5, o * 0.4), color: WOOD.dark, alpha: 0.5 });
      }
      break;
    }
    case 'stone':
      drawFlatRock(g, 0, s * 0.05, s * 0.85, rng, o, 7);
      break;
    case 'gold':
      drawGoldNugget(g, 0, s * 0.05, s * 0.85, rng, o);
      break;
    case 'apple': {
      g.circle(-s * 0.3, s * 0.15, s * 0.58).fill(PALETTE.apple).stroke({ width: o, color: PALETTE.appleOutline });
      g.circle(s * 0.3, s * 0.15, s * 0.58).fill(PALETTE.apple).stroke({ width: o, color: PALETTE.appleOutline });
      g.circle(0, s * 0.2, s * 0.62).fill(PALETTE.apple);
      g.circle(-s * 0.3, -s * 0.15, s * 0.14).fill(0xffffff, 0.75);
      g.moveTo(0, -s * 0.35).lineTo(s * 0.08, -s * 0.9).stroke({ width: s * 0.13 + o, color: OL, cap: 'round' });
      g.moveTo(0, -s * 0.35).lineTo(s * 0.08, -s * 0.9).stroke({ width: s * 0.13, color: WOOD.dark, cap: 'round' });
      g.ellipse(s * 0.38, -s * 0.72, s * 0.3, s * 0.15).fill(PALETTE.treeLight).stroke({ width: Math.max(1.5, o * 0.6), color: PALETTE.treeOutline });
      break;
    }
    case 'raw_steak': {
      g.moveTo(-s * 0.9, -s * 0.2).bezierCurveTo(-s * 0.8, -s * 0.95, s * 0.5, -s * 0.95, s * 0.8, -s * 0.4).bezierCurveTo(s * 1.05, 0, s * 0.8, s * 0.9, 0, s * 0.85).bezierCurveTo(-s * 0.6, s * 0.85, -s * 0.95, s * 0.4, -s * 0.9, -s * 0.2).closePath().fill(MEAT.fat).stroke({ width: o, color: OL, join: 'round' });
      g.moveTo(-s * 0.65, -s * 0.15).bezierCurveTo(-s * 0.55, -s * 0.7, s * 0.4, -s * 0.7, s * 0.6, -s * 0.3).bezierCurveTo(s * 0.8, 0, s * 0.6, s * 0.65, 0, s * 0.62).bezierCurveTo(-s * 0.45, s * 0.62, -s * 0.7, s * 0.3, -s * 0.65, -s * 0.15).closePath().fill(MEAT.raw);
      g.moveTo(-s * 0.4, -s * 0.1).quadraticCurveTo(0, s * 0.15, s * 0.35, -s * 0.2).stroke({ width: o * 0.8, color: MEAT.rawLight, cap: 'round' });
      g.moveTo(-s * 0.25, s * 0.3).quadraticCurveTo(s * 0.05, s * 0.2, s * 0.3, s * 0.3).stroke({ width: o * 0.6, color: MEAT.rawLight, cap: 'round' });
      break;
    }
    case 'cooked_steak': {
      // muslo asado, como en la referencia
      g.moveTo(-s * 0.1, -s * 0.75).bezierCurveTo(s * 0.9, -s * 0.9, s * 1.0, s * 0.4, s * 0.2, s * 0.45).bezierCurveTo(-s * 0.2, s * 0.55, -s * 0.5, s * 0.1, -s * 0.1, -s * 0.75).closePath().fill(MEAT.cooked).stroke({ width: o, color: OL, join: 'round' });
      g.moveTo(s * 0.0, s * 0.3).lineTo(-s * 0.7, s * 0.85).stroke({ width: s * 0.2 + o, color: OL, cap: 'round' });
      g.moveTo(s * 0.0, s * 0.3).lineTo(-s * 0.7, s * 0.85).stroke({ width: s * 0.2, color: MEAT.bone, cap: 'round' });
      g.circle(-s * 0.8, s * 0.95, s * 0.14).fill(MEAT.bone).stroke({ width: Math.max(1.5, o * 0.6), color: OL });
      g.circle(-s * 0.65, s * 1.0, s * 0.14).fill(MEAT.bone).stroke({ width: Math.max(1.5, o * 0.6), color: OL });
      g.ellipse(s * 0.3, -s * 0.35, s * 0.25, s * 0.14).fill(0xd9834a, 0.7);
      break;
    }
    case 'wool': {
      const puffs: [number, number, number][] = [[-0.45, -0.3, 0.42], [0.4, -0.35, 0.4], [-0.5, 0.35, 0.38], [0.45, 0.35, 0.4], [0, 0.6, 0.36], [0, -0.62, 0.34], [0, 0, 0.55]];
      for (const [x, y, rr] of puffs) g.circle(x * s, y * s, rr * s + o).fill(OL);
      for (const [x, y, rr] of puffs) g.circle(x * s, y * s, rr * s).fill(FUR.wool);
      break;
    }
    case 'tiger_pelt': {
      // piel extendida con cuatro patas
      g.moveTo(0, -s * 0.9).bezierCurveTo(s * 0.9, -s * 1.0, s * 0.95, -s * 0.2, s * 0.55, 0).bezierCurveTo(s * 0.95, s * 0.2, s * 0.9, s * 1.0, 0, s * 0.9).bezierCurveTo(-s * 0.9, s * 1.0, -s * 0.95, s * 0.2, -s * 0.55, 0).bezierCurveTo(-s * 0.95, -s * 0.2, -s * 0.9, -s * 1.0, 0, -s * 0.9).closePath().fill(FUR.orange).stroke({ width: o, color: OL, join: 'round' });
      for (const t of [-0.55, -0.2, 0.15, 0.5]) g.moveTo(-s * 0.45, s * t).quadraticCurveTo(0, s * t + s * 0.15, s * 0.45, s * t).stroke({ width: s * 0.1, color: FUR.stripe, cap: 'round' });
      break;
    }
    case 'needle': {
      g.moveTo(-s * 0.75, s * 0.8).lineTo(s * 0.8, -s * 0.8).stroke({ width: s * 0.18 + o * 1.4, color: OL, cap: 'round' });
      g.moveTo(-s * 0.75, s * 0.8).lineTo(s * 0.8, -s * 0.8).stroke({ width: s * 0.18, color: METAL.base, cap: 'round' });
      g.ellipse(-s * 0.58, s * 0.62, s * 0.15, s * 0.09).stroke({ width: Math.max(1.5, o * 0.6), color: OL });
      break;
    }
    case 'wood_pickaxe':
      drawPickaxe(g, s, 'wood');
      break;
    case 'stone_pickaxe':
      drawPickaxe(g, s, 'stone');
      break;
    case 'gold_pickaxe':
      drawPickaxe(g, s, 'gold');
      break;
    case 'wood_sword':
      drawSword(g, s, 'wood');
      break;
    case 'stone_sword':
      drawSword(g, s, 'stone');
      break;
    case 'gold_sword':
      drawSword(g, s, 'gold');
      break;
    case 'campfire':
      drawCampfireBase(g, s);
      drawFlame(g, s, 1);
      break;
    case 'coat1': {
      // abrigo: cuerpo con rayas y cuello/puños de lana
      g.roundRect(-s * 0.95, -s * 0.75, s * 1.9, s * 1.6, s * 0.3).fill(FUR.orange).stroke({ width: o, color: OL });
      for (const k of [-0.5, -0.1, 0.3]) g.moveTo(s * k - s * 0.08, -s * 0.5).quadraticCurveTo(s * k + s * 0.1, s * 0.1, s * k - s * 0.08, s * 0.7).stroke({ width: s * 0.1, color: FUR.stripe, cap: 'round' });
      for (const [x, y, rr] of [[-0.35, -0.7, 0.26], [0, -0.78, 0.28], [0.35, -0.7, 0.26], [-0.82, 0.3, 0.2], [0.82, 0.3, 0.2]] as const) g.circle(x * s, y * s, rr * s).fill(FUR.wool).stroke({ width: o * 0.9, color: OL });
      g.moveTo(0, -s * 0.5).lineTo(0, s * 0.8).stroke({ width: Math.max(1.5, o * 0.6), color: OL, alpha: 0.6 });
      break;
    }
  }
}

/** Anillo de piedras y troncos cruzados. */
export function drawCampfireBase(g: Graphics, s: number): void {
  const o = ow(s);
  const rng = new Rng(11);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    drawFlatRock(g, Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85, s * 0.22, rng, Math.max(1.5, o * 0.6), 6);
  }
  for (const rot of [0.5, -0.55]) {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const ax = -s * 0.5 * c;
    const ay = -s * 0.5 * sn;
    const bx = s * 0.5 * c;
    const by = s * 0.5 * sn;
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: s * 0.22 + o * 1.4, color: OL, cap: 'round' });
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: s * 0.22, color: WOOD.base, cap: 'round' });
  }
}

export function drawFlame(g: Graphics, s: number, k: number): void {
  if (k <= 0) return;
  const o = ow(s);
  const w = s * 0.34 * k;
  const h = s * 0.55 * k;
  const flame = (fw: number, fh: number, col: number, cy: number) =>
    g.moveTo(0, cy - fh).bezierCurveTo(fw * 0.95, cy - fh * 0.5, fw * 1.05, cy + fh * 0.3, 0, cy + fh * 0.5).bezierCurveTo(-fw * 1.05, cy + fh * 0.3, -fw * 0.95, cy - fh * 0.5, 0, cy - fh).closePath().fill(col);
  g.moveTo(0, -h - o * 0.8).bezierCurveTo(w * 1.05, -h * 0.5, w * 1.15, h * 0.35, 0, h * 0.55 + o * 0.5).bezierCurveTo(-w * 1.15, h * 0.35, -w * 1.05, -h * 0.5, 0, -h - o * 0.8).closePath().fill(OL);
  flame(w, h, PALETTE.fireOuter, 0);
  flame(w * 0.5, h * 0.5, PALETTE.fireInner, s * 0.1);
}

export function makeGroundItemVector(item: ItemId, s = 16): Container {
  const c = new Container();
  const g = new Graphics();
  drawItem(g, item, s);
  c.addChild(g);
  return c;
}

export interface CampfireVectorView extends Container {
  flame: Graphics;
  s: number;
}

export function makeCampfireVector(s = 36): CampfireVectorView {
  const c = new Container() as CampfireVectorView;
  const base = new Graphics();
  drawCampfireBase(base, s);
  const flame = new Graphics();
  c.addChild(base, flame);
  c.flame = flame;
  c.s = s;
  animateCampfireVector(c, 0);
  return c;
}

export function animateCampfireVector(c: CampfireVectorView, t: number): void {
  const k = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04;
  c.flame.clear();
  drawFlame(c.flame, c.s, k);
  c.flame.rotation = Math.sin(t * 7) * 0.06;
}
