import { Container, Graphics } from 'pixi.js';
import type { CreatureKind } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

/** Criaturas en estilo plano, vistas desde arriba, mirando hacia +x. */

const OL = PALETTE.outline;
const ow = (r: number) => Math.max(OUTLINE_WIDTH, r * 0.09);

/** Tigre agresivo: cuerpo agazapado, cejas en V, ojos entornados, boca abierta con colmillos. */
export function makeTigerVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  const bw = r * 1.55;
  const bh = r * 1.0;
  // cola levantada con anillos
  const tailW = r * 0.24;
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.45, -r * 0.1, -bw * 1.3, -r * 1.0).stroke({ width: tailW + o * 2, color: OL, cap: 'round' });
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.45, -r * 0.1, -bw * 1.3, -r * 1.0).stroke({ width: tailW, color: PALETTE.tiger, cap: 'round' });
  for (const t of [0.45, 0.75]) g.circle(-bw * (0.9 + 0.42 * t), -r * 0.98 * t + r * 0.05, tailW * 0.52).fill(PALETTE.tigerStripe);
  g.circle(-bw * 1.3, -r * 1.0, tailW * 0.6).fill(PALETTE.tigerStripe);
  // patas con garras
  for (const [sx, sy] of [[0.55, -1], [0.55, 1], [-0.5, -1], [-0.5, 1]] as const) {
    const px = bw * sx;
    const py = sy * bh * 0.98;
    g.ellipse(px, py, r * 0.3, r * 0.25).fill(PALETTE.tiger).stroke({ width: o, color: OL });
    for (let k = -1; k <= 1; k++) g.circle(px + k * r * 0.13 + (sx > 0 ? r * 0.08 : 0), py + sy * r * 0.2, r * 0.05).fill(OL);
  }
  // cuerpo
  g.ellipse(0, 0, bw, bh).fill(PALETTE.tiger).stroke({ width: o, color: OL });
  for (const t of [-0.62, -0.3, 0.02, 0.32]) g.moveTo(bw * t, -bh * 0.92).quadraticCurveTo(bw * t + r * 0.22, 0, bw * t, bh * 0.92).stroke({ width: r * 0.17, color: PALETTE.tigerStripe, cap: 'round' });
  g.moveTo(-bw * 0.92, -bh * 0.12).lineTo(-bw * 0.4, 0).lineTo(-bw * 0.92, bh * 0.12).stroke({ width: r * 0.12, color: PALETTE.tigerStripe, cap: 'round', join: 'round' });
  // cabeza grande
  const hx = bw * 0.85;
  const hr = r * 0.92;
  for (const s of [-1, 1]) {
    g.circle(hx - hr * 0.3, s * hr * 0.88, hr * 0.33).fill(PALETTE.tiger).stroke({ width: o, color: OL });
    g.circle(hx - hr * 0.3, s * hr * 0.88, hr * 0.16).fill(PALETTE.tigerStripe);
  }
  g.circle(hx, 0, hr).fill(PALETTE.tiger).stroke({ width: o, color: OL });
  // rayas de la frente y mejillas
  g.moveTo(hx - hr * 0.75, 0).lineTo(hx - hr * 0.35, 0).stroke({ width: r * 0.1, color: PALETTE.tigerStripe, cap: 'round' });
  for (const s of [-1, 1]) {
    g.moveTo(hx - hr * 0.62, s * hr * 0.45).lineTo(hx - hr * 0.28, s * hr * 0.22).stroke({ width: r * 0.1, color: PALETTE.tigerStripe, cap: 'round' });
    g.moveTo(hx + hr * 0.15, s * hr * 0.95).lineTo(hx + hr * 0.4, s * hr * 0.72).stroke({ width: r * 0.09, color: PALETTE.tigerStripe, cap: 'round' });
  }
  // hocico claro y boca abierta rugiendo
  g.ellipse(hx + hr * 0.5, 0, hr * 0.46, hr * 0.56).fill(PALETTE.tigerLight);
  g.moveTo(hx + hr * 0.42, -hr * 0.3).quadraticCurveTo(hx + hr * 1.0, 0, hx + hr * 0.42, hr * 0.3).quadraticCurveTo(hx + hr * 0.6, 0, hx + hr * 0.42, -hr * 0.3).closePath().fill(0x7a1f1f).stroke({ width: Math.max(1.5, o * 0.6), color: OL, join: 'round' });
  for (const s of [-1, 1]) g.poly([hx + hr * 0.5, s * hr * 0.24, hx + hr * 0.78, s * hr * 0.1, hx + hr * 0.6, s * hr * 0.02], true).fill(0xffffff).stroke({ width: 1, color: OL });
  g.ellipse(hx + hr * 0.5, 0, hr * 0.14, hr * 0.1).fill(OL);
  // ojos entornados con cejas en V
  for (const s of [-1, 1]) {
    g.ellipse(hx + hr * 0.12, s * hr * 0.45, hr * 0.17, hr * 0.12).fill(0xfff2cc).stroke({ width: Math.max(1.5, o * 0.5), color: OL });
    g.circle(hx + hr * 0.16, s * hr * 0.43, hr * 0.07).fill(OL);
    g.moveTo(hx - hr * 0.15, s * hr * 0.18).lineTo(hx + hr * 0.35, s * hr * 0.62).stroke({ width: r * 0.12, color: OL, cap: 'round' });
  }
  c.addChild(g);
  return c;
}

