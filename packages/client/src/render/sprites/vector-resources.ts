import { Container, Graphics } from 'pixi.js';
import { Rng, type ResourceKind, type Size } from '@draycol/core';

/**
 * Recursos dibujados en código al estilo de la guía: contorno negro grueso, tres tonos
 * (sombra / base / luz), brillos y detalles (hojas con nervio, facetas, grietas, anillos).
 * Se escalan con el radio de colisión `r` y se ven nítidos a cualquier zoom.
 */

export const OL = 0x1b1510;
export const outlineWidth = (r: number): number => Math.max(3, r * 0.08);

const LEAF = { shadow: 0x1f6b2a, dark: 0x2e8a35, base: 0x43a83f, light: 0x74cc4c, lighter: 0xa9e86a, outline: 0x163f17 };
const TRUNK = { dark: 0x4f3015, base: 0x8a5a2b, light: 0xb98448, ring: 0x6d4320 };
const ROCK = { shadow: 0x4d545d, dark: 0x6b747e, base: 0x8f99a3, light: 0xb7c1ca, lighter: 0xe4eaef, outline: 0x22262b };
const APPLE = { base: 0xdc3b2c, dark: 0x9a1c15, light: 0xff8f7a, leaf: 0x58b547 };

/** Hoja con nervio central, orientada por `rot`. */
export function drawLeaf(g: Graphics, x: number, y: number, len: number, rot: number, fill: number, outline: number, ow: number): void {
  const w = len * 0.42;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const P = (lx: number, ly: number): [number, number] => [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
  const [ax, ay] = P(-len / 2, 0);
  const [bx, by] = P(len / 2, 0);
  const [c1x, c1y] = P(0, -w);
  const [c2x, c2y] = P(0, w);
  g.moveTo(ax, ay).quadraticCurveTo(c1x, c1y, bx, by).quadraticCurveTo(c2x, c2y, ax, ay).closePath().fill(fill).stroke({ width: ow, color: outline, join: 'round' });
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: Math.max(1, ow * 0.6), color: outline, alpha: 0.55 });
}

function canopyCircles(rng: Rng, r: number): [number, number, number][] {
  const out: [number, number, number][] = [[0, 0, r * 0.72]];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const d = r * rng.range(0.5, 0.62);
    out.push([Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.36, 0.46)]);
  }
  return out;
}

export function makeTree(kind: 'tree' | 'apple_tree', _size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r);
  const circles = canopyCircles(rng, r);

  for (const [x, y, rr] of circles) g.circle(x, y, rr + ow).fill(LEAF.outline);
  for (const [x, y, rr] of circles) g.circle(x, y, rr).fill(LEAF.shadow);
  for (const [x, y, rr] of circles) g.circle(x - r * 0.06, y - r * 0.07, rr * 0.86).fill(LEAF.dark);
  for (const [x, y, rr] of circles) g.circle(x - r * 0.11, y - r * 0.13, rr * 0.66).fill(LEAF.base);
  for (let i = 0; i < 9; i++) {
    const a = rng.range(Math.PI * 0.85, Math.PI * 1.75);
    const d = r * rng.range(0.15, 0.6);
    g.circle(Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.14, 0.24)).fill(LEAF.light);
  }
  for (let i = 0; i < 4; i++) {
    const a = rng.range(Math.PI * 1.0, Math.PI * 1.6);
    const d = r * rng.range(0.25, 0.55);
    g.circle(Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.07, 0.11)).fill(LEAF.lighter);
  }
  c.addChild(g);

  const leaves = new Graphics();
  for (let i = 0; i < 22; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = r * rng.range(0.15, 0.95);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const lit = x + y < -r * 0.05;
    const fill = lit ? (rng.next() < 0.4 ? LEAF.lighter : LEAF.light) : rng.next() < 0.5 ? LEAF.base : LEAF.dark;
    drawLeaf(leaves, x, y, r * rng.range(0.2, 0.3), a + rng.range(-0.6, 0.6), fill, LEAF.outline, Math.max(1.2, ow * 0.4));
  }
  c.addChild(leaves);

  const br = new Graphics();
  const arms = [-2.3, -0.3, 1.7];
  const len = r * 0.24;
  for (const a of arms) br.moveTo(0, 0).lineTo(Math.cos(a) * len, Math.sin(a) * len).stroke({ width: r * 0.1 + ow * 1.3, color: OL, cap: 'round' });
  for (const a of arms) br.moveTo(0, 0).lineTo(Math.cos(a) * len, Math.sin(a) * len).stroke({ width: r * 0.1, color: TRUNK.base, cap: 'round' });
  br.circle(0, 0, r * 0.1).fill(TRUNK.light);
  br.circle(-r * 0.015, -r * 0.015, r * 0.045).fill(TRUNK.dark);
  c.addChild(br);

  if (kind === 'apple_tree') {
    const ap = new Graphics();
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const d = r * rng.range(0.3, 0.78);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const ar = Math.max(4.5, r * 0.11);
      ap.circle(x, y, ar).fill(APPLE.base).stroke({ width: Math.max(2, ow * 0.65), color: 0x4a0f0b });
      ap.arc(x, y, ar * 0.78, Math.PI * 0.1, Math.PI * 0.75).lineTo(x, y).closePath().fill({ color: APPLE.dark, alpha: 0.35 });
      ap.circle(x - ar * 0.32, y - ar * 0.32, ar * 0.26).fill(APPLE.light);
      drawLeaf(ap, x + ar * 0.5, y - ar * 0.75, ar * 0.8, -0.6, APPLE.leaf, 0x2f6b25, 1.2);
    }
    c.addChild(ap);
  }
  return c;
}

