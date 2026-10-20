import { Container, Graphics } from 'pixi.js';
import type { CreatureKind } from '@draycol/core';
import { OL, outlineWidth } from './vector-resources';

/**
 * Criaturas vistas desde arriba, mirando hacia +x, al estilo de la guía:
 * contorno grueso, sombreado plano, cara expresiva.
 */

const TIGER = { base: 0xf08a2a, dark: 0xc96a1a, light: 0xffb45c, belly: 0xffe3b8, stripe: 0x2b1708, nose: 0xf5c7b0, eye: 0x1c1208 };
const SHEEP = { wool: 0xf5f1e8, woolShade: 0xd6cfc2, woolDark: 0xb9b0a1, face: 0x4a3f3a, faceDark: 0x2e2724, eye: 0xff3b3b, tooth: 0xfdfdf5 };
const GOBLIN = { base: 0x7cb843, dark: 0x4f8a2a, light: 0xa5d65c, ear: 0x5d9a33, eye: 0xf4e04d, pupil: 0x1a1a1a, tooth: 0xfdfdf5, cloth: 0x8a6a3a, clothDark: 0x5d4525 };

export function makeTigerVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r * 1.2);
  const bw = r * 1.65; // semi-largo del cuerpo
  const bh = r * 1.0;

  // Cola (detrás)
  const tail = (w: number, col: number) =>
    g.moveTo(-bw * 0.95, bh * 0.2)
      .bezierCurveTo(-bw * 1.45, bh * 0.5, -bw * 1.75, -bh * 0.3, -bw * 1.45, -bh * 0.95)
      .stroke({ width: w, color: col, cap: 'round' });
  tail(r * 0.3 + ow * 2, OL);
  tail(r * 0.3, TIGER.base);
  for (const t of [0.35, 0.6, 0.85]) {
    const px = -bw * (0.95 + 0.5 * t * 1.0);
    const py = bh * (0.2 - 1.15 * t);
    g.circle(px, py, r * 0.11).fill(TIGER.stripe);
  }
  g.circle(-bw * 1.45, -bh * 0.95, r * 0.17).fill(TIGER.stripe);

  // Patas (4) asomando
  for (const [sx, sy] of [[0.55, -1], [0.55, 1], [-0.55, -1], [-0.55, 1]] as const) {
    g.ellipse(bw * sx, sy * bh * 0.95, r * 0.3, r * 0.26).fill(TIGER.base).stroke({ width: ow, color: OL });
    for (let k = -1; k <= 1; k++) g.circle(bw * sx + k * r * 0.13, sy * (bh * 0.95 + r * 0.2), r * 0.06).fill(OL);
  }

  // Cuerpo
  g.ellipse(0, 0, bw, bh).fill(TIGER.base).stroke({ width: ow, color: OL });
  g.ellipse(bw * 0.05, bh * 0.2, bw * 0.75, bh * 0.55).fill({ color: TIGER.dark, alpha: 0.35 });
  g.ellipse(-bw * 0.1, -bh * 0.3, bw * 0.6, bh * 0.35).fill({ color: TIGER.light, alpha: 0.35 });
  // Rayas: curvas que cruzan el lomo
  for (const t of [-0.62, -0.34, -0.06, 0.22, 0.5]) {
    const x = bw * t;
    g.moveTo(x - r * 0.12, -bh * 0.92)
      .quadraticCurveTo(x + r * 0.18, 0, x - r * 0.12, bh * 0.92)
      .stroke({ width: r * 0.17, color: TIGER.stripe, cap: 'round' });
  }
  g.moveTo(-bw * 0.9, -bh * 0.1).lineTo(-bw * 0.35, 0).lineTo(-bw * 0.9, bh * 0.1).stroke({ width: r * 0.12, color: TIGER.stripe, cap: 'round', join: 'round' });

  // Cabeza
  const hx = bw * 0.88;
  const hr = r * 0.8;
  // orejas
  for (const s of [-1, 1]) {
    g.circle(hx - hr * 0.35, s * hr * 0.9, hr * 0.36).fill(TIGER.base).stroke({ width: ow, color: OL });
    g.circle(hx - hr * 0.35, s * hr * 0.9, hr * 0.18).fill(TIGER.stripe);
  }
  g.circle(hx, 0, hr).fill(TIGER.base).stroke({ width: ow, color: OL });
  g.arc(hx, 0, hr * 0.98, -Math.PI * 0.75, -Math.PI * 0.2).lineTo(hx, 0).closePath().fill({ color: TIGER.light, alpha: 0.3 });
  // rayas de la frente
  g.moveTo(hx - hr * 0.6, -hr * 0.45).lineTo(hx - hr * 0.25, -hr * 0.2).stroke({ width: r * 0.1, color: TIGER.stripe, cap: 'round' });
  g.moveTo(hx - hr * 0.6, hr * 0.45).lineTo(hx - hr * 0.25, hr * 0.2).stroke({ width: r * 0.1, color: TIGER.stripe, cap: 'round' });
  g.moveTo(hx - hr * 0.8, 0).lineTo(hx - hr * 0.4, 0).stroke({ width: r * 0.09, color: TIGER.stripe, cap: 'round' });
  // mejillas y hocico
  for (const s of [-1, 1]) g.circle(hx + hr * 0.5, s * hr * 0.42, hr * 0.33).fill(TIGER.belly);
  g.ellipse(hx + hr * 0.78, 0, hr * 0.26, hr * 0.17).fill(TIGER.nose).stroke({ width: Math.max(2, ow * 0.6), color: OL });
  // ojos (enfadado: cejas inclinadas)
  for (const s of [-1, 1]) {
    g.ellipse(hx + hr * 0.2, s * hr * 0.42, hr * 0.16, hr * 0.2).fill(0xfff7e6).stroke({ width: Math.max(1.5, ow * 0.5), color: OL });
    g.circle(hx + hr * 0.24, s * hr * 0.4, hr * 0.09).fill(TIGER.eye);
    g.moveTo(hx - hr * 0.02, s * hr * 0.2).lineTo(hx + hr * 0.38, s * hr * 0.62).stroke({ width: r * 0.09, color: OL, cap: 'round' });
  }
  // bigotes
  for (const s of [-1, 1]) for (const k of [0.1, 0.3]) g.moveTo(hx + hr * 0.7, s * hr * (0.35 + k * 0.5)).lineTo(hx + hr * 1.25, s * hr * (0.55 + k)).stroke({ width: Math.max(1.2, ow * 0.4), color: OL, alpha: 0.8 });
  c.addChild(g);
  return c;
}

