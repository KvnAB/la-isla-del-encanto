import { Container, Text } from 'pixi.js';
import { PALETTE } from './palette';

/** Duración de un número flotante. */
export const FLOAT_SECONDS = 0.7;
const RISE_PX = 28;

interface Floating {
  text: Text;
  t: number;
  y0: number;
}

/** Números de daño que suben y se desvanecen sobre quien recibe el golpe (capa `fx` del mundo). */
export class FloatingNumbers extends Container {
  private readonly items: Floating[] = [];

  spawn(x: number, y: number, label: string, color: number): void {
    const text = new Text({
      text: label,
      style: { fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: '800', fill: color, stroke: { color: PALETTE.hudPanel, width: 4 }, align: 'center' },
    });
    text.anchor.set(0.5, 1);
    text.position.set(x, y);
    text.resolution = 2;
    text.zIndex = 1e9;
    this.addChild(text);
    this.items.push({ text, t: 0, y0: y });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.t += dt;
      const k = Math.min(1, f.t / FLOAT_SECONDS);
      f.text.y = f.y0 - RISE_PX * (1 - (1 - k) * (1 - k)); // sube con ease-out
      f.text.alpha = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6; // visible del todo el 40 % y luego se funde
      if (f.t >= FLOAT_SECONDS) {
        f.text.destroy();
        this.items.splice(i, 1);
      }
    }
  }
}
