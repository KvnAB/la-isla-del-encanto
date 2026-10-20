import { Container, Graphics } from 'pixi.js';
import { Rng, type ResourceKind, type Size } from '@draycol/core';

/**
 * Recursos dibujados en código siguiendo la guía de estilo: contorno negro grueso,
 * tres tonos (sombra / base / luz), brillos pequeños y detalles (hojas, grietas, anillos).
 * Todo se escala con el radio de colisión `r`, así que se ve nítido a cualquier zoom.
 */

const OL = 0x1a1a1a;
const OUT = (r: number) => Math.max(3, r * 0.085);

const LEAF = { dark: 0x2a7a2e, base: 0x3f9a3a, light: 0x6cc24a, lighter: 0x9ddc5a, outline: 0x1b4d1d };
const TRUNK = { dark: 0x5a3a1c, base: 0x8a5a2b, light: 0xb57a3a };
const ROCK = { dark: 0x5d646d, base: 0x8b949e, light: 0xb8c2cb, lighter: 0xe2e8ee };
const APPLE = { base: 0xd9332a, dark: 0x9c1f18, light: 0xff7a6a };

/** Círculos de hojas distribuidos de forma estable (misma semilla → mismo árbol). */
function leafClusters(rng: Rng, r: number, n: number, radiusK: [number, number], spread: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const d = r * spread * rng.range(0.55, 1);
    out.push([Math.cos(a) * d, Math.sin(a) * d, r * rng.range(radiusK[0], radiusK[1])]);
  }
  return out;
}

