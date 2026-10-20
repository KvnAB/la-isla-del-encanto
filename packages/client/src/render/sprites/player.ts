import { Container, Graphics, Text } from 'pixi.js';
import { ITEM_META, type ItemId, type PlayerState } from '@draycol/core';
import { OUTLINE_WIDTH, PALETTE } from '../palette';
import { drawPickaxe, drawSword } from './items';

/** Vista del jugador: cuerpo rotado + nombre fijo. */
export class PlayerView extends Container {
  readonly body = new Container();
  private readonly handBack = new Graphics();
  private readonly handFront = new Graphics();
  private readonly tool = new Graphics();
  private readonly nameText: Text;
  private toolItem: ItemId | null | undefined = undefined;

  constructor(r: number, name: string) {
    super();
    const torso = new Graphics();
    torso.circle(0, 0, r).fill(PALETTE.skin).stroke({ width: OUTLINE_WIDTH + 1, color: PALETTE.skinOutline });
    // pelo: medio arco en la parte trasera
    torso.arc(0, 0, r * 0.82, Math.PI * 0.55, Math.PI * 1.45).fill(PALETTE.hair);
    torso.arc(0, 0, r * 0.82, Math.PI * 0.55, Math.PI * 1.45).stroke({ width: 2.5, color: PALETTE.skinOutline, alpha: 0.6 });

    const hr = r * 0.4;
    for (const h of [this.handBack, this.handFront]) h.circle(0, 0, hr).fill(PALETTE.skin).stroke({ width: OUTLINE_WIDTH, color: PALETTE.skinOutline });
    this.handBack.position.set(r * 0.8, r * 0.9);
    this.handFront.position.set(r * 0.8, -r * 0.9);

    this.body.addChild(this.tool, this.handBack, torso, this.handFront);
    this.addChild(this.body);

    this.nameText = new Text({
      text: name,
      style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xffffff, stroke: { color: PALETTE.hudPanel, width: 4 }, align: 'center' },
    });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(0, r + 8);
    this.nameText.resolution = 2;
    this.addChild(this.nameText);
  }

  update(p: PlayerState, x: number, y: number): void {
    this.position.set(x, y);
    this.body.rotation = p.angle;
    const r = p.radius;
    // embestida de la mano frontal al golpear
    const push = Math.sin(Math.min(1, p.swing) * Math.PI) * r * 0.9;
    this.handFront.position.set(r * 0.8 + push, -r * 0.9);
    this.tool.position.set(r * 0.8 + push, -r * 0.9);

    const slot = p.inventory[p.selectedSlot];
    const item = slot?.item ?? null;
    const meta = item ? ITEM_META[item] : null;
    const shown = meta && (meta.tool || meta.weapon) ? item : null;
    if (shown !== this.toolItem) {
      this.toolItem = shown;
      this.tool.clear();
      if (shown === 'wood_pickaxe' || shown === 'stone_pickaxe') drawPickaxe(this.tool, shown === 'stone_pickaxe', 0.62);
      else if (shown === 'wood_sword' || shown === 'stone_sword') drawSword(this.tool, shown === 'stone_sword', 0.62);
      // la herramienta apunta hacia delante (+x) ligeramente inclinada
      this.tool.rotation = Math.PI / 2 - 0.35;
    }
  }
}
