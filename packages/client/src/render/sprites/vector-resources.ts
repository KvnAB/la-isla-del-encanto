import { Container, Graphics } from 'pixi.js';
import { Rng, type ResourceKind, type Size } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

/**
 * Recursos en estilo plano (referencia estilo-plano): círculos concéntricos para los árboles,
 * polígonos facetados para las rocas, contorno grueso y sin sombreado pintado.
 */

export const OL = PALETTE.outline;
export const outlineWidth = (r: number): number => Math.max(OUTLINE_WIDTH, r * 0.07);

/** Un "anillo" de árbol: círculo oscuro con contorno y círculo interior más claro. */
function treeRing(g: Graphics, x: number, y: number, r: number, ow: number): void {
  g.circle(x, y, r).fill(PALETTE.treeMid).stroke({ width: ow, color: PALETTE.treeOutline });
  g.circle(x, y, r * 0.62).fill(PALETTE.treeLight);
}

export function makeTree(kind: 'tree' | 'apple_tree', size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r);

  if (kind === 'apple_tree') {
    // copa festoneada: varios círculos unidos, contorno exterior y relleno plano
    const lobes: [number, number, number][] = [[0, 0, r * 0.7]];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rng.range(-0.2, 0.2);
      lobes.push([Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * rng.range(0.4, 0.5)]);
    }
    for (const [x, y, rr] of lobes) g.circle(x, y, rr + ow).fill(PALETTE.treeOutline);
    for (const [x, y, rr] of lobes) g.circle(x, y, rr).fill(PALETTE.treeMid);
    for (const [x, y, rr] of lobes) g.circle(x - r * 0.04, y - r * 0.05, rr * 0.55).fill(PALETTE.treeLight);
    const n = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
    const ar = Math.max(4, r * 0.11);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const d = r * rng.range(0.25, 0.75);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      g.circle(x, y, ar).fill(PALETTE.apple).stroke({ width: Math.max(2, ow * 0.6), color: PALETTE.appleOutline });
      g.circle(x - ar * 0.3, y - ar * 0.3, ar * 0.25).fill(0xffffff, 0.8);
    }
  } else if (size === 'small') {
    treeRing(g, 0, 0, r, ow);
  } else {
    // racimo de anillos: uno grande y 2-3 satélites, como en la referencia
    const sats = size === 'medium' ? 2 : 3;
    const rings: [number, number, number][] = [];
    for (let i = 0; i < sats; i++) {
      const a = (i / sats) * Math.PI * 2 + rng.range(-0.4, 0.4) + 0.6;
      rings.push([Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * rng.range(0.42, 0.52)]);
    }
    rings.push([0, 0, r * 0.68]);
    for (const [x, y, rr] of rings) treeRing(g, x, y, rr, ow);
  }
  c.addChild(g);
  return c;
}

export function makeStump(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const sr = Math.max(12, r * 0.5);
  const ow = Math.max(OUTLINE_WIDTH, sr * 0.12);
  // raíces como bultos alrededor
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.range(-0.2, 0.2);
    g.circle(Math.cos(a) * sr * 1.05, Math.sin(a) * sr * 1.05, sr * 0.3).fill(PALETTE.stumpDark).stroke({ width: ow, color: OL });
  }
  g.circle(0, 0, sr * 1.05).fill(PALETTE.stumpDark).stroke({ width: ow, color: OL });
  g.circle(0, 0, sr * 0.82).fill(PALETTE.stump);
  // espiral de anillos
  g.moveTo(0, 0);
  const turns = 2.6;
  const steps = 40;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const rr = t * sr * 0.68;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.stroke({ width: Math.max(1.6, sr * 0.07), color: PALETTE.stumpRing, cap: 'round', join: 'round' });
  c.addChild(g);
  return c;
}