export function makeSheepVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  for (const [sx, sy] of [[0.4, -1], [0.4, 1], [-0.45, -1], [-0.45, 1]] as const) g.circle(r * sx, sy * r * 0.95, r * 0.18).fill(PALETTE.sheepFace).stroke({ width: o, color: OL });
  const puffs: [number, number, number][] = [[0, 0, 0.72]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    puffs.push([Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.42]);
  }
  for (const [x, y, rr] of puffs) g.circle(x * r, y * r, rr * r + o).fill(OL);
  for (const [x, y, rr] of puffs) g.circle(x * r, y * r, rr * r).fill(PALETTE.sheepWool);
  const hx = r * 0.95;
  const hr = r * 0.5;
  for (const s of [-1, 1]) g.ellipse(hx - hr * 0.2, s * hr * 1.0, hr * 0.4, hr * 0.24).fill(PALETTE.sheepFace).stroke({ width: o, color: OL });
  g.ellipse(hx, 0, hr, hr * 0.9).fill(PALETTE.sheepFace).stroke({ width: o, color: OL });
  g.circle(hx - hr * 0.55, 0, hr * 0.45).fill(PALETTE.sheepWool).stroke({ width: o * 0.8, color: OL });
  for (const s of [-1, 1]) {
    g.circle(hx + hr * 0.3, s * hr * 0.4, hr * 0.15).fill(PALETTE.sheepEye);
    g.moveTo(hx + hr * 0.05, s * hr * 0.2).lineTo(hx + hr * 0.5, s * hr * 0.55).stroke({ width: Math.max(2, o * 0.6), color: OL, cap: 'round' });
  }
  g.ellipse(hx + hr * 0.75, 0, hr * 0.14, hr * 0.1).fill(OL);
  c.addChild(g);
  return c;
}

export function makeGoblinVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  for (const s of [-1, 1]) {
    g.moveTo(-r * 0.2, s * r * 0.5).lineTo(r * 0.45, s * r * 1.0).stroke({ width: r * 0.3 + o * 2, color: OL, cap: 'round' });
    g.moveTo(-r * 0.2, s * r * 0.5).lineTo(r * 0.45, s * r * 1.0).stroke({ width: r * 0.3, color: PALETTE.goblin, cap: 'round' });
    g.circle(-r * 0.75, s * r * 0.55, r * 0.22).fill(PALETTE.goblinDark).stroke({ width: o, color: OL });
  }
  for (const s of [-1, 1]) g.poly([-r * 0.3, s * r * 0.5, -r * 1.3, s * r * 1.1, -r * 0.1, s * r * 0.9], true).fill(PALETTE.goblin).stroke({ width: o, color: OL, join: 'round' });
  g.circle(0, 0, r).fill(PALETTE.goblin).stroke({ width: o, color: OL });
  for (const s of [-1, 1]) {
    g.circle(r * 0.45, s * r * 0.35, r * 0.18).fill(OL);
    g.circle(r * 0.5, s * r * 0.32, r * 0.07).fill(0xffffff);
  }
  g.moveTo(r * 0.6, -r * 0.35).quadraticCurveTo(r * 0.95, 0, r * 0.6, r * 0.35).stroke({ width: Math.max(2, o * 0.6), color: OL, cap: 'round' });
  g.poly([r * 0.72, -r * 0.12, r * 0.84, 0, r * 0.72, r * 0.12], true).fill(0xffffff);
  c.addChild(g);
  return c;
}

