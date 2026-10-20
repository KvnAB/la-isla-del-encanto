import { Graphics } from 'pixi.js';

/** Sombra suave bajo una entidad: tres círculos concéntricos de baja opacidad (sin filtros, barato). */
export function makeShadow(r: number): Graphics {
  const g = new Graphics();
  g.circle(0, 0, r * 1.22).fill({ color: 0x000000, alpha: 0.08 });
  g.circle(0, 0, r * 1.1).fill({ color: 0x000000, alpha: 0.1 });
  g.circle(0, 0, r * 0.98).fill({ color: 0x000000, alpha: 0.12 });
  return g;
}
