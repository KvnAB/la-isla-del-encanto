import { Container, Graphics } from 'pixi.js';
import { Rng, type ItemId } from '@draycol/core';
import { drawFacetedRock, drawLeaf, OL } from './vector-resources';

/**
 * Objetos y fogata dibujados en código al estilo de la guía. Cada `drawItem` dibuja dentro
 * de un cuadrado de lado 2*s centrado en (0,0), de modo que sirve para el suelo, el HUD y la mano.
 */

const WOOD = { dark: 0x5a3516, base: 0x9a6232, light: 0xc98c4a, end: 0xe0b06f, ring: 0x7a4a22 };
const ROPE = { base: 0xd8b56a, dark: 0x9c7a3a };
const STONE = { base: 0x8f99a3, light: 0xb7c1ca };
const MEAT = { raw: 0xd9433a, rawDark: 0x9c2420, rawLight: 0xf07a70, fat: 0xf6e6dc, bone: 0xf3ead8, cooked: 0x9a4a24, cookedDark: 0x5e2a12, grill: 0x3b1708 };
const FUR = { orange: 0xf08a2a, dark: 0xc96a1a, stripe: 0x2b1708, wool: 0xf5f1e8, woolShade: 0xd6cfc2 };
const METAL = { base: 0xc9d3dc, light: 0xf1f5f8, dark: 0x7d8993 };
const FIRE = { log: 0x8a5a2b, logDark: 0x5a3516, outer: 0xff6a1a, mid: 0xffa21f, inner: 0xffe066, core: 0xfff7c2, outline: 0x7a2200 };

const ow = (s: number): number => Math.max(2, s * 0.12);

function log(g: Graphics, x: number, y: number, len: number, w: number, rot: number, o: number): void {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const P = (lx: number, ly: number): [number, number] => [x + lx * c - ly * sn, y + lx * sn + ly * c];
  const [ax, ay] = P(-len / 2, 0);
  const [bx, by] = P(len / 2, 0);
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w + o * 2, color: OL, cap: 'round' });
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w, color: WOOD.base, cap: 'round' });
  const [lx, ly] = P(-len / 2 + w * 0.1, -w * 0.25);
  const [lx2, ly2] = P(len / 2 - w * 0.1, -w * 0.25);
  g.moveTo(lx, ly).lineTo(lx2, ly2).stroke({ width: w * 0.28, color: WOOD.light, cap: 'round', alpha: 0.8 });
  g.circle(bx, by, w * 0.5).fill(WOOD.end).stroke({ width: Math.max(1.2, o * 0.7), color: OL });
  g.circle(bx, by, w * 0.28).stroke({ width: Math.max(1, o * 0.5), color: WOOD.ring, alpha: 0.8 });
  g.circle(bx, by, w * 0.1).fill(WOOD.ring);
}

function ropeWrap(g: Graphics, x: number, y: number, w: number, h: number, rot: number, o: number): void {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const P = (lx: number, ly: number): [number, number] => [x + lx * c - ly * sn, y + lx * sn + ly * c];
  for (const k of [-0.5, 0, 0.5]) {
    const [ax, ay] = P(k * w * 0.5, -h / 2);
    const [bx, by] = P(k * w * 0.5 + w * 0.2, h / 2);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w * 0.22 + o, color: OL, cap: 'round' });
  }
  for (const k of [-0.5, 0, 0.5]) {
    const [ax, ay] = P(k * w * 0.5, -h / 2);
    const [bx, by] = P(k * w * 0.5 + w * 0.2, h / 2);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w * 0.22, color: ROPE.base, cap: 'round' });
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: w * 0.08, color: ROPE.dark, cap: 'round', alpha: 0.6 });
  }
}

