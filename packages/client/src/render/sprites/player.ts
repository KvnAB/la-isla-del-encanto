import { Container, Graphics, Text } from 'pixi.js';
import { findSlot, ITEM_META, type ItemId, type PlayerState } from '@draycol/core';
import { PALETTE } from '../palette';
import { drawPickaxe, drawSword } from './vector-items';

/**
 * Personaje por capas (de atrás hacia delante): mochila → abrigo (espalda) → cuerpo → brazos →
 * mano trasera → herramienta → cabeza → pelo → gorro → mano delantera.
 * Cada capa es una pieza independiente para poder personalizarla (gorro, pelo, ropa) sin tocar el resto.
 * El cuerpo mira hacia +x.
 */

const OL = 0x1e1510;
const SKIN = { base: 0xf3c9a4, shade: 0xd9a57c, light: 0xffe3cb };
const SHIRT = { base: 0x8c6a4a, shade: 0x6b4f36, light: 0xa88361 };
const PACK = { base: 0x5e6140, shade: 0x43462c, strap: 0x3a2d1c };
const HAIR = { base: 0x4a2e18, light: 0x6b4426 };
const COAT = { base: 0xf08a2a, shade: 0xc96a1a, stripe: 0x2b1708, wool: 0xf5f1e8, woolShade: 0xd6cfc2 };

export type HatStyle = 'none';
export type HairStyle = 'short' | 'bald';

export interface PlayerLook {
  hair: HairStyle;
  hat: HatStyle;
}

const OUT_W = 3.5;

export class PlayerView extends Container {
  readonly body = new Container();
  private readonly layers = {
    pack: new Graphics(),
    coatBack: new Graphics(),
    torso: new Graphics(),
    arms: new Graphics(),
    coatArms: new Graphics(),
    handBack: new Graphics(),
    tool: new Container(),
    head: new Graphics(),
    hair: new Graphics(),
    coatCollar: new Graphics(),
    hat: new Graphics(),
    handFront: new Graphics(),
  };
  private toolGfx: Graphics | null = null;
  private readonly nameText: Text;
  private toolItem: ItemId | null | undefined = undefined;
  private coatOn: boolean | undefined = undefined;
  private readonly r: number;
  look: PlayerLook = { hair: 'short', hat: 'none' };