export function makeTree(kind: 'tree' | 'apple_tree', _size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = OUT(r);

  // 1) Silueta: copa = unión de círculos, contorno grueso alrededor.
  const outer = leafClusters(rng, r, 9, [0.42, 0.55], 0.62);
  outer.push([0, 0, r * 0.78]);
  for (const [x, y, rr] of outer) g.circle(x, y, rr + ow).fill(LEAF.outline);
  for (const [x, y, rr] of outer) g.circle(x, y, rr).fill(LEAF.dark);

  // 2) Tono base: círculos un poco más pequeños, desplazados hacia arriba-izquierda (luz).
  for (const [x, y, rr] of outer) g.circle(x - r * 0.05, y - r * 0.06, rr * 0.82).fill(LEAF.base);

  // 3) Luz: racimos pequeños en la mitad superior izquierda.
  const lit = leafClusters(rng, r, 7, [0.16, 0.26], 0.5).filter(([x, y]) => x + y < r * 0.25);
  for (const [x, y, rr] of lit) g.circle(x - r * 0.08, y - r * 0.1, rr).fill(LEAF.light);
  for (const [x, y, rr] of lit.slice(0, 3)) g.circle(x - r * 0.14, y - r * 0.16, rr * 0.45).fill(LEAF.lighter);

  // 4) Hojas sueltas: elipses con contorno fino, orientadas al azar.
  for (let i = 0; i < 10; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = r * rng.range(0.2, 0.85);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rot = rng.next() * Math.PI;
    const lw = r * 0.17;
    const lh = r * 0.08;
    const col = x + y < 0 ? LEAF.light : LEAF.base;
    const leaf = new Graphics();
    leaf.ellipse(0, 0, lw, lh).fill(col).stroke({ width: Math.max(1.5, ow * 0.45), color: LEAF.outline, alpha: 0.9 });
    leaf.moveTo(-lw * 0.8, 0).lineTo(lw * 0.8, 0).stroke({ width: 1.2, color: LEAF.outline, alpha: 0.5 });
    leaf.position.set(x, y);
    leaf.rotation = rot;
    c.addChild(g, leaf);
  }
  if (c.children.length === 0) c.addChild(g);

  // 5) Centro: ramas en Y vistas desde arriba (como en la guía).
  const br = new Graphics();
  const arm = (a: number, len: number) => {
    br.moveTo(0, 0)
      .lineTo(Math.cos(a) * len, Math.sin(a) * len)
      .stroke({ width: r * 0.1 + ow * 1.4, color: OL, cap: 'round' });
  };
  const arms = [-2.4, -0.4, 1.6];
  for (const a of arms) arm(a, r * 0.26);
  br.circle(0, 0, r * 0.11 + ow * 0.6).fill(OL);
  for (const a of arms)
    br.moveTo(0, 0)
      .lineTo(Math.cos(a) * r * 0.26, Math.sin(a) * r * 0.26)
      .stroke({ width: r * 0.1, color: TRUNK.base, cap: 'round' });
  br.circle(0, 0, r * 0.11).fill(TRUNK.light);
  br.circle(-r * 0.02, -r * 0.02, r * 0.05).fill(TRUNK.dark);
  c.addChild(br);

  // 6) Manzanas.
  if (kind === 'apple_tree') {
    const ap = new Graphics();
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const d = r * rng.range(0.3, 0.8);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const ar = Math.max(4, r * 0.11);
      ap.circle(x, y, ar).fill(APPLE.base).stroke({ width: Math.max(2, ow * 0.6), color: 0x4a0f0b });
      ap.circle(x + ar * 0.15, y + ar * 0.2, ar * 0.75).fill({ color: APPLE.dark, alpha: 0.35 });
      ap.circle(x - ar * 0.3, y - ar * 0.3, ar * 0.28).fill(APPLE.light);
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
  const ow = Math.max(3, sr * 0.14);
  // corteza: polígono dentado
  const pts: number[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = sr * (i % 2 === 0 ? 1.18 : 1.05) * rng.range(0.97, 1.03);
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.poly(pts, true).fill(TRUNK.dark).stroke({ width: ow, color: OL, join: 'round' });
  // raíces insinuadas
  for (const a of [0.7, 2.3, 4.1]) {
    g.moveTo(Math.cos(a) * sr * 0.9, Math.sin(a) * sr * 0.9)
      .lineTo(Math.cos(a) * sr * 1.45, Math.sin(a) * sr * 1.45)
      .stroke({ width: sr * 0.3 + ow * 1.5, color: OL, cap: 'round' });
  }
  for (const a of [0.7, 2.3, 4.1]) {
    g.moveTo(Math.cos(a) * sr * 0.9, Math.sin(a) * sr * 0.9)
      .lineTo(Math.cos(a) * sr * 1.45, Math.sin(a) * sr * 1.45)
      .stroke({ width: sr * 0.3, color: TRUNK.dark, cap: 'round' });
  }
  g.poly(pts, true).fill(TRUNK.dark);
  // corte: tono claro con sombra a la derecha
  g.circle(0, 0, sr * 0.92).fill(TRUNK.light);
  g.circle(0, 0, sr * 0.92).stroke({ width: Math.max(2, ow * 0.6), color: TRUNK.dark });
  // anillos
  for (let k = 0.78; k > 0.12; k -= 0.17) g.circle(sr * 0.02, sr * 0.02, sr * k).stroke({ width: Math.max(1.5, sr * 0.06), color: TRUNK.base, alpha: 0.9 });
  g.circle(sr * 0.05, sr * 0.04, sr * 0.1).fill(TRUNK.base);
  // sombra del lado derecho y brillo del izquierdo
  g.arc(0, 0, sr * 0.92, -Math.PI * 0.35, Math.PI * 0.6).lineTo(0, 0).closePath().fill({ color: TRUNK.dark, alpha: 0.22 });
  g.arc(0, 0, sr * 0.8, Math.PI * 1.05, Math.PI * 1.4).stroke({ width: sr * 0.1, color: 0xffffff, alpha: 0.35, cap: 'round' });
  c.addChild(g);
  return c;
}

function rockPolygon(rng: Rng, r: number, n: number, jitter: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.12, 0.12);
    const rr = r * rng.range(1 - jitter, 1);
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return pts;
}

export function makeRock(_size: Size, r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = OUT(r);
  const outer = rockPolygon(rng, r * 1.05, 8, 0.18);
  g.poly(outer, true).fill(ROCK.dark).stroke({ width: ow, color: OL, join: 'round' });

  // faceta principal (tono base) desplazada arriba-izquierda
  const mid = outer.map((v, i) => v * 0.8 + (i % 2 === 0 ? -r * 0.08 : -r * 0.1));
  g.poly(mid, true).fill(ROCK.base);
  // faceta clara: franja superior izquierda pegada al borde (luz desde arriba-izquierda)
  const top: number[] = [];
  for (let i = 0; i < 8; i += 2) top.push(outer[i] * 0.88, outer[i + 1] * 0.88);
  top.push(mid[6] * 0.9, mid[7] * 0.9, mid[2] * 0.75, mid[3] * 0.75);
  g.poly(top, true).fill(ROCK.light);
  // brillo pequeño en la esquina de la faceta
  g.poly([outer[2] * 0.72, outer[3] * 0.72, outer[4] * 0.7, outer[5] * 0.7, outer[4] * 0.45, outer[5] * 0.45], true).fill(ROCK.lighter);

  // aristas: líneas desde algunos vértices exteriores hacia la faceta clara (facetado)
  for (let i = 0; i < outer.length; i += 2) {
    const x0 = outer[i] * 0.95;
    const y0 = outer[i + 1] * 0.95;
    const x1 = top[i];
    const y1 = top[i + 1];
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(1.5, ow * 0.4), color: ROCK.dark, alpha: 0.55 });
  }
  // grieta
  const cx = r * rng.range(-0.3, 0.3);
  const cy = r * rng.range(0.1, 0.5);
  g.moveTo(cx, cy)
    .lineTo(cx + r * 0.18, cy + r * 0.22)
    .lineTo(cx + r * 0.1, cy + r * 0.42)
    .stroke({ width: Math.max(1.5, ow * 0.45), color: OL, alpha: 0.6, cap: 'round', join: 'round' });
  c.addChild(g);
  return c;
}