/** Pico apuntando hacia arriba (-y): mango de rama nudosa, cabeza atada con cuerda. */
export function drawPickaxe(g: Graphics, s: number, stone: boolean): void {
  const o = ow(s) * 0.8;
  // mango con dos nudos
  g.moveTo(-s * 0.15, s * 0.95).lineTo(s * 0.05, -s * 0.55).stroke({ width: s * 0.2 + o * 2, color: OL, cap: 'round' });
  g.moveTo(-s * 0.15, s * 0.95).lineTo(s * 0.05, -s * 0.55).stroke({ width: s * 0.2, color: WOOD.base, cap: 'round' });
  g.moveTo(-s * 0.12, s * 0.85).lineTo(s * 0.02, -s * 0.45).stroke({ width: s * 0.06, color: WOOD.light, cap: 'round', alpha: 0.7 });
  g.circle(-s * 0.08, s * 0.35, s * 0.12).fill(WOOD.dark).stroke({ width: Math.max(1, o * 0.6), color: OL });
  g.circle(-s * 0.02, -s * 0.1, s * 0.09).fill(WOOD.dark).stroke({ width: Math.max(1, o * 0.6), color: OL });
  // cabeza
  if (stone) {
    g.moveTo(-s * 0.85, -s * 0.35).lineTo(-s * 0.45, -s * 0.75).lineTo(s * 0.05, -s * 0.92).lineTo(s * 0.55, -s * 0.8).lineTo(s * 0.95, -s * 0.4).lineTo(s * 0.6, -s * 0.55).lineTo(s * 0.05, -s * 0.62).lineTo(-s * 0.5, -s * 0.5).closePath().fill(STONE.base).stroke({ width: o * 1.4, color: OL, join: 'round' });
    g.moveTo(-s * 0.45, -s * 0.72).lineTo(s * 0.05, -s * 0.86).lineTo(s * 0.5, -s * 0.76).lineTo(s * 0.05, -s * 0.7).closePath().fill(STONE.light);
    g.moveTo(-s * 0.8, -s * 0.38).lineTo(-s * 0.5, -s * 0.55).stroke({ width: Math.max(1, o * 0.5), color: OL, alpha: 0.5 });
  } else {
    g.moveTo(-s * 0.9, -s * 0.3).quadraticCurveTo(0, -s * 1.05, s * 0.95, -s * 0.35).stroke({ width: s * 0.2 + o * 2, color: OL, cap: 'round' });
    g.moveTo(-s * 0.9, -s * 0.3).quadraticCurveTo(0, -s * 1.05, s * 0.95, -s * 0.35).stroke({ width: s * 0.2, color: WOOD.base, cap: 'round' });
    g.moveTo(-s * 0.7, -s * 0.42).quadraticCurveTo(0, -s * 0.95, s * 0.7, -s * 0.45).stroke({ width: s * 0.06, color: WOOD.light, cap: 'round', alpha: 0.75 });
    g.circle(-s * 0.9, -s * 0.3, s * 0.1).fill(WOOD.end).stroke({ width: Math.max(1, o * 0.6), color: OL });
    g.circle(s * 0.95, -s * 0.35, s * 0.1).fill(WOOD.end).stroke({ width: Math.max(1, o * 0.6), color: OL });
  }
  ropeWrap(g, s * 0.02, -s * 0.66, s * 0.36, s * 0.34, 0.1, o * 0.6);
}

