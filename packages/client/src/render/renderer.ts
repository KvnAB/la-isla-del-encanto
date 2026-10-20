import { Application, Container, Graphics } from 'pixi.js';
import { resourceAvailable, resourceCapacity, Rng, type GameConfig, type GameEvent, type IslandMap, type ResourceState, type WorldState } from '@draycol/core';
import { Camera } from './camera';
import { Fx } from './fx';
import { nightAmount, NightLayer } from './night';
import { PALETTE } from './palette';
import {
  animateCampfire,
  makeCampfire,
  makeCreature,
  makeGroundItem,
  makeRegenRing,
  makeRock,
  makeRubble,
  makeShadow,
  makeStump,
  makeTree,
  PlayerView,
  updateRegenRing,
  type CampfireView,
} from './sprites';
import { buildTerrain } from './terrain';

/** Posiciones del paso anterior para interpolar. */
export interface PrevSnapshot {
  players: Map<number, { x: number; y: number; angle: number }>;
  creatures: Map<number, { x: number; y: number; angle: number }>;
}

export function snapshot(state: WorldState): PrevSnapshot {
  const players = new Map<number, { x: number; y: number; angle: number }>();
  for (const p of state.players) players.set(p.id, { x: p.x, y: p.y, angle: p.angle });
  const creatures = new Map<number, { x: number; y: number; angle: number }>();
  for (const c of state.creatures) creatures.set(c.id, { x: c.x, y: c.y, angle: c.angle });
  return { players, creatures };
}

/** Capas del mundo en orden de dibujo. */
export interface WorldLayers {
  terrain: Container;
  shadows: Container;
  ground: Container;
  entities: Container;
  fx: Container;
}

interface ResourceView {
  sprite: Container;
  shadow: Graphics;
  ring: Graphics;
  broken: boolean;
}

interface SimpleView {
  sprite: Container;
  shadow: Graphics;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
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
  private readonly spriteRng = new Rng(77);

