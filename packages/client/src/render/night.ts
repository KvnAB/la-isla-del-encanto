import { Container, FillGradient, Graphics } from 'pixi.js';
import type { Camera } from './camera';
import type { Light } from './lights';
import { PALETTE } from './palette';

/** Oscuridad máxima: noche de verdad, pero nunca negro total. */
export const NIGHT_ALPHA = 0.86;
const FADE_SECONDS = 20;

/** Fracción de oscuridad 0..1 según la fase del ciclo. El día 1 empieza sin amanecer (no viene de una noche). */
export function nightAmount(isNight: boolean, phaseRemaining: number, daySeconds: number, day: number): number {
  if (isNight) return 1;
  const elapsed = daySeconds - phaseRemaining;
  if (day > 1 && elapsed < FADE_SECONDS) return 1 - elapsed / FADE_SECONDS;
  if (phaseRemaining < FADE_SECONDS) return 1 - phaseRemaining / FADE_SECONDS;
  return 0;
}

interface DarkLayer {
  root: Container;
  rect: Graphics;
  holes: Graphics;
  alphaK: number;
  radiusK: number;
}

/**
 * Capa de noche en espacio de pantalla: tres capas oscuras, cada una con huecos de distinto radio
 * alrededor de cada luz (máscara inversa → admite varias luces), más un resplandor cálido sobre las luces `warm`.
 */
export class NightLayer extends Container {
  private readonly layers: DarkLayer[];
  private readonly glow = new Graphics();
  private readonly glowGradient: FillGradient;

  constructor() {
    super();
    this.layers = [
      [0.4, 1],
      [0.33, 0.78],
      [0.27, 0.55],
    ].map(([alphaK, radiusK]) => {
      const root = new Container();
      const rect = new Graphics();
      const holes = new Graphics();
      root.addChild(rect, holes);
      this.addChild(root);
      return { root, rect, holes, alphaK, radiusK };
    });
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
    this.addChild(this.glow);
    this.eventMode = 'none';
  }

  update(amount: number, lights: Light[], camera: Camera, viewW: number, viewH: number): void {
    this.visible = amount > 0.001;
    if (!this.visible) return;
    const alpha = NIGHT_ALPHA * amount;
    const fires = lights.map((l) => ({
      sx: (l.x - camera.x) * camera.zoom + viewW / 2,
      sy: (l.y - camera.y) * camera.zoom + viewH / 2,
      r: l.r * camera.zoom,
      warm: l.warm,
    }));

    for (const l of this.layers) {
      l.rect.clear();
      l.rect.rect(0, 0, viewW, viewH).fill({ color: PALETTE.night, alpha: alpha * l.alphaK });
      l.holes.clear();
      if (fires.length === 0) {
        l.rect.setMask({ mask: null });
        continue;
      }
      for (const f of fires) l.holes.circle(f.sx, f.sy, f.r * l.radiusK).fill(0xffffff);
      l.rect.setMask({ mask: l.holes, inverse: true });
    }

    this.glow.clear();
    for (const f of fires) if (f.warm) this.glow.circle(f.sx, f.sy, f.r * 1.05).fill({ fill: this.glowGradient, alpha: amount });
  }
}