/** Espada apuntando hacia arriba (-y). */
export function drawSword(g: Graphics, s: number, stone: boolean): void {
  const o = ow(s) * 0.8;
  // empuñadura con cuerda
  g.roundRect(-s * 0.11, s * 0.3, s * 0.22, s * 0.65, s * 0.08).fill(WOOD.dark).stroke({ width: o * 1.2, color: OL });
  for (let k = 0; k < 4; k++) g.moveTo(-s * 0.12, s * (0.38 + k * 0.13)).lineTo(s * 0.12, s * (0.44 + k * 0.13)).stroke({ width: s * 0.06, color: ROPE.base, cap: 'round' });
  g.circle(0, s * 0.95, s * 0.12).fill(WOOD.base).stroke({ width: o, color: OL });
  // guarda
  g.roundRect(-s * 0.42, s * 0.18, s * 0.84, s * 0.16, s * 0.06).fill(WOOD.base).stroke({ width: o * 1.2, color: OL });
  g.roundRect(-s * 0.36, s * 0.2, s * 0.5, s * 0.05, s * 0.02).fill(WOOD.light);
  // hoja
  if (stone) {
    g.moveTo(-s * 0.22, s * 0.18).lineTo(-s * 0.26, -s * 0.45).lineTo(-s * 0.08, -s * 0.95).lineTo(s * 0.12, -s * 0.8).lineTo(s * 0.26, -s * 0.3).lineTo(s * 0.2, s * 0.18).closePath().fill(STONE.base).stroke({ width: o * 1.4, color: OL, join: 'round' });
    g.moveTo(-s * 0.12, s * 0.1).lineTo(-s * 0.16, -s * 0.4).lineTo(-s * 0.06, -s * 0.82).lineTo(s * 0.02, -s * 0.3).closePath().fill(STONE.light);
    g.moveTo(s * 0.02, -s * 0.3).lineTo(s * 0.1, s * 0.1).stroke({ width: Math.max(1, o * 0.5), color: OL, alpha: 0.4 });
  } else {
    g.moveTo(-s * 0.2, s * 0.18).lineTo(-s * 0.2, -s * 0.55).lineTo(0, -s * 0.98).lineTo(s * 0.2, -s * 0.55).lineTo(s * 0.2, s * 0.18).closePath().fill(WOOD.light).stroke({ width: o * 1.4, color: OL, join: 'round' });
    g.moveTo(-s * 0.1, s * 0.1).lineTo(-s * 0.1, -s * 0.5).lineTo(0, -s * 0.78).lineTo(0, s * 0.1).closePath().fill(WOOD.end);
    for (const k of [-0.3, 0.1, 0.5]) g.moveTo(s * 0.05, -s * k).quadraticCurveTo(s * 0.12, -s * (k + 0.15), s * 0.06, -s * (k + 0.3)).stroke({ width: Math.max(1, o * 0.4), color: WOOD.ring, alpha: 0.6 });
  }
}

