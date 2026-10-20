import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ITEM_META, type ItemId, type PlayerState } from '@draycol/core';
import { PALETTE } from '../palette';
import { makeToolSprite } from './entities';

const OL = 0x1e1510;
const SKIN = 0xf3c9a4;
const SKIN_SHADE = 0xdba57e;
const SHIRT = 0x8c6a4a;
const SHIRT_SHADE = 0x6f5238;
const PACK = 0x5a5a3c;
const PACK_SHADE = 0x44442c;
const OUT_W = 3.5;

/**
 * Jugador en estilo cartoon (contorno grueso, sombreado plano) siguiendo la hoja de referencia:
 * mochila a la espalda, camisa marrón, cabeza redonda grande, dos manos; la herramienta equipada va en la mano frontal.
 * El cuerpo mira hacia +x.
 */
export class PlayerView extends Container {
  readonly body = new Container();
  private readonly handBack = new Graphics();
  private readonly handFront = new Graphics();
  private readonly toolHolder = new Container();
  private tool: Sprite | null = null;
  private readonly nameText: Text;
  private toolItem: ItemId | null | undefined = undefined;
  private readonly r: number;

  constructor(r: number, name: string) {
    super();
    this.r = r;

    // Mochila (detrás, lado -x)
    const pack = new Graphics();
    pack.roundRect(-r * 1.45, -r * 0.7, r * 1.0, r * 1.4, r * 0.3).fill(PACK).stroke({ width: OUT_W, color: OL });
    pack.roundRect(-r * 1.45, -r * 0.7, r * 1.0, r * 0.55, r * 0.3).fill({ color: PACK_SHADE, alpha: 0.55 });
    pack.roundRect(-r * 1.3, -r * 0.25, r * 0.6, r * 0.5, r * 0.14).fill(PACK_SHADE).stroke({ width: 2.5, color: OL });

    // Torso (camisa) con hombros
    const torso = new Graphics();
    torso.ellipse(-r * 0.2, 0, r * 1.0, r * 1.05).fill(SHIRT).stroke({ width: OUT_W, color: OL });
    torso.ellipse(-r * 0.4, r * 0.15, r * 0.6, r * 0.7).fill({ color: SHIRT_SHADE, alpha: 0.5 });

    // Brazos
    const arms = new Graphics();
    for (const sy of [-1, 1]) {
      arms.moveTo(-r * 0.1, sy * r * 0.55).lineTo(r * 0.75, sy * r * 0.95).stroke({ width: r * 0.42, color: SKIN, cap: 'round' });
      arms.moveTo(-r * 0.1, sy * r * 0.55).lineTo(r * 0.75, sy * r * 0.95).stroke({ width: r * 0.42 + OUT_W * 2, color: OL, cap: 'round', alpha: 1 });
    }
    const armsFill = new Graphics();
    for (const sy of [-1, 1]) armsFill.moveTo(-r * 0.1, sy * r * 0.55).lineTo(r * 0.75, sy * r * 0.95).stroke({ width: r * 0.42, color: SKIN, cap: 'round' });

    // Cabeza grande con sombreado y dos ojos
    const head = new Graphics();
    head.circle(r * 0.18, 0, r * 0.7).fill(SKIN).stroke({ width: OUT_W, color: OL });
    head.ellipse(0, r * 0.16, r * 0.48, r * 0.42).fill({ color: SKIN_SHADE, alpha: 0.4 });
    head.circle(r * 0.62, -r * 0.22, r * 0.08).fill(OL);
    head.circle(r * 0.62, r * 0.22, r * 0.08).fill(OL);

    const hr = r * 0.34;
    for (const h of [this.handBack, this.handFront]) {
      h.circle(0, 0, hr).fill(SKIN).stroke({ width: OUT_W, color: OL });
      h.circle(-hr * 0.2, hr * 0.2, hr * 0.55).fill({ color: SKIN_SHADE, alpha: 0.35 });
    }
    this.handBack.position.set(r * 0.8, r * 0.95);
    this.handFront.position.set(r * 0.8, -r * 0.95);
    this.toolHolder.position.copyFrom(this.handFront.position);

    this.body.addChild(pack, torso, arms, armsFill, this.handBack, this.toolHolder, head, this.handFront);
    this.addChild(this.body);

    this.nameText = new Text({
      text: name,
      style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xffffff, stroke: { color: PALETTE.hudPanel, width: 4 }, align: 'center' },
    });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(0, r + 10);
    this.nameText.resolution = 2;
    this.addChild(this.nameText);
  }

  update(p: PlayerState, x: number, y: number): void {
    this.position.set(x, y);
    this.body.rotation = p.angle;
    const r = this.r;
    const push = Math.sin(Math.min(1, p.swing) * Math.PI) * r * 0.9;
    this.handFront.position.set(r * 0.8 + push, -r * 0.95);
    this.toolHolder.position.set(r * 0.8 + push, -r * 0.95);

    const slot = p.inventory[p.selectedSlot];
    const item = slot?.item ?? null;
    const meta = item ? ITEM_META[item] : null;
    const shown = meta && (meta.tool || meta.weapon) ? item : null;
    if (shown !== this.toolItem) {
      this.toolItem = shown;
      this.tool?.destroy();
      this.tool = null;
      if (shown) {
        this.tool = makeToolSprite(shown, r * 2.6);
        // apunta hacia delante (+x) con una ligera inclinación hacia fuera
        this.tool.rotation += Math.PI / 2 + 0.15;
        this.toolHolder.addChild(this.tool);
      }
    }
  }
}