/** Roca plana: polígono irregular con una faceta clara arriba-izquierda y otra oscura abajo-derecha. */
export function drawFlatRock(g: Graphics, x: number, y: number, r: number, rng: Rng, ow: number, vertices = 8): void {
  const pts: number[] = [];
  for (let i = 0; i < vertices; i++) {
    const a = (i / vertices) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const rr = r * rng.range(0.82, 1);
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts, true).fill(PALETTE.rock).stroke({ width: ow, color: PALETTE.rockOutline, join: 'round' });
  // faceta clara: mitad superior izquierda del polígono encogido
  const light: number[] = [];
  for (let i = 0; i < vertices; i++) {
    const px = pts[i * 2];
    const py = pts[i * 2 + 1];
    const dx = px - x;
    const dy = py - y;
    if (dx + dy < r * 0.2) light.push(x + dx * 0.7 - r * 0.08, y + dy * 0.7 - r * 0.1);
  }
  if (light.length >= 6) g.poly(light, true).fill(PALETTE.rockLight);
  const dark: number[] = [];
  for (let i = 0; i < vertices; i++) {
    const px = pts[i * 2];
    const py = pts[i * 2 + 1];
    const dx = px - x;
    const dy = py - y;
    if (dx + dy > r * 0.5) dark.push(x + dx * 0.86, y + dy * 0.86);
  }
  if (dark.length >= 6) g.poly(dark, true).fill(PALETTE.rockDark);
}

/** Pepita de oro: polígono facetado dorado con un brillo. */
export function drawGoldNugget(g: Graphics, x: number, y: number, r: number, rng: Rng, ow: number, vertices = 7): void {
  const pts: number[] = [];
  for (let i = 0; i < vertices; i++) {
    const a = (i / vertices) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rr = r * rng.range(0.78, 1);
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts, true).fill(PALETTE.gold).stroke({ width: ow, color: PALETTE.goldOutline, join: 'round' });
  const dark: number[] = [];
  for (let i = 0; i < vertices; i++) {
    const dx = pts[i * 2] - x;
    const dy = pts[i * 2 + 1] - y;
    if (dx + dy > r * 0.4) dark.push(x + dx * 0.85, y + dy * 0.85);
  }
  if (dark.length >= 6) g.poly(dark, true).fill(PALETTE.goldDark);
  g.circle(x - r * 0.3, y - r * 0.3, r * 0.22).fill(PALETTE.goldLight);
  g.circle(x - r * 0.38, y - r * 0.38, r * 0.08).fill(0xffffff, 0.9);
}

/** Roca de oro: roca gris con vetas y pepitas doradas incrustadas. */
export function makeGoldRock(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r);
  drawFlatRock(g, 0, 0, r, rng, ow);
  // vetas
  for (let i = 0; i < 2; i++) {
    const a = rng.range(0, Math.PI * 2);
    const x0 = Math.cos(a) * r * 0.55;
    const y0 = Math.sin(a) * r * 0.55;
    g.moveTo(x0, y0)
      .quadraticCurveTo(rng.range(-r * 0.3, r * 0.3), rng.range(-r * 0.3, r * 0.3), -x0 * 0.7, -y0 * 0.7)
      .stroke({ width: Math.max(2, r * 0.07), color: PALETTE.goldDark, cap: 'round', alpha: 0.85 });
  }
  // pepitas
  const n = 3 + rng.int(0, 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const d = r * rng.range(0.25, 0.6);
    drawGoldNugget(g, Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.16, 0.26), rng, Math.max(1.5, ow * 0.6), 6);
  }
  c.addChild(g);
  return c;
}

export function makeRock(_size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  drawFlatRock(g, 0, 0, r, rng, outlineWidth(r));
  c.addChild(g);
  return c;
}

/** Roca agrietada (recurso vaciado). */
export function makeRubble(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r);
  drawFlatRock(g, 0, 0, r, rng, ow);
  const crack = (pts: number[]) => g.poly(pts, false).stroke({ width: Math.max(2, ow * 0.7), color: PALETTE.rockOutline, join: 'round', cap: 'round' });
  crack([-r * 0.1, -r * 0.95, 0, -r * 0.5, -r * 0.2, -r * 0.1, r * 0.1, r * 0.35, -r * 0.05, r * 0.9]);
  crack([-r * 0.2, -r * 0.1, -r * 0.7, -r * 0.3]);
  crack([r * 0.1, r * 0.35, r * 0.6, r * 0.2]);
  crack([0, -r * 0.5, r * 0.45, -r * 0.65]);
  c.addChild(g);
  return c;
}

export function makeResourceVector(kind: ResourceKind, size: Size, r: number, broken: boolean, seed: number): Container {
  if (broken) return kind === 'rock' || kind === 'gold_rock' ? makeRubble(r, seed) : makeStump(r, seed);
  if (kind === 'rock') return makeRock(size, r, seed);
  if (kind === 'gold_rock') return makeGoldRock(r, seed);
  return makeTree(kind, size, r, seed);
}