export function makeSheepVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r * 1.2);
  // patas
  for (const [sx, sy] of [[0.45, -1], [0.45, 1], [-0.5, -1], [-0.5, 1]] as const) g.ellipse(r * sx, sy * r * 0.98, r * 0.2, r * 0.17).fill(SHEEP.faceDark).stroke({ width: ow, color: OL });
  // lana: contorno (círculos ampliados) + relleno
  const puffs: [number, number, number][] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    puffs.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.42]);
  }
  puffs.push([0, 0, r * 0.72]);
  for (const [x, y, rr] of puffs) g.circle(x, y, rr + ow).fill(OL);
  for (const [x, y, rr] of puffs) g.circle(x, y, rr).fill(SHEEP.woolShade);
  for (const [x, y, rr] of puffs) g.circle(x - r * 0.08, y - r * 0.1, rr * 0.78).fill(SHEEP.wool);
  // sombra abajo-derecha y rizos
  g.arc(0, 0, r * 0.98, -Math.PI * 0.2, Math.PI * 0.7).lineTo(0, 0).closePath().fill({ color: SHEEP.woolDark, alpha: 0.18 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.14, a, a + Math.PI * 1.2).stroke({ width: Math.max(1.4, ow * 0.4), color: SHEEP.woolDark, alpha: 0.7, cap: 'round' });
  }
  // cabeza oscura al frente
  const hx = r * 1.05;
  const hr = r * 0.52;
  for (const s of [-1, 1]) g.ellipse(hx - hr * 0.3, s * hr * 1.0, hr * 0.42, hr * 0.26).fill(SHEEP.face).stroke({ width: ow, color: OL });
  g.ellipse(hx, 0, hr, hr * 0.88).fill(SHEEP.face).stroke({ width: ow, color: OL });
  g.ellipse(hx + hr * 0.1, hr * 0.25, hr * 0.8, hr * 0.5).fill({ color: SHEEP.faceDark, alpha: 0.5 });
  // flequillo de lana sobre la frente
  g.circle(hx - hr * 0.55, 0, hr * 0.42).fill(SHEEP.wool).stroke({ width: Math.max(1.5, ow * 0.5), color: OL });
  // ojos rojos enfadados
  for (const s of [-1, 1]) {
    g.circle(hx + hr * 0.3, s * hr * 0.4, hr * 0.17).fill(SHEEP.eye).stroke({ width: Math.max(1.5, ow * 0.5), color: OL });
    g.circle(hx + hr * 0.33, s * hr * 0.38, hr * 0.07).fill(0x330000);
    g.moveTo(hx + hr * 0.05, s * hr * 0.18).lineTo(hx + hr * 0.5, s * hr * 0.55).stroke({ width: Math.max(2, ow * 0.6), color: OL, cap: 'round' });
  }
  // colmillos
  for (const s of [-1, 1]) g.poly([hx + hr * 0.75, s * hr * 0.25, hx + hr * 0.95, s * hr * 0.1, hx + hr * 0.78, s * hr * 0.05], true).fill(SHEEP.tooth).stroke({ width: 1.2, color: OL });
  c.addChild(g);
  return c;
}