export function drawItem(g: Graphics, item: ItemId, s: number, seed = 1): void {
  const o = ow(s);
  const rng = new Rng(seed);
  switch (item) {
    case 'wood': {
      log(g, 0, s * 0.25, s * 1.7, s * 0.42, 0.1, o * 0.7);
      log(g, -s * 0.12, -s * 0.2, s * 1.6, s * 0.4, -0.05, o * 0.7);
      log(g, s * 0.1, -s * 0.6, s * 1.5, s * 0.38, 0.08, o * 0.7);
      ropeWrap(g, -s * 0.1, -s * 0.15, s * 0.5, s * 1.3, 0.05, o * 0.6);
      break;
    }
    case 'stone': {
      drawFacetedRock(g, -s * 0.35, s * 0.3, s * 0.5, rng, o * 0.9, 6);
      drawFacetedRock(g, s * 0.45, s * 0.35, s * 0.42, rng, o * 0.9, 6);
      drawFacetedRock(g, s * 0.05, -s * 0.3, s * 0.55, rng, o * 0.9, 7);
      break;
    }
    case 'apple': {
      g.moveTo(0, -s * 0.55).bezierCurveTo(s * 0.95, -s * 0.9, s * 1.0, s * 0.6, 0, s * 0.85).bezierCurveTo(-s * 1.0, s * 0.6, -s * 0.95, -s * 0.9, 0, -s * 0.55).closePath().fill(MEAT.raw).stroke({ width: o * 1.3, color: 0x4a0f0b, join: 'round' });
      g.moveTo(0, -s * 0.4).bezierCurveTo(s * 0.8, -s * 0.6, s * 0.85, s * 0.5, 0, s * 0.72).bezierCurveTo(s * 0.5, s * 0.3, s * 0.4, -s * 0.3, 0, -s * 0.4).closePath().fill({ color: MEAT.rawDark, alpha: 0.45 });
      g.ellipse(-s * 0.38, -s * 0.28, s * 0.2, s * 0.3).fill(MEAT.rawLight);
      g.moveTo(0, -s * 0.5).quadraticCurveTo(s * 0.05, -s * 0.85, s * 0.18, -s * 1.0).stroke({ width: s * 0.14 + o, color: OL, cap: 'round' });
      g.moveTo(0, -s * 0.5).quadraticCurveTo(s * 0.05, -s * 0.85, s * 0.18, -s * 1.0).stroke({ width: s * 0.14, color: WOOD.dark, cap: 'round' });
      drawLeaf(g, s * 0.42, -s * 0.8, s * 0.6, -0.5, 0x58b547, 0x2f6b25, o * 0.6);
      break;
    }
    case 'raw_steak': {
      g.moveTo(-s * 0.9, -s * 0.1).bezierCurveTo(-s * 0.9, -s * 0.9, s * 0.2, -s * 1.0, s * 0.6, -s * 0.6).bezierCurveTo(s * 1.05, -s * 0.2, s * 0.9, s * 0.8, s * 0.1, s * 0.85).bezierCurveTo(-s * 0.5, s * 0.9, -s * 0.95, s * 0.5, -s * 0.9, -s * 0.1).closePath().fill(MEAT.fat).stroke({ width: o * 1.3, color: OL, join: 'round' });
      g.moveTo(-s * 0.7, -s * 0.05).bezierCurveTo(-s * 0.7, -s * 0.7, s * 0.15, -s * 0.8, s * 0.45, -s * 0.5).bezierCurveTo(s * 0.8, -s * 0.15, s * 0.7, s * 0.6, s * 0.05, s * 0.65).bezierCurveTo(-s * 0.4, s * 0.7, -s * 0.75, s * 0.4, -s * 0.7, -s * 0.05).closePath().fill(MEAT.raw);
      g.moveTo(-s * 0.45, -s * 0.2).quadraticCurveTo(-s * 0.1, s * 0.1, s * 0.3, -s * 0.3).stroke({ width: o * 0.7, color: MEAT.fat, alpha: 0.85, cap: 'round' });
      g.moveTo(-s * 0.3, s * 0.3).quadraticCurveTo(s * 0.05, s * 0.2, s * 0.4, s * 0.3).stroke({ width: o * 0.6, color: MEAT.fat, alpha: 0.7, cap: 'round' });
      g.ellipse(-s * 0.3, -s * 0.35, s * 0.2, s * 0.12).fill({ color: MEAT.rawLight, alpha: 0.7 });
      // hueso
      g.moveTo(s * 0.35, -s * 0.75).lineTo(s * 0.75, -s * 0.25).stroke({ width: s * 0.22 + o, color: OL, cap: 'round' });
      g.moveTo(s * 0.35, -s * 0.75).lineTo(s * 0.75, -s * 0.25).stroke({ width: s * 0.22, color: MEAT.bone, cap: 'round' });
      break;
    }
    case 'cooked_steak': {
      g.moveTo(-s * 0.9, -s * 0.1).bezierCurveTo(-s * 0.9, -s * 0.9, s * 0.2, -s * 1.0, s * 0.6, -s * 0.6).bezierCurveTo(s * 1.05, -s * 0.2, s * 0.9, s * 0.8, s * 0.1, s * 0.85).bezierCurveTo(-s * 0.5, s * 0.9, -s * 0.95, s * 0.5, -s * 0.9, -s * 0.1).closePath().fill(MEAT.cooked).stroke({ width: o * 1.3, color: OL, join: 'round' });
      g.moveTo(-s * 0.5, s * 0.55).bezierCurveTo(s * 0.2, s * 0.75, s * 0.7, s * 0.4, s * 0.75, -s * 0.1).lineTo(s * 0.55, s * 0.2).bezierCurveTo(s * 0.3, s * 0.5, -s * 0.2, s * 0.55, -s * 0.5, s * 0.55).closePath().fill({ color: MEAT.cookedDark, alpha: 0.55 });
      for (const k of [-0.45, -0.05, 0.35]) g.moveTo(-s * 0.55 + s * k * 0.3, s * k - s * 0.35).lineTo(s * 0.5 + s * k * 0.3, s * k + s * 0.1).stroke({ width: o * 0.9, color: MEAT.grill, cap: 'round', alpha: 0.8 });
      g.ellipse(-s * 0.35, -s * 0.4, s * 0.22, s * 0.12).fill({ color: 0xd98a4a, alpha: 0.6 });
      break;
    }
    case 'wool': {
      const puffs: [number, number, number][] = [[-0.45, -0.3, 0.42], [0.4, -0.35, 0.4], [-0.5, 0.35, 0.38], [0.45, 0.35, 0.4], [0, 0.55, 0.36], [0, -0.6, 0.34], [0, 0, 0.55]];
      for (const [x, y, rr] of puffs) g.circle(x * s, y * s, rr * s + o).fill(OL);
      for (const [x, y, rr] of puffs) g.circle(x * s, y * s, rr * s).fill(FUR.woolShade);
      for (const [x, y, rr] of puffs) g.circle(x * s - s * 0.06, y * s - s * 0.08, rr * s * 0.75).fill(FUR.wool);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        g.arc(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4, s * 0.16, a, a + Math.PI * 1.1).stroke({ width: Math.max(1, o * 0.45), color: 0xb9b0a1, alpha: 0.8, cap: 'round' });
      }
      break;
    }
    case 'tiger_pelt': {
      // piel doblada: dos capas con borde de pelo claro
      g.roundRect(-s * 0.9, -s * 0.45, s * 1.8, s * 1.2, s * 0.2).fill(FUR.dark).stroke({ width: o * 1.3, color: OL });
      g.roundRect(-s * 0.95, -s * 0.85, s * 1.75, s * 0.9, s * 0.2).fill(FUR.orange).stroke({ width: o * 1.3, color: OL });
      for (const k of [-0.6, -0.25, 0.1, 0.45]) g.moveTo(-s * 0.95 + s * (k + 1) * 0.85, -s * 0.8).quadraticCurveTo(-s * 0.95 + s * (k + 1) * 0.85 + s * 0.15, -s * 0.4, -s * 0.95 + s * (k + 1) * 0.85, -s * 0.02).stroke({ width: s * 0.12, color: FUR.stripe, cap: 'round' });
      for (const k of [-0.5, -0.1, 0.3]) g.moveTo(-s * 0.9 + s * (k + 1) * 0.85, s * 0.05).quadraticCurveTo(-s * 0.9 + s * (k + 1) * 0.85 + s * 0.12, s * 0.4, -s * 0.9 + s * (k + 1) * 0.85, s * 0.7).stroke({ width: s * 0.1, color: FUR.stripe, cap: 'round', alpha: 0.85 });
      g.moveTo(-s * 0.95, -s * 0.85).lineTo(s * 0.8, -s * 0.85).stroke({ width: o * 0.9, color: FUR.wool, alpha: 0.7, cap: 'round' });
      break;
    }
    case 'needle': {
      g.moveTo(-s * 0.75, s * 0.8).lineTo(s * 0.8, -s * 0.8).stroke({ width: s * 0.2 + o * 1.4, color: OL, cap: 'round' });
      g.moveTo(-s * 0.75, s * 0.8).lineTo(s * 0.8, -s * 0.8).stroke({ width: s * 0.2, color: METAL.base, cap: 'round' });
      g.moveTo(-s * 0.7, s * 0.72).lineTo(s * 0.72, -s * 0.72).stroke({ width: s * 0.07, color: METAL.light, cap: 'round', alpha: 0.9 });
      g.ellipse(-s * 0.58, s * 0.62, s * 0.16, s * 0.1).stroke({ width: Math.max(1.5, o * 0.6), color: OL });
      g.moveTo(-s * 0.62, s * 0.68).bezierCurveTo(-s * 0.9, s * 0.3, -s * 0.3, s * 0.1, -s * 0.55, -s * 0.35).stroke({ width: Math.max(1.5, o * 0.5), color: 0xe8e2d6, cap: 'round' });
      g.moveTo(-s * 0.62, s * 0.68).bezierCurveTo(-s * 0.9, s * 0.3, -s * 0.3, s * 0.1, -s * 0.55, -s * 0.35).stroke({ width: Math.max(1, o * 0.25), color: OL, cap: 'round', alpha: 0.6 });
      break;
    }
    case 'wood_pickaxe':
      drawPickaxe(g, s, false);
      break;
    case 'stone_pickaxe':
      drawPickaxe(g, s, true);
      break;
    case 'wood_sword':
      drawSword(g, s, false);
      break;
    case 'stone_sword':
      drawSword(g, s, true);
      break;
    case 'campfire':
      drawCampfire(g, s, 1);
      break;
    case 'coat1': {
      // abrigo con cuello y puños de lana, piel de tigre, botones de madera
      g.moveTo(-s * 0.55, -s * 0.7).lineTo(-s * 0.95, -s * 0.4).lineTo(-s * 0.95, s * 0.2).lineTo(-s * 0.6, s * 0.2).lineTo(-s * 0.6, s * 0.9).lineTo(s * 0.6, s * 0.9).lineTo(s * 0.6, s * 0.2).lineTo(s * 0.95, s * 0.2).lineTo(s * 0.95, -s * 0.4).lineTo(s * 0.55, -s * 0.7).closePath().fill(FUR.orange).stroke({ width: o * 1.3, color: OL, join: 'round' });
      for (const k of [-0.35, 0, 0.35]) g.moveTo(s * k - s * 0.08, -s * 0.5).quadraticCurveTo(s * k + s * 0.1, s * 0.1, s * k - s * 0.08, s * 0.75).stroke({ width: s * 0.1, color: FUR.stripe, cap: 'round', alpha: 0.9 });
      for (const sx of [-1, 1]) g.moveTo(sx * s * 0.78, -s * 0.5).quadraticCurveTo(sx * s * 0.95, -s * 0.1, sx * s * 0.8, s * 0.15).stroke({ width: s * 0.08, color: FUR.stripe, cap: 'round', alpha: 0.8 });
      // cuello y puños de lana
      for (const [x, y, rr] of [[-0.35, -0.65, 0.26], [0, -0.75, 0.28], [0.35, -0.65, 0.26], [-0.78, 0.2, 0.2], [0.78, 0.2, 0.2], [-0.45, 0.9, 0.2], [0, 0.95, 0.22], [0.45, 0.9, 0.2]] as const) {
        g.circle(x * s, y * s, rr * s).fill(FUR.wool).stroke({ width: o * 0.9, color: OL });
        g.circle(x * s - rr * s * 0.25, y * s - rr * s * 0.25, rr * s * 0.5).fill(0xffffff);
      }
      // cierre central y botones
      g.moveTo(0, -s * 0.45).lineTo(0, s * 0.75).stroke({ width: Math.max(1.5, o * 0.6), color: OL, alpha: 0.6 });
      for (const y of [-0.15, 0.25]) g.roundRect(-s * 0.16, s * y - s * 0.06, s * 0.32, s * 0.12, s * 0.04).fill(WOOD.base).stroke({ width: Math.max(1.2, o * 0.5), color: OL });
      break;
    }
  }
}

