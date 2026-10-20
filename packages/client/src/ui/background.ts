import { Application, Container } from 'pixi.js';
import { DEFAULT_CONFIG, generateIsland, Rng } from '@draycol/core';
import { PALETTE } from '../render/palette';
import { buildTerrain } from '../render/terrain';

/** Fondo de las pantallas de menú: una isla fija, desenfocada, desplazándose despacio. */
export class AnimatedBackground {
  private readonly app = new Application();
  private world: Container | null = null;
  private t = 0;
  private started = false;
  private destroyed = false;

  constructor(private readonly parent: HTMLElement) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.app.init({ resizeTo: this.parent, background: PALETTE.seaDeep, antialias: true, resolution: 1, preference: 'webgl' });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.app.canvas.classList.add('menu-canvas');
    this.parent.prepend(this.app.canvas);
    const rng = new Rng(2024);
    const map = generateIsland(rng, DEFAULT_CONFIG);
    this.world = buildTerrain(map, new Rng(99));
    // El desenfoque se hace con CSS sobre el canvas (.menu-canvas): un BlurFilter de PixiJS sobre la textura
    // completa de la isla (4600 px) no se renderiza.
    this.app.stage.addChild(this.world);
    this.app.ticker.add((ticker) => {
      this.t += ticker.deltaMS / 1000;
      const w = this.app.renderer.width;
      const h = this.app.renderer.height;
      const cx = map.width / 2 + Math.cos(this.t * 0.06) * 320;
      const cy = map.height / 2 + Math.sin(this.t * 0.045) * 260;
      this.world!.scale.set(1.15);
      this.world!.position.set(w / 2 - cx * 1.15, h / 2 - cy * 1.15);
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.world) this.app.destroy(true, { children: true });
  }
}