export function makeRubble(r: number, seed: number): Container {
  const rng = new Rng(seed);
  const c = new Container();
  const g = new Graphics();
  const ow = Math.max(2.5, r * 0.07);
  const chunk = (x: number, y: number, rr: number, rot: number) => {
    const pts = rockPolygon(rng, rr, 6, 0.3);
    const rotated: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const px = pts[i];
      const py = pts[i + 1];
      rotated.push(x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot));
    }
    g.poly(rotated, true).fill(ROCK.dark).stroke({ width: ow, color: OL, join: 'round' });
    g.poly(rotated.map((v, i) => (i % 2 === 0 ? x + (v - x) * 0.6 - rr * 0.1 : y + (v - y) * 0.6 - rr * 0.14)), true).fill(ROCK.base);
    g.poly(rotated.map((v, i) => (i % 2 === 0 ? x + (v - x) * 0.3 - rr * 0.2 : y + (v - y) * 0.3 - rr * 0.26)), true).fill(ROCK.light);
  };
  chunk(-r * 0.32, r * 0.05, r * 0.5, 0.2);
  chunk(r * 0.36, -r * 0.1, r * 0.42, -0.4);
  for (let i = 0; i < 5; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = r * rng.range(0.7, 1.05);
    chunk(Math.cos(a) * d, Math.sin(a) * d, r * rng.range(0.1, 0.18), rng.next() * 3);
  }
  // grieta central entre los dos trozos
  g.moveTo(r * 0.02, -r * 0.5).lineTo(-r * 0.06, -r * 0.1).lineTo(r * 0.08, r * 0.3).lineTo(0, r * 0.55).stroke({ width: ow * 0.9, color: OL, alpha: 0.7, join: 'round', cap: 'round' });
  c.addChild(g);
  return c;
}

export function makeResourceVector(kind: ResourceKind, size: Size, r: number, broken: boolean, seed: number): Container {
  if (broken) return kind === 'rock' ? makeRubble(r, seed) : makeStump(r, seed);
  if (kind === 'rock') return makeRock(size, r, seed);
  return makeTree(kind, size, r, seed);
}