  constructor(r: number, name: string) {
    super();
    this.r = r;
    const L = this.layers;
    this.drawPack(L.pack);
    this.drawTorso(L.torso);
    this.drawArms(L.arms, 0);
    this.drawHand(L.handBack);
    this.drawHand(L.handFront);
    this.drawHead(L.head);
    this.drawHair(L.hair);
    this.drawCoat(L.coatBack, L.coatArms, L.coatCollar);
    L.coatBack.visible = L.coatArms.visible = L.coatCollar.visible = false;

    L.handBack.position.set(r * 0.85, r * 1.0);
    L.handFront.position.set(r * 0.85, -r * 1.0);
    L.tool.position.copyFrom(L.handFront.position);

    this.body.addChild(L.pack, L.torso, L.coatBack, L.arms, L.coatArms, L.handBack, L.tool, L.head, L.hair, L.coatCollar, L.hat, L.handFront);
    this.addChild(this.body);

    this.nameText = new Text({
      text: name,
      style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xffffff, stroke: { color: PALETTE.hudPanel, width: 4 }, align: 'center' },
    });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(0, r + 12);
    this.nameText.resolution = 2;
    this.addChild(this.nameText);
  }

  private drawPack(g: Graphics): void {
    const r = this.r;
    g.roundRect(-r * 1.5, -r * 0.72, r * 1.0, r * 1.44, r * 0.3).fill(PACK.base).stroke({ width: OUT_W, color: OL });
    g.roundRect(-r * 1.5, -r * 0.72, r * 1.0, r * 0.5, r * 0.3).fill({ color: PACK.shade, alpha: 0.5 });
    g.roundRect(-r * 1.36, -r * 0.26, r * 0.62, r * 0.52, r * 0.14).fill(PACK.shade).stroke({ width: 2.5, color: OL });
    g.roundRect(-r * 1.2, -r * 0.1, r * 0.3, r * 0.2, r * 0.05).fill(PACK.strap);
    // correas que cruzan los hombros
    for (const s of [-1, 1]) g.moveTo(-r * 0.6, s * r * 0.55).lineTo(r * 0.3, s * r * 0.5).stroke({ width: r * 0.16, color: PACK.strap, cap: 'round' });
  }

  private drawTorso(g: Graphics): void {
    const r = this.r;
    g.ellipse(-r * 0.2, 0, r * 1.02, r * 1.08).fill(SHIRT.base).stroke({ width: OUT_W, color: OL });
    g.ellipse(-r * 0.45, r * 0.2, r * 0.6, r * 0.75).fill({ color: SHIRT.shade, alpha: 0.5 });
    g.ellipse(-r * 0.1, -r * 0.45, r * 0.5, r * 0.35).fill({ color: SHIRT.light, alpha: 0.35 });
    // cinturón
    g.moveTo(-r * 0.95, -r * 0.3).quadraticCurveTo(-r * 0.6, 0, -r * 0.95, r * 0.3).stroke({ width: r * 0.14, color: PACK.strap, cap: 'round' });
  }

  /** Brazos con codo; `push` adelanta el brazo frontal al golpear. */
  private drawArms(g: Graphics, push: number): void {
    const r = this.r;
    g.clear();
    for (const s of [-1, 1]) {
      const p = s < 0 ? push : 0;
      const sx = -r * 0.2;
      const sy = s * r * 0.75;
      const ex = r * 0.35 + p * 0.5;
      const ey = s * r * 1.05;
      const hx = r * 0.85 + p;
      const hy = s * r * 1.0;
      g.moveTo(sx, sy).lineTo(ex, ey).lineTo(hx, hy).stroke({ width: r * 0.4 + OUT_W * 2, color: OL, cap: 'round', join: 'round' });
    }
    for (const s of [-1, 1]) {
      const p = s < 0 ? push : 0;
      const sx = -r * 0.2;
      const sy = s * r * 0.75;
      const ex = r * 0.35 + p * 0.5;
      const ey = s * r * 1.05;
      const hx = r * 0.85 + p;
      const hy = s * r * 1.0;
      g.moveTo(sx, sy).lineTo(ex, ey).lineTo(hx, hy).stroke({ width: r * 0.4, color: SKIN.base, cap: 'round', join: 'round' });
      // manga corta de la camisa en el hombro
      g.moveTo(sx, sy).lineTo(sx + r * 0.28, sy + s * r * 0.15).stroke({ width: r * 0.46, color: SHIRT.base, cap: 'round' });
      g.moveTo(sx, sy).lineTo(sx + r * 0.28, sy + s * r * 0.15).stroke({ width: r * 0.46 + OUT_W * 1.2, color: OL, cap: 'round', alpha: 0.0 });
    }
  }

  private drawHand(g: Graphics): void {
    const hr = this.r * 0.34;
    g.circle(0, 0, hr).fill(SKIN.base).stroke({ width: OUT_W, color: OL });
    g.circle(-hr * 0.2, hr * 0.2, hr * 0.5).fill({ color: SKIN.shade, alpha: 0.35 });
    g.circle(hr * 0.25, -hr * 0.3, hr * 0.22).fill({ color: SKIN.light, alpha: 0.6 });
  }

  private drawHead(g: Graphics): void {
    const r = this.r;
    const hr = r * 0.7;
    g.circle(r * 0.18, 0, hr).fill(SKIN.base).stroke({ width: OUT_W, color: OL });
    g.ellipse(r * 0.05, r * 0.2, hr * 0.7, hr * 0.5).fill({ color: SKIN.shade, alpha: 0.35 });
    g.circle(r * 0.05, -r * 0.25, hr * 0.25).fill({ color: SKIN.light, alpha: 0.5 });
    // ojos
    for (const s of [-1, 1]) g.ellipse(r * 0.64, s * r * 0.24, r * 0.07, r * 0.1).fill(OL);
  }

  private drawHair(g: Graphics): void {
    const r = this.r;
    g.clear();
    if (this.look.hair === 'bald') return;
    // mata de pelo corta en la parte trasera de la cabeza, con un par de mechones
    g.arc(r * 0.18, 0, r * 0.68, Math.PI * 0.62, Math.PI * 1.38).closePath().fill(HAIR.base).stroke({ width: OUT_W * 0.7, color: OL, alpha: 0.85 });
    g.arc(r * 0.18, 0, r * 0.5, Math.PI * 0.75, Math.PI * 1.25).closePath().fill({ color: HAIR.light, alpha: 0.45 });
    for (const s of [-1, 1]) g.moveTo(-r * 0.25, s * r * 0.5).quadraticCurveTo(-r * 0.05, s * r * 0.62, r * 0.1, s * r * 0.5).stroke({ width: r * 0.1, color: HAIR.base, cap: 'round' });
  }

  /** Abrigo nivel 1: piel de tigre con cuello y puños de lana. Tres piezas en capas distintas. */
  private drawCoat(back: Graphics, arms: Graphics, collar: Graphics): void {
    const r = this.r;
    back.ellipse(-r * 0.25, 0, r * 1.12, r * 1.18).fill(COAT.base).stroke({ width: OUT_W, color: OL });
    back.ellipse(-r * 0.5, r * 0.25, r * 0.65, r * 0.8).fill({ color: COAT.shade, alpha: 0.45 });
    for (const t of [-0.75, -0.4, -0.05, 0.3, 0.65]) back.moveTo(-r * 0.9, t * r).quadraticCurveTo(-r * 0.3, t * r + r * 0.12, r * 0.5, t * r).stroke({ width: r * 0.11, color: COAT.stripe, cap: 'round', alpha: 0.9 });
    // mangas largas sobre los brazos
    for (const s of [-1, 1]) {
      arms.moveTo(-r * 0.2, s * r * 0.75).lineTo(r * 0.35, s * r * 1.05).stroke({ width: r * 0.5 + OUT_W * 2, color: OL, cap: 'round' });
      arms.moveTo(-r * 0.2, s * r * 0.75).lineTo(r * 0.35, s * r * 1.05).stroke({ width: r * 0.5, color: COAT.base, cap: 'round' });
      arms.moveTo(r * 0.0, s * r * 0.86).lineTo(r * 0.12, s * r * 0.93).stroke({ width: r * 0.1, color: COAT.stripe, cap: 'round' });
      arms.circle(r * 0.4, s * r * 1.07, r * 0.22).fill(COAT.wool).stroke({ width: OUT_W * 0.8, color: OL });
    }
    // cuello de lana alrededor de la cabeza (por detrás)
    const puffs: [number, number][] = [[-0.62, -0.5], [-0.75, -0.08], [-0.62, 0.36], [-0.3, -0.7], [-0.3, 0.62], [0.1, -0.78], [0.1, 0.74]];
    for (const [x, y] of puffs) collar.circle(x * r, y * r, r * 0.21).fill(COAT.woolShade).stroke({ width: OUT_W * 0.7, color: OL });
    for (const [x, y] of puffs) collar.circle(x * r - r * 0.04, y * r - r * 0.05, r * 0.14).fill(COAT.wool);
  }

  update(p: PlayerState, x: number, y: number): void {
    this.position.set(x, y);
    this.body.rotation = p.angle;
    const r = this.r;
    const L = this.layers;
    const push = Math.sin(Math.min(1, p.swing) * Math.PI) * r * 0.9;
    L.handFront.position.set(r * 0.85 + push, -r * 1.0);
    L.tool.position.set(r * 0.85 + push, -r * 1.0);
    this.drawArms(L.arms, push);

    const coatOn = findSlot(p.inventory, 'coat1') !== -1;
    if (coatOn !== this.coatOn) {
      this.coatOn = coatOn;
      L.coatBack.visible = L.coatArms.visible = L.coatCollar.visible = coatOn;
    }

    const slot = p.inventory[p.selectedSlot];
    const item = slot?.item ?? null;
    const meta = item ? ITEM_META[item] : null;
    const shown = meta && (meta.tool || meta.weapon) ? item : null;
    if (shown !== this.toolItem) {
      this.toolItem = shown;
      this.toolGfx?.destroy();
      this.toolGfx = null;
      if (shown) {
        const g = new Graphics();
        const s = r * 1.25;
        if (shown === 'wood_pickaxe' || shown === 'stone_pickaxe') drawPickaxe(g, s, shown === 'stone_pickaxe');
        else drawSword(g, s, shown === 'stone_sword');
        g.pivot.set(0, s * 0.55);
        g.rotation = Math.PI / 2 - 0.25;
        this.toolGfx = g;
        L.tool.addChild(g);
      }
    }
  }
}
