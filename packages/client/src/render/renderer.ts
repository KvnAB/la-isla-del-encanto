import { Application, Container, Graphics } from 'pixi.js';
import { Rng, type GameEvent, type IslandMap, type WorldState } from '@draycol/core';
import { Camera } from './camera';
import { PALETTE } from './palette';
import { buildTerrain } from './terrain';

/** Capas del mundo en orden de dibujo. */
export interface WorldLayers {
  terrain: Container;
  shadows: Container;
  ground: Container;
  entities: Container;
  fx: Container;
}

export class Renderer {
  readonly camera = new Camera();
  readonly app = new Application();
  readonly world = new Container();
  readonly layers: WorldLayers = {
    terrain: new Container(),
    shadows: new Container(),
    ground: new Container(),
    entities: new Container(),
    fx: new Container(),
  };
  /** Capa en espacio de pantalla, encima del mundo (noche, destellos). */
  readonly screen = new Container();
  private initialized = false;
  private tempPlayer: Graphics | null = null;

  constructor(private readonly parent: HTMLElement) {}

  get viewW(): number {
    return this.app.renderer.width / this.app.renderer.resolution;
  }

  get viewH(): number {
    return this.app.renderer.height / this.app.renderer.resolution;
  }

  async init(map: IslandMap): Promise<void> {
    await this.app.init({
      resizeTo: this.parent,
      background: PALETTE.seaDeep,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
    this.app.canvas.classList.add('game-canvas');
    this.parent.appendChild(this.app.canvas);

    this.layers.entities.sortableChildren = true;
    this.layers.terrain.addChild(buildTerrain(map, new Rng(1234)));
    for (const layer of [this.layers.terrain, this.layers.shadows, this.layers.ground, this.layers.entities, this.layers.fx]) this.world.addChild(layer);
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.screen);
    this.initialized = true;
  }

  /** Ángulo desde el jugador hacia la posición del ratón (coordenadas del canvas). */
  toWorldAngle(playerX: number, playerY: number, mouseX: number, mouseY: number): number {
    const [wx, wy] = this.camera.toWorld(mouseX, mouseY, this.viewW, this.viewH);
    return Math.atan2(wy - playerY, wx - playerX);
  }

  /** Dibuja el estado. `prev` permite interpolar posiciones con `alpha`. */
  render(state: WorldState, alpha: number, prev: WorldState | null, _events: GameEvent[] = []): void {
    if (!this.initialized) return;
    const p = state.players[0];
    if (p) {
      const pp = prev?.players[0];
      const x = pp ? pp.x + (p.x - pp.x) * alpha : p.x;
      const y = pp ? pp.y + (p.y - pp.y) * alpha : p.y;
      this.camera.follow(x, y);
      if (!this.tempPlayer) {
        this.tempPlayer = new Graphics().circle(0, 0, p.radius).fill(PALETTE.skin).stroke({ width: 5, color: PALETTE.skinOutline });
        this.layers.entities.addChild(this.tempPlayer);
      }
      this.tempPlayer.position.set(x, y);
      this.tempPlayer.rotation = p.angle;
    }
    this.camera.apply(this.world, this.viewW, this.viewH);
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
    this.initialized = false;
  }
}