/** Lobo: cuerpo gris alargado, lomo oscuro, orejas puntiagudas, hocico claro, ojos amarillos y cola peluda. */
export function makeWolfVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  const bw = r * 1.5;
  const bh = r * 0.9;
  // cola
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.35, r * 0.2, -bw * 1.45, -r * 0.5).stroke({ width: r * 0.3 + o * 2, color: OL, cap: 'round' });
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.35, r * 0.2, -bw * 1.45, -r * 0.5).stroke({ width: r * 0.3, color: PALETTE.wolf, cap: 'round' });
  g.circle(-bw * 1.45, -r * 0.5, r * 0.17).fill(PALETTE.wolfDark);
  // patas
  for (const [sx, sy] of [[0.5, -1], [0.5, 1], [-0.5, -1], [-0.5, 1]] as const) g.ellipse(bw * sx, sy * bh * 0.95, r * 0.26, r * 0.22).fill(PALETTE.wolf).stroke({ width: o, color: OL });
  // cuerpo y lomo
  g.ellipse(0, 0, bw, bh).fill(PALETTE.wolf).stroke({ width: o, color: OL });
  g.ellipse(-bw * 0.1, 0, bw * 0.7, bh * 0.4).fill(PALETTE.wolfDark);
  // cabeza con orejas puntiagudas
  const hx = bw * 0.8;
  const hr = r * 0.8;
  for (const s of [-1, 1]) g.poly([hx - hr * 0.6, s * hr * 0.55, hx - hr * 0.9, s * hr * 1.35, hx - hr * 0.05, s * hr * 0.95], true).fill(PALETTE.wolf).stroke({ width: o, color: OL, join: 'round' });
  for (const s of [-1, 1]) g.poly([hx - hr * 0.55, s * hr * 0.65, hx - hr * 0.72, s * hr * 1.1, hx - hr * 0.25, s * hr * 0.85], true).fill(PALETTE.wolfDark);
  g.circle(hx, 0, hr).fill(PALETTE.wolf).stroke({ width: o, color: OL });
  g.moveTo(hx - hr * 0.6, 0).lineTo(hx + hr * 0.2, 0).stroke({ width: r * 0.14, color: PALETTE.wolfDark, cap: 'round' });
  // hocico claro, nariz y colmillos
  g.ellipse(hx + hr * 0.55, 0, hr * 0.42, hr * 0.5).fill(PALETTE.tigerLight).stroke({ width: Math.max(1.5, o * 0.6), color: OL });
  g.ellipse(hx + hr * 0.85, 0, hr * 0.16, hr * 0.12).fill(OL);
  for (const s of [-1, 1]) g.poly([hx + hr * 0.45, s * hr * 0.3, hx + hr * 0.62, s * hr * 0.16, hx + hr * 0.55, s * hr * 0.05], true).fill(0xffffff).stroke({ width: 1, color: OL });
  // ojos amarillos con ceja fruncida
  for (const s of [-1, 1]) {
    g.ellipse(hx + hr * 0.1, s * hr * 0.45, hr * 0.17, hr * 0.12).fill(0xffd34d).stroke({ width: Math.max(1.5, o * 0.5), color: OL });
    g.circle(hx + hr * 0.14, s * hr * 0.43, hr * 0.06).fill(OL);
    g.moveTo(hx - hr * 0.15, s * hr * 0.2).lineTo(hx + hr * 0.32, s * hr * 0.6).stroke({ width: r * 0.1, color: OL, cap: 'round' });
  }
  c.addChild(g);
  return c;
}

