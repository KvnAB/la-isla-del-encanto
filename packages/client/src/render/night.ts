import { Container, FillGradient, Graphics } from 'pixi.js';
import type { CampfireState } from '@draycol/core';
import type { Camera } from './camera';
import { PALETTE } from './palette';

const NIGHT_ALPHA = 0.62;
const FADE_SECONDS = 20;
const FIRE_RADIUS = 200;

/** Fracción de oscuridad 0..1 según la fase del ciclo. */
export function nightAmount(isNight: boolean, phaseRemaining: number, daySeconds: number): number {
  if (isNight) return 1;
  const elapsed = daySeconds - phaseRemaining;
  if (elapsed < FADE_SECONDS) return 1 - elapsed / FADE_SECONDS;
  if (phaseRemaining < FADE_SECONDS) return 1 - phaseRemaining / FADE_SECONDS;
  return 0;
}

/**
 * Capa de noche en espacio de pantalla: dos capas oscuras con huecos de distinto radio
 * alrededor de las fogatas (caída escalonada) más un resplandor cálido encima.
 */
export class NightLayer extends Container {
  private readonly outer = new Graphics();
  private readonly inner = new Graphics();
  private readonly glow = new Graphics();
  private readonly glowGradient: FillGradient;

  constructor() {
    super();
    this.glowGradient = new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: 'rgba(255,179,71,0.5)' },
        { offset: 0.55, color: 'rgba(255,179,71,0.16)' },
        { offset: 1, color: 'rgba(255,179,71,0)' },
      ],
      textureSpace: 'local',
    });
    this.addChild(this.outer, this.inner, this.glow);
    this.eventMode = 'none';
  }

  update(amount: number, campfires: CampfireState[], camera: Camera, viewW: number, viewH: number): void {
    this.visible = amount > 0.001;
    if (!this.visible) return;
    const alpha = NIGHT_ALPHA * amount;
    const fires = campfires.map((c) => {
      const sx = (c.x - camera.x) * camera.zoom + viewW / 2;
      const sy = (c.y - camera.y) * camera.zoom + viewH / 2;
      return { sx, sy, r: FIRE_RADIUS * camera.zoom };
    });

    // En PixiJS 8, cut() recorta la última forma de la forma rellenada anterior.
    this.outer.clear();
    this.outer.rect(0, 0, viewW, viewH).fill({ color: PALETTE.night, alpha: alpha * 0.55 });
    for (const f of fires) this.outer.circle(f.sx, f.sy, f.r).cut();

    this.inner.clear();
    this.inner.rect(0, 0, viewW, viewH).fill({ color: PALETTE.night, alpha: alpha * 0.45 });
    for (const f of fires) this.inner.circle(f.sx, f.sy, f.r * 0.62).cut();

    this.glow.clear();
    for (const f of fires) {
      this.glow.circle(f.sx, f.sy, f.r * 1.05).fill({ fill: this.glowGradient, alpha: amount });
    }
  }
}
