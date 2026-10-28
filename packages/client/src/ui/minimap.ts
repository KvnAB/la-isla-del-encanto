import type { IslandMap, PlayerState, ResourceKind, WorldState } from '@draycol/core';
import { smoothLoop, traceContours, type Loop } from '../render/contours';

/** Lado del minimapa en píxeles CSS (el canvas es cuadrado; la isla también). */
export const MINIMAP_SIZE = 160;

/** Colores del minimapa: versión apagada de la paleta del juego para que el punto del jugador destaque. */
const C = {
  sea: '#1c3a5c',
  sand: '#d6c68e',
  land: '#5c9646',
  snow: '#e9eef3',
  snowEdge: '#c9d6e1',
  diamond: '#7fe7ff',
  emerald: '#3fd97a',
  berry: '#9b5bc4',
  water: '#5fa0d2',
  waterEdge: '#2a5e8f',
  tree: '#2f7a35',
  treeLight: '#4a9a44',
  apple: '#e0332a',
  rock: '#9aa0a5',
  rockDark: '#5e646a',
  gold: '#f5c531',
};

/** Coordenadas del mundo → píxel del minimapa. */
export function toMinimap(x: number, y: number, map: IslandMap): { x: number; y: number } {
  return { x: (x / map.width) * MINIMAP_SIZE, y: (y / map.height) * MINIMAP_SIZE };
}

/** Contornos suavizados de la isla (todo lo que no es mar), de la nieve y del agua interior, ya escalados al minimapa. */
export function islandShapes(map: IslandMap): { island: Loop[]; water: Loop[]; snow: Loop[] } {
  const k = MINIMAP_SIZE / map.width;
  const at = (c: number, r: number) => map.cells[r * map.cols + c];
  const scale = (l: Loop) => l.map((v) => v * k);
  return {
    island: traceContours(map.cols, map.rows, map.cellSize, (c, r) => at(c, r) !== 'sea').map((l) => scale(smoothLoop(l, 3))),
    water: traceContours(map.cols, map.rows, map.cellSize, (c, r) => at(c, r) === 'water').map((l) => scale(smoothLoop(l, 3))),
    snow: traceContours(map.cols, map.rows, map.cellSize, (c, r) => at(c, r) === 'snow').map((l) => scale(smoothLoop(l, 3))),
  };
}

export interface MinimapMarker {
  id: number;
  kind: ResourceKind;
  x: number;
  y: number;
  /** Radio en píxeles del minimapa, con un mínimo para que se vea. */
  r: number;
  broken: boolean;
}

const MIN_MARKER_R = 2;

/** Un marcador por recurso (árbol, frutal, roca, roca de oro). */
export function minimapMarkers(state: WorldState, map: IslandMap): MinimapMarker[] {
  const k = MINIMAP_SIZE / map.width;
  return state.resources.map((r) => {
    const p = toMinimap(r.x, r.y, map);
    return { id: r.id, kind: r.kind, x: p.x, y: p.y, r: Math.max(MIN_MARKER_R, r.radius * k), broken: r.brokenAt !== null };
  });
}

function pathOf(loop: Loop): Path2D {
  const p = new Path2D();
  p.moveTo(loop[0], loop[1]);
  for (let i = 2; i < loop.length; i += 2) p.lineTo(loop[i], loop[i + 1]);
  p.closePath();
  return p;
}

/** Minimapa vectorial arriba a la derecha: silueta de la isla, recursos y el punto del jugador. */
export class Minimap {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private shapes: { island: Path2D[]; water: Path2D[]; snow: Path2D[] } | null = null;
  private shapesOf: IslandMap | null = null;
  private lastSignature = '';
  /** Última posición pintada, en píxeles del minimapa (para tests y depuración). */
  player: { x: number; y: number; angle: number } | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'hud-minimap';
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(MINIMAP_SIZE * dpr);
    this.canvas.height = Math.round(MINIMAP_SIZE * dpr);
    this.canvas.style.width = `${MINIMAP_SIZE}px`;
    this.canvas.style.height = `${MINIMAP_SIZE}px`;
    this.canvas.setAttribute('aria-label', 'Mapa de la isla');
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.ctx?.scale(dpr, dpr);
  }

  update(p: PlayerState, state: WorldState): void {
    const map = state.map;
    const pos = toMinimap(p.x, p.y, map);
    this.player = { x: pos.x, y: pos.y, angle: p.angle };
    const ctx = this.ctx;
    if (!ctx) return;

    // Solo repintar si algo cambió: posición/mirada del jugador o qué recursos están rotos.
    let brokenSig = '';
    for (const r of state.resources) if (r.brokenAt !== null) brokenSig += r.id + ',';
    const sig = `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${p.angle.toFixed(2)}|${brokenSig}`;
    if (sig === this.lastSignature && this.shapesOf === map) return;
    this.lastSignature = sig;

    if (this.shapesOf !== map) {
      this.shapesOf = map;
      const s = islandShapes(map);
      this.shapes = { island: s.island.map(pathOf), water: s.water.map(pathOf), snow: s.snow.map(pathOf) };
    }
    const { island, water, snow } = this.shapes!;

    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx.fillStyle = C.sea;
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx.lineJoin = 'round';
    // arena: trazo del contorno de la costa, recortado a la isla para que solo se vea por dentro
    for (const path of island) {
      ctx.save();
      ctx.clip(path);
      ctx.fillStyle = C.land;
      ctx.fill(path);
      ctx.strokeStyle = C.sand;
      ctx.lineWidth = 5;
      ctx.stroke(path);
      ctx.restore();
    }
    for (const path of snow) {
      ctx.fillStyle = C.snow;
      ctx.fill(path);
      ctx.strokeStyle = C.snowEdge;
      ctx.lineWidth = 1;
      ctx.stroke(path);
    }
    for (const path of water) {
      ctx.fillStyle = C.water;
      ctx.fill(path);
      ctx.strokeStyle = C.waterEdge;
      ctx.lineWidth = 1;
      ctx.stroke(path);
    }

    for (const m of minimapMarkers(state, map)) this.drawMarker(ctx, m);

    // punto del jugador con una pequeña flecha hacia donde mira
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -3.5);
    ctx.lineTo(4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawMarker(ctx: CanvasRenderingContext2D, m: MinimapMarker): void {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalAlpha = m.broken ? 0.35 : 1;
    ctx.lineWidth = 0.8;
    if (m.kind === 'berry_bush') {
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fillStyle = C.berry;
      ctx.fill();
    } else if (m.kind === 'tree' || m.kind === 'apple_tree') {
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, Math.PI * 2);
      ctx.fillStyle = C.treeLight;
      ctx.fill();
      ctx.strokeStyle = C.tree;
      ctx.stroke();
      if (m.kind === 'apple_tree') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.8, m.r * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = C.apple;
        ctx.fill();
      }
    } else {
      // roca: hexágono plano
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const x = Math.cos(a) * m.r;
        const y = Math.sin(a) * m.r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = C.rock;
      ctx.fill();
      ctx.strokeStyle = C.rockDark;
      ctx.stroke();
      if (m.kind === 'gold_rock' || m.kind === 'diamond_rock' || m.kind === 'emerald_rock') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.9, m.r * 0.45), 0, Math.PI * 2);
        ctx.fillStyle = m.kind === 'gold_rock' ? C.gold : m.kind === 'diamond_rock' ? C.diamond : C.emerald;
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