/** Oso polar: cuerpo blanco grande y redondo, cabeza pequeña con orejas redondas, hocico negro, garras. */
export function makePolarBearVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  const bw = r * 1.45;
  const bh = r * 1.05;
  for (const [sx, sy] of [[0.5, -1], [0.5, 1], [-0.55, -1], [-0.55, 1]] as const) {
    const px = bw * sx;
    const py = sy * bh * 0.95;
    g.ellipse(px, py, r * 0.34, r * 0.28).fill(PALETTE.polar).stroke({ width: o, color: OL });
    for (let k = -1; k <= 1; k++) g.circle(px + k * r * 0.14 + (sx > 0 ? r * 0.1 : 0), py + sy * r * 0.22, r * 0.05).fill(OL);
  }
  g.ellipse(0, 0, bw, bh).fill(PALETTE.polar).stroke({ width: o, color: OL });
  g.ellipse(-bw * 0.15, 0, bw * 0.55, bh * 0.45).fill(PALETTE.polarShade, 0.7);
  g.circle(-bw * 0.95, 0, r * 0.18).fill(PALETTE.polar).stroke({ width: o, color: OL }); // cola corta
  const hx = bw * 0.82;
  const hr = r * 0.62;
  for (const s of [-1, 1]) {
    g.circle(hx - hr * 0.35, s * hr * 0.9, hr * 0.3).fill(PALETTE.polar).stroke({ width: o, color: OL });
    g.circle(hx - hr * 0.35, s * hr * 0.9, hr * 0.14).fill(PALETTE.polarShade);
  }
  g.circle(hx, 0, hr).fill(PALETTE.polar).stroke({ width: o, color: OL });
  g.ellipse(hx + hr * 0.55, 0, hr * 0.42, hr * 0.5).fill(PALETTE.polarShade);
  g.ellipse(hx + hr * 0.85, 0, hr * 0.2, hr * 0.15).fill(OL);
  for (const s of [-1, 1]) {
    g.circle(hx + hr * 0.1, s * hr * 0.45, hr * 0.11).fill(OL);
    g.moveTo(hx - hr * 0.15, s * hr * 0.25).lineTo(hx + hr * 0.32, s * hr * 0.6).stroke({ width: r * 0.09, color: OL, cap: 'round' });
  }
  c.addChild(g);
  return c;
}

/** Pingüino: cuerpo negro ovalado con barriga blanca, aletas, pico y patas naranjas. */
export function makePenguinVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  const bw = r * 1.2;
  const bh = r * 0.95;
  for (const s of [-1, 1]) g.ellipse(bw * 0.55, s * bh * 0.55, r * 0.3, r * 0.16).fill(PALETTE.penguinBeak).stroke({ width: Math.max(1.5, o * 0.6), color: OL }); // patas
  for (const s of [-1, 1]) g.ellipse(-bw * 0.1, s * bh * 1.0, r * 0.55, r * 0.2).fill(PALETTE.penguin).stroke({ width: o, color: OL }); // aletas
  g.ellipse(0, 0, bw, bh).fill(PALETTE.penguin).stroke({ width: o, color: OL });
  g.ellipse(bw * 0.15, 0, bw * 0.6, bh * 0.62).fill(PALETTE.penguinBelly);
  for (const s of [-1, 1]) {
    g.circle(bw * 0.6, s * bh * 0.3, r * 0.14).fill(0xffffff).stroke({ width: 1, color: OL });
    g.circle(bw * 0.64, s * bh * 0.3, r * 0.07).fill(OL);
  }
  g.poly([bw * 0.8, -r * 0.18, bw * 1.25, 0, bw * 0.8, r * 0.18], true).fill(PALETTE.penguinBeak).stroke({ width: Math.max(1.5, o * 0.6), color: OL, join: 'round' });
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
    case 'wolf':
      return makeWolfVector(r);
    case 'polar_bear':
      return makePolarBearVector(r);
    case 'penguin':
      return makePenguinVector(r);
  }
}
