import type { Container } from 'pixi.js';

/** Cámara centrada en un punto del mundo con zoom fijo. */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1.25;

  follow(px: number, py: number): void {
    this.x = px;
    this.y = py;
  }

  /** Convierte coordenadas de pantalla (relativas al canvas) a mundo. */
  toWorld(sx: number, sy: number, viewW: number, viewH: number): [number, number] {
    return [(sx - viewW / 2) / this.zoom + this.x, (sy - viewH / 2) / this.zoom + this.y];
  }

  /** Aplica la transformación al contenedor raíz del mundo. */
  apply(container: Container, viewW: number, viewH: number): void {
    container.scale.set(this.zoom);
    container.position.set(Math.round(viewW / 2 - this.x * this.zoom), Math.round(viewH / 2 - this.y * this.zoom));
  }

  /** Rectángulo visible en coordenadas de mundo, con margen. */
  visibleBounds(viewW: number, viewH: number, margin = 0): { left: number; top: number; right: number; bottom: number } {
    const hw = viewW / 2 / this.zoom + margin;
    const hh = viewH / 2 / this.zoom + margin;
    return { left: this.x - hw, top: this.y - hh, right: this.x + hw, bottom: this.y + hh };
  }
}
