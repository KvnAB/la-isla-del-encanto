import { Container, Graphics } from 'pixi.js';
import type { CreatureKind } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';

/** Criaturas en estilo plano, vistas desde arriba, mirando hacia +x. */

const OL = PALETTE.outline;
const ow = (r: number) => Math.max(OUTLINE_WIDTH, r * 0.09);

export function makeTigerVector(r: number): Container {
  const c = new Container();
  const g = new Graphics();
  const o = ow(r);
  const bw = r * 1.45;
  const bh = r * 1.0;
  // cola
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.4, -r * 0.2, -bw * 1.25, -r * 0.9).stroke({ width: r * 0.22 + o * 2, color: OL, cap: 'round' });
  g.moveTo(-bw * 0.9, 0).quadraticCurveTo(-bw * 1.4, -r * 0.2, -bw * 1.25, -r * 0.9).stroke({ width: r * 0.22, color: PALETTE.tiger, cap: 'round' });
  g.circle(-bw * 1.25, -r * 0.9, r * 0.14).fill(PALETTE.tigerStripe);
  // patas
  for (const [sx, sy] of [[0.5, -1], [0.5, 1], [-0.55, -1], [-0.55, 1]] as const) g.circle(bw * sx, sy * bh * 0.95, r * 0.26).fill(PALETTE.tiger).stroke({ width: o, color: OL });
  // cuerpo
  g.ellipse(0, 0, bw, bh).fill(PALETTE.tiger).stroke({ width: o, color: OL });
  for (const t of [-0.55, -0.2, 0.15]) g.moveTo(bw * t, -bh * 0.9).quadraticCurveTo(bw * t + r * 0.2, 0, bw * t, bh * 0.9).stroke({ width: r * 0.16, color: PALETTE.tigerStripe, cap: 'round' });
  // cabeza
  const hx = bw * 0.8;
  const hr = r * 0.8;
  for (const s of [-1, 1]) {
    g.circle(hx - hr * 0.35, s * hr * 0.85, hr * 0.32).fill(PALETTE.tiger).stroke({ width: o, color: OL });
    g.circle(hx - hr * 0.35, s * hr * 0.85, hr * 0.15).fill(PALETTE.tigerLight);
  }
  g.circle(hx, 0, hr).fill(PALETTE.tiger).stroke({ width: o, color: OL });
  g.moveTo(hx - hr * 0.55, -hr * 0.35).lineTo(hx - hr * 0.2, -hr * 0.15).stroke({ width: r * 0.1, color: PALETTE.tigerStripe, cap: 'round' });
  g.moveTo(hx - hr * 0.55, hr * 0.35).lineTo(hx - hr * 0.2, hr * 0.15).stroke({ width: r * 0.1, color: PALETTE.tigerStripe, cap: 'round' });
  // hocico claro, nariz, ojos
  g.ellipse(hx + hr * 0.45, 0, hr * 0.42, hr * 0.5).fill(PALETTE.tigerLight);
  g.ellipse(hx + hr * 0.7, 0, hr * 0.16, hr * 0.11).fill(OL);
  for (const s of [-1, 1]) {
    g.circle(hx + hr * 0.2, s * hr * 0.4, hr * 0.13).fill(OL);
    g.circle(hx + hr * 0.24, s * hr * 0.36, hr * 0.05).fill(0xffffff);
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
  // cabeza oscura al frente con flequillo de lana
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
  // brazos y pies
  for (const s of [-1, 1]) {
    g.moveTo(-r * 0.2, s * r * 0.5).lineTo(r * 0.45, s * r * 1.0).stroke({ width: r * 0.3 + o * 2, color: OL, cap: 'round' });
    g.moveTo(-r * 0.2, s * r * 0.5).lineTo(r * 0.45, s * r * 1.0).stroke({ width: r * 0.3, color: PALETTE.goblin, cap: 'round' });
    g.circle(-r * 0.75, s * r * 0.55, r * 0.22).fill(PALETTE.goblinDark).stroke({ width: o, color: OL });
  }
  // orejas
  for (const s of [-1, 1]) g.poly([-r * 0.3, s * r * 0.5, -r * 1.3, s * r * 1.1, -r * 0.1, s * r * 0.9], true).fill(PALETTE.goblin).stroke({ width: o, color: OL, join: 'round' });
  // cabeza
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