  private readonly players = new Map<number, { view: PlayerView; shadow: Graphics }>();
  private readonly resources = new Map<number, ResourceView>();
  private readonly creatures = new Map<number, SimpleView>();
  private readonly groundItems = new Map<number, SimpleView>();
  private readonly campfires = new Map<number, { view: CampfireView; shadow: Graphics }>();
  private time = 0;
  private lastRenderTime = 0;
  readonly night = new NightLayer();
  fx: Fx | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly cfg: GameConfig,
  ) {}

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
    this.screen.addChild(this.night);
    this.app.stage.addChild(this.screen);
    this.fx = new Fx(this.parent);
    this.initialized = true;
  }

  /** Ángulo desde el jugador hacia la posición del ratón (coordenadas del canvas). */
  toWorldAngle(playerX: number, playerY: number, mouseX: number, mouseY: number): number {
    const [wx, wy] = this.camera.toWorld(mouseX, mouseY, this.viewW, this.viewH);
    return Math.atan2(wy - playerY, wx - playerX);
  }

  /** Dibuja el estado. `prev` permite interpolar posiciones con `alpha`. */
  /** Consume eventos del núcleo para disparar efectos. Llamar tras cada step. */
  onEvents(events: GameEvent[], localPlayerId: number): void {
    if (!this.fx) return;
    for (const e of events) {
      if (e.type === 'playerDamaged' && e.playerId === localPlayerId) this.fx.damageFlash();
      else if ((e.type === 'resourceHit' || e.type === 'creatureHit') && e.playerId === localPlayerId) this.fx.hitShake();
    }
  }

  render(state: WorldState, alpha: number, prev: PrevSnapshot | null, _events: GameEvent[] = []): void {
    if (!this.initialized) return;
    this.time = state.time + alpha * this.cfg.stepSeconds;
    const dt = Math.max(0, this.time - this.lastRenderTime);
    this.lastRenderTime = this.time;
    this.fx?.update(dt);
    this.syncPlayers(state, alpha, prev);
    this.syncResources(state);
    this.syncCreatures(state, alpha, prev);
    this.syncGroundItems(state);
    this.syncCampfires(state);
    this.camera.apply(this.world, this.viewW, this.viewH);
    if (this.fx) {
      this.world.position.x += Math.round(this.fx.shakeX);
      this.world.position.y += Math.round(this.fx.shakeY);
    }
    this.night.update(nightAmount(state.isNight, state.phaseRemaining, this.cfg.daySeconds), state.campfires, this.camera, this.viewW, this.viewH);
  }

  private syncPlayers(state: WorldState, alpha: number, prev: PrevSnapshot | null): void {
    const seen = new Set<number>();
    for (const p of state.players) {
      seen.add(p.id);
      let v = this.players.get(p.id);
      if (!v) {
        v = { view: new PlayerView(p.radius, p.name), shadow: makeShadow(p.radius) };
        this.layers.entities.addChild(v.view);
        this.layers.shadows.addChild(v.shadow);
        this.players.set(p.id, v);
      }
      const pp = prev?.players.get(p.id);
      const x = pp ? pp.x + (p.x - pp.x) * alpha : p.x;
      const y = pp ? pp.y + (p.y - pp.y) * alpha : p.y;
      v.view.update(p, x, y);
      v.view.zIndex = y;
      v.view.visible = p.alive;
      v.shadow.position.set(x, y + 4);
      v.shadow.visible = p.alive;
      if (p === state.players[0]) this.camera.follow(x, y);
    }
    for (const [id, v] of this.players)
      if (!seen.has(id)) {
        v.view.destroy();
        v.shadow.destroy();
        this.players.delete(id);
      }
  }

  private buildResourceSprite(r: ResourceState, broken: boolean): Container {
    if (broken) return r.kind === 'rock' ? makeRubble(r.radius, this.spriteRng) : makeStump(r.radius);
    if (r.kind === 'rock') return makeRock(r.size, r.radius, this.spriteRng);
    return makeTree(r.size, r.kind, r.radius);
  }

  private syncResources(state: WorldState): void {
    const seen = new Set<number>();
    for (const r of state.resources) {
      seen.add(r.id);
      const broken = r.brokenAt !== null;
      let v = this.resources.get(r.id);
      if (!v) {
        v = { sprite: this.buildResourceSprite(r, broken), shadow: makeShadow(r.radius), ring: makeRegenRing(), broken };
        v.sprite.position.set(r.x, r.y);
        v.sprite.zIndex = r.y;
        v.shadow.position.set(r.x, r.y + 6);
        v.ring.position.set(r.x, r.y);
        this.layers.entities.addChild(v.sprite);
        this.layers.shadows.addChild(v.shadow);
        this.layers.ground.addChild(v.ring);
        this.resources.set(r.id, v);
      }
      if (v.broken !== broken) {
        v.sprite.destroy();
        v.sprite = this.buildResourceSprite(r, broken);
        v.sprite.position.set(r.x, r.y);
        v.sprite.zIndex = r.y;
        this.layers.entities.addChild(v.sprite);
        v.broken = broken;
        v.shadow.visible = !broken;
        if (!broken) v.ring.clear();
      }
      if (broken) {
        const progress = resourceAvailable(r, this.cfg, state.time) / resourceCapacity(r.kind, r.size, this.cfg);
        updateRegenRing(v.ring, progress, Math.max(12, r.radius * 0.42));
      }
    }
    for (const [id, v] of this.resources)
      if (!seen.has(id)) {
        v.sprite.destroy();
        v.shadow.destroy();
        v.ring.destroy();
        this.resources.delete(id);
      }
  }

  private syncCreatures(state: WorldState, alpha: number, prev: PrevSnapshot | null): void {
    const seen = new Set<number>();
    for (const c of state.creatures) {
      seen.add(c.id);
      let v = this.creatures.get(c.id);
      if (!v) {
        v = { sprite: makeCreature(c.kind, c.radius), shadow: makeShadow(c.radius * 1.3) };
        this.layers.entities.addChild(v.sprite);
        this.layers.shadows.addChild(v.shadow);
        this.creatures.set(c.id, v);
      }
      const pc = prev?.creatures.get(c.id);
      const x = pc ? pc.x + (c.x - pc.x) * alpha : c.x;
      const y = pc ? pc.y + (c.y - pc.y) * alpha : c.y;
      v.sprite.position.set(x, y);
      v.sprite.rotation = pc ? lerpAngle(pc.angle, c.angle, alpha) : c.angle;
      v.sprite.zIndex = y;
      v.shadow.position.set(x, y + 4);
    }
    for (const [id, v] of this.creatures)
      if (!seen.has(id)) {
        v.sprite.destroy();
        v.shadow.destroy();
        this.creatures.delete(id);
      }
  }

  private syncGroundItems(state: WorldState): void {
    const seen = new Set<number>();
    for (const g of state.groundItems) {
      seen.add(g.id);
      let v = this.groundItems.get(g.id);
      if (!v) {
        v = { sprite: makeGroundItem(g.item), shadow: makeShadow(14) };
        v.sprite.position.set(g.x, g.y);
        v.sprite.rotation = ((g.id * 37) % 60) / 60 - 0.5;
        v.shadow.position.set(g.x, g.y + 3);
        this.layers.ground.addChild(v.shadow, v.sprite);
        this.groundItems.set(g.id, v);
      }
      const left = g.expiresAt - this.time;
      v.sprite.alpha = left < 10 ? (Math.sin(this.time * Math.PI * 8) > 0 ? 1 : 0.3) : 1;
      v.shadow.alpha = v.sprite.alpha;
    }
    for (const [id, v] of this.groundItems)
      if (!seen.has(id)) {
        v.sprite.destroy();
        v.shadow.destroy();
        this.groundItems.delete(id);
      }
  }

  private syncCampfires(state: WorldState): void {
    const seen = new Set<number>();
    for (const c of state.campfires) {
      seen.add(c.id);
      let v = this.campfires.get(c.id);
      if (!v) {
        v = { view: makeCampfire(), shadow: makeShadow(20) };
        v.view.position.set(c.x, c.y);
        v.view.zIndex = c.y;
        v.shadow.position.set(c.x, c.y + 4);
        this.layers.entities.addChild(v.view);
        this.layers.shadows.addChild(v.shadow);
        this.campfires.set(c.id, v);
      }
      animateCampfire(v.view, this.time + c.id);
    }
    for (const [id, v] of this.campfires)
      if (!seen.has(id)) {
        v.view.destroy();
        v.shadow.destroy();
        this.campfires.delete(id);
      }
  }

  destroy(): void {
    this.fx?.destroy();
    this.app.destroy(true, { children: true });
    this.initialized = false;
  }
}