export function makeStump(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const sr = Math.max(12, r * 0.5);
  const ow = Math.max(3, sr * 0.13);

  const roots = [0.6, 2.4, 4.2];
  const rootPath = (k: number) => {
    for (const a of roots)
      g.moveTo(Math.cos(a) * sr * 0.8, Math.sin(a) * sr * 0.8)
        .lineTo(Math.cos(a - 0.12) * sr * 1.5, Math.sin(a - 0.12) * sr * 1.5)
        .stroke({ width: sr * 0.34 * k, color: k > 1 ? OL : TRUNK.dark, cap: 'round' });
  };
  rootPath(1.9);
  const pts: number[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = sr * (i % 2 === 0 ? 1.2 : 1.06) * rng.range(0.97, 1.03);
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.poly(pts, true).fill(TRUNK.dark).stroke({ width: ow, color: OL, join: 'round' });
  rootPath(1);
  g.poly(pts, true).fill(TRUNK.dark);
  for (let i = 0; i < n; i += 2) {
    const a = (i / n) * Math.PI * 2 + 0.1;
    g.moveTo(Math.cos(a) * sr * 0.96, Math.sin(a) * sr * 0.96).lineTo(Math.cos(a) * sr * 1.12, Math.sin(a) * sr * 1.12).stroke({ width: Math.max(1.2, sr * 0.05), color: OL, alpha: 0.45 });
  }
  g.circle(0, 0, sr * 0.9).fill(TRUNK.light).stroke({ width: Math.max(2, ow * 0.6), color: TRUNK.dark });
  for (let k = 0.76; k > 0.1; k -= 0.15) g.circle(sr * 0.03, sr * 0.02, sr * k).stroke({ width: Math.max(1.4, sr * 0.055), color: TRUNK.ring, alpha: 0.85 });
  g.circle(sr * 0.06, sr * 0.04, sr * 0.08).fill(TRUNK.ring);
  g.arc(0, 0, sr * 0.9, -Math.PI * 0.3, Math.PI * 0.62).lineTo(0, 0).closePath().fill({ color: TRUNK.dark, alpha: 0.2 });
  g.arc(0, 0, sr * 0.74, Math.PI * 1.08, Math.PI * 1.42).stroke({ width: sr * 0.09, color: 0xffffff, alpha: 0.4, cap: 'round' });
  c.addChild(g);
  return c;
}

/** Roca facetada: polígono irregular, triángulos desde el borde hacia un punto alto iluminado. */
export function drawFacetedRock(g: Graphics, x: number, y: number, r: number, rng: Rng, ow: number, vertices = 8): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < vertices; i++) {
    const a = (i / vertices) * Math.PI * 2 + rng.range(-0.14, 0.14);
    const rr = r * rng.range(0.8, 1);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  g.poly(pts.flat(), true).fill(ROCK.dark).stroke({ width: ow, color: ROCK.outline, join: 'round' });
  const px = x - r * 0.22;
  const py = y - r * 0.28;
  const lx = -0.6;
  const ly = -0.8;
  for (let i = 0; i < vertices; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % vertices];
    const mx = (ax + bx) / 2 - x;
    const my = (ay + by) / 2 - y;
    const ml = Math.hypot(mx, my) || 1;
    const dot = (mx / ml) * lx + (my / ml) * ly;
    const col = dot > 0.5 ? ROCK.light : dot > -0.1 ? ROCK.base : dot > -0.6 ? ROCK.dark : ROCK.shadow;
    g.poly([ax, ay, bx, by, px, py], true).fill(col);
    g.moveTo(ax, ay).lineTo(px, py).stroke({ width: Math.max(1, ow * 0.35), color: ROCK.outline, alpha: 0.35 });
  }
  g.circle(px, py, r * 0.18).fill(ROCK.light);
  g.circle(px - r * 0.06, py - r * 0.06, r * 0.08).fill(ROCK.lighter);
  const cx = x + r * rng.range(0.05, 0.35);
  const cy = y + r * rng.range(0.1, 0.4);
  g.moveTo(cx, cy).lineTo(cx + r * 0.14, cy + r * 0.2).lineTo(cx + r * 0.06, cy + r * 0.38).stroke({ width: Math.max(1.2, ow * 0.4), color: ROCK.outline, alpha: 0.55, cap: 'round', join: 'round' });
}

export function makeRock(_size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  drawFacetedRock(g, 0, 0, r * 1.02, rng, outlineWidth(r));
  c.addChild(g);
  return c;
}

export function makeRubble(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = Math.max(2.5, r * 0.07);
  drawFacetedRock(g, -r * 0.36, r * 0.08, r * 0.5, rng, ow, 6);
  drawFacetedRock(g, r * 0.34, -r * 0.12, r * 0.42, rng, ow, 6);
  for (let i = 0; i < 6; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = r * rng.range(0.75, 1.1);
    drawFacetedRock(g, Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.1, 0.17), rng, Math.max(1.5, ow * 0.6), 5);
  }
  c.addChild(g);
  return c;
}

export function makeResourceVector(kind: ResourceKind, size: Size, r: number, broken: boolean, seed: number): Container {
  if (broken) return kind === 'rock' ? makeRubble(r, seed) : makeStump(r, seed);
  if (kind === 'rock') return makeRock(size, r, seed);
  return makeTree(kind, size, r, seed);
}