export function makeGoblinVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const ow = outlineWidth(r * 1.4);
  // brazos y cuerpo pequeño (detrás de la cabeza)
  for (const s of [-1, 1]) g.moveTo(-r * 0.3, s * r * 0.5).lineTo(r * 0.5, s * r * 1.05).stroke({ width: r * 0.34 + ow * 2, color: OL, cap: 'round' });
  for (const s of [-1, 1]) g.moveTo(-r * 0.3, s * r * 0.5).lineTo(r * 0.5, s * r * 1.05).stroke({ width: r * 0.34, color: GOBLIN.base, cap: 'round' });
  for (const s of [-1, 1]) g.circle(r * 0.5, s * r * 1.05, r * 0.24).fill(GOBLIN.base).stroke({ width: ow, color: OL });
  g.ellipse(-r * 0.35, 0, r * 0.75, r * 0.7).fill(GOBLIN.cloth).stroke({ width: ow, color: OL });
  g.ellipse(-r * 0.4, r * 0.1, r * 0.5, r * 0.4).fill({ color: GOBLIN.clothDark, alpha: 0.6 });
  // orejas puntiagudas hacia atrás
  for (const s of [-1, 1]) {
    g.poly([-r * 0.3, s * r * 0.55, -r * 1.35, s * r * 1.2, -r * 0.05, s * r * 0.95], true).fill(GOBLIN.ear).stroke({ width: ow, color: OL, join: 'round' });
    g.poly([-r * 0.45, s * r * 0.7, -r * 1.05, s * r * 1.08, -r * 0.25, s * r * 0.88], true).fill({ color: GOBLIN.dark, alpha: 0.5 });
  }
  // cabeza
  g.circle(0, 0, r).fill(GOBLIN.base).stroke({ width: ow, color: OL });
  g.arc(0, 0, r * 0.96, Math.PI * 0.85, Math.PI * 1.65).lineTo(0, 0).closePath().fill({ color: GOBLIN.light, alpha: 0.35 });
  g.arc(0, 0, r * 0.96, -Math.PI * 0.15, Math.PI * 0.65).lineTo(0, 0).closePath().fill({ color: GOBLIN.dark, alpha: 0.3 });
  // ojos amarillos grandes con cejas
  for (const s of [-1, 1]) {
    g.ellipse(r * 0.42, s * r * 0.36, r * 0.2, r * 0.24).fill(GOBLIN.eye).stroke({ width: Math.max(1.5, ow * 0.5), color: OL });
    g.circle(r * 0.5, s * r * 0.34, r * 0.1).fill(GOBLIN.pupil);
    g.moveTo(r * 0.15, s * r * 0.12).lineTo(r * 0.62, s * r * 0.58).stroke({ width: r * 0.1, color: OL, cap: 'round' });
  }
  // nariz y sonrisa con dientes
  g.poly([r * 0.78, -r * 0.08, r * 1.08, 0, r * 0.78, r * 0.08], true).fill(GOBLIN.dark).stroke({ width: 1.5, color: OL, join: 'round' });
  g.moveTo(r * 0.55, -r * 0.6).quadraticCurveTo(r * 0.95, 0, r * 0.55, r * 0.6).stroke({ width: Math.max(2, ow * 0.6), color: OL, cap: 'round' });
  for (const t of [-0.35, -0.05, 0.25]) g.poly([r * 0.72, t * r, r * 0.86, t * r + r * 0.07, r * 0.72, t * r + r * 0.14], true).fill(GOBLIN.tooth);
  c.addChild(g);
  return c;
}

export function makeCreatureVector(kind: CreatureKind, r: number): Container {
  switch (kind) {
    case 'tiger':
      return makeTigerVector(r);
    case 'sheep':
      return makeSheepVector(r);
    case 'goblin':
      return makeGoblinVector(r);
  }
}
