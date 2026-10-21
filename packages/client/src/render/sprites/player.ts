import { Container, Graphics, Text } from 'pixi.js';
import { coatWorn, ITEM_META, type ItemId, type PlayerState } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';
import { drawPickaxe, drawSword } from './vector-items';
import { swingPose } from './swing';

/**
 * Jugador en estilo plano (referencia estilo-plano): círculo de piel con contorno y dos manos.
 * Capas (de atrás hacia delante): abrigo → cuerpo → mano trasera → herramienta → gorro → mano delantera.
 * El abrigo es un anillo de piel de tigre con cuello de lana; el gorro es una ranura vacía por ahora.
 * El cuerpo mira hacia +x.
 */

const OL = PALETTE.skinOutline;
const OUT_W = OUTLINE_WIDTH + 1;
/** Manos en reposo: delantera arriba-delante, trasera abajo-delante (el cuerpo mira a +x). */
const HAND_X = 0.78;
const HAND_Y = 0.95;
const HAND_ANGLE = Math.atan2(-HAND_Y, HAND_X);
const HAND_DIST = Math.hypot(HAND_X, HAND_Y);
const TOOL_ROT = Math.PI / 2 - 0.25;

export type HatStyle = 'none';

export class PlayerView extends Container {
  readonly body = new Container();
  private readonly layers = {
    coat: new Graphics(),
    torso: new Graphics(),
    handBack: new Graphics(),
    tool: new Container(),
    hat: new Graphics(),
    handFront: new Graphics(),
  };
  private toolGfx: Graphics | null = null;
  private readonly nameText: Text;
  private toolItem: ItemId | null | undefined = undefined;
  private coatOn: boolean | undefined = undefined;
  private readonly r: number;
  hat: HatStyle = 'none';

  constructor(r: number, name: string) {
    super();
    this.r = r;
    const L = this.layers;
    L.torso.circle(0, 0, r).fill(PALETTE.skin).stroke({ width: OUT_W, color: OL });
    for (const h of [L.handBack, L.handFront]) h.circle(0, 0, r * 0.36).fill(PALETTE.skin).stroke({ width: OUT_W, color: OL });
    L.handBack.position.set(r * HAND_X, r * HAND_Y);
    L.handFront.position.set(r * HAND_X, -r * HAND_Y);
    L.tool.position.copyFrom(L.handFront.position);
    this.drawCoat(L.coat);
    L.coat.visible = false;

    this.body.addChild(L.coat, L.torso, L.handBack, L.tool, L.hat, L.handFront);
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

  /** Abrigo: anillo naranja con rayas alrededor del cuerpo y cuello de lana blanco por dentro. */
  private drawCoat(g: Graphics): void {
    const r = this.r;
    const R = r * 1.45;
    g.circle(0, 0, R).fill(PALETTE.tiger).stroke({ width: OUT_W, color: OL });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      g.moveTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08).lineTo(Math.cos(a + 0.12) * R * 0.97, Math.sin(a + 0.12) * R * 0.97).stroke({ width: r * 0.16, color: PALETTE.tigerStripe, cap: 'round' });
    }
    // cuello de lana: bultos blancos pegados al cuerpo
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.circle(Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07, r * 0.22).fill(PALETTE.sheepWool).stroke({ width: OUT_W * 0.7, color: OL });
    }
  }

  update(p: PlayerState, x: number, y: number): void {
    this.position.set(x, y);
    this.body.rotation = p.angle;
    const r = this.r;
    const L = this.layers;

    // Golpe: la mano delantera (con la herramienta) barre en arco por delante del cuerpo y se estira,
    // la herramienta gira con ella, la mano trasera retrocede y el cuerpo se adelanta un poco.
    const pose = swingPose(p.swing);
    const a = HAND_ANGLE + pose.handAngle;
    const d = r * (HAND_DIST + pose.handReach);
    L.handFront.position.set(Math.cos(a) * d, Math.sin(a) * d);
    L.tool.position.copyFrom(L.handFront.position);
    L.tool.rotation = pose.toolRot;
    L.handBack.position.set(r * (HAND_X - pose.backHandPull), r * HAND_Y);
    this.body.position.set(Math.cos(p.angle) * pose.lunge * r, Math.sin(p.angle) * pose.lunge * r);

    const coatOn = coatWorn(p);
    if (coatOn !== this.coatOn) {
      this.coatOn = coatOn;
      L.coat.visible = coatOn;
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
        const s = r * 1.2;
        const material = shown.startsWith('gold') ? 'gold' : shown.startsWith('stone') ? 'stone' : 'wood';
        if (meta?.tool) drawPickaxe(g, s, material);
        else drawSword(g, s, material);
        g.pivot.set(0, s * 0.55);
        g.rotation = TOOL_ROT;
        this.toolGfx = g;
        L.tool.addChild(g);
      }
    }
  }
}