/** Fogata vista desde arriba: anillo de piedras, troncos cruzados y llama en capas. `k` escala la llama. */
export function drawCampfire(g: Graphics, s: number, k: number): void {
  const o = ow(s);
  const rng = new Rng(11);
  // piedras del anillo
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    drawFacetedRock(g, Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.78, s * 0.2, rng, Math.max(1.5, o * 0.6), 6);
  }
  // ceniza
  g.ellipse(0, 0, s * 0.62, s * 0.52).fill({ color: 0x3a2a20, alpha: 0.55 });
  // troncos cruzados
  log(g, 0, s * 0.08, s * 1.1, s * 0.22, 0.5, o * 0.6);
  log(g, 0, s * 0.08, s * 1.1, s * 0.22, -0.55, o * 0.6);
  log(g, 0, s * 0.1, s * 1.0, s * 0.2, Math.PI * 0.02, o * 0.6);
  // llama: tres capas de gota (vista cenital, levemente alargada hacia arriba)
  const flame = (w: number, h: number, col: number, cy: number) =>
    g.moveTo(0, cy - h)
      .bezierCurveTo(w * 0.9, cy - h * 0.55, w * 1.05, cy + h * 0.25, 0, cy + h * 0.45)
      .bezierCurveTo(-w * 1.05, cy + h * 0.25, -w * 0.9, cy - h * 0.55, 0, cy - h)
      .closePath()
      .fill(col);
  if (k <= 0) return;
  const fw = s * 0.42 * k;
  const fh = s * 0.7 * k;
  g.moveTo(0, -fh - s * 0.05).bezierCurveTo(fw * 1.0, -fh * 0.55, fw * 1.15, fh * 0.25, 0, fh * 0.5).bezierCurveTo(-fw * 1.15, fh * 0.25, -fw * 1.0, -fh * 0.55, 0, -fh - s * 0.05).closePath().fill(FIRE.outline);
  flame(fw, fh, FIRE.outer, 0);
  flame(fw * 0.7, fh * 0.72, FIRE.mid, s * 0.06);
  flame(fw * 0.42, fh * 0.45, FIRE.inner, s * 0.12);
  flame(fw * 0.2, fh * 0.22, FIRE.core, s * 0.16);
  // chispas
  g.circle(fw * 0.9, -fh * 0.9, s * 0.05).fill(FIRE.inner);
  g.circle(-fw * 0.7, -fh * 1.1, s * 0.04).fill(FIRE.mid);
}

export function makeGroundItemVector(item: ItemId, s = 17): Container {
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

export function makeCampfireVector(s = 34): CampfireVectorView {
  const c = new Container() as CampfireVectorView;
  const base = new Graphics();
  drawCampfire(base, s, 0); // piedras y troncos (llama con k=0 queda vacía)
  const flame = new Graphics();
  c.addChild(base, flame);
  c.flame = flame;
  c.s = s;
  animateCampfireVector(c, 0);
  return c;
}

export function animateCampfireVector(c: CampfireVectorView, t: number): void {
  const k = 1 + Math.sin(t * 9) * 0.07 + Math.sin(t * 23) * 0.04;
  const g = c.flame;
  g.clear();
  const s = c.s;
  const fw = s * 0.42 * k;
  const fh = s * 0.7 * (2 - k);
  const flame = (w: number, h: number, col: number, cy: number) =>
    g.moveTo(0, cy - h)
      .bezierCurveTo(w * 0.9, cy - h * 0.55, w * 1.05, cy + h * 0.25, 0, cy + h * 0.45)
      .bezierCurveTo(-w * 1.05, cy + h * 0.25, -w * 0.9, cy - h * 0.55, 0, cy - h)
      .closePath()
      .fill(col);
  g.moveTo(0, -fh - s * 0.05).bezierCurveTo(fw * 1.0, -fh * 0.55, fw * 1.15, fh * 0.25, 0, fh * 0.5).bezierCurveTo(-fw * 1.15, fh * 0.25, -fw * 1.0, -fh * 0.55, 0, -fh - s * 0.05).closePath().fill(FIRE.outline);
  flame(fw, fh, FIRE.outer, 0);
  flame(fw * 0.7, fh * 0.72, FIRE.mid, s * 0.06);
  flame(fw * 0.42, fh * 0.45, FIRE.inner, s * 0.12);
  flame(fw * 0.2, fh * 0.22, FIRE.core, s * 0.16);
  g.rotation = Math.sin(t * 7) * 0.06;
}
