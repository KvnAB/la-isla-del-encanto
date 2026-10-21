import { Application, Container, Graphics } from 'pixi.js';
import { resourceAvailable, resourceCapacity, terrainAt, type GameConfig, type GameEvent, type IslandMap, type ResourceState, type WorldState } from '@draycol/core';
import { Camera } from './camera';
import { FloatingNumbers } from './floating';
import { Fx } from './fx';
import { lightsFor } from './lights';
import { nightAmount, NightLayer } from './night';
import { drawHitboxes, hitboxCircles } from './debug';
import { PALETTE } from './palette';
import { animateCampfireVector, makeCampfireVector, makeCreatureVector, makeGroundItemVector, makeRegenRing, makeResourceVector, makeShadow, PlayerView, updateRegenRing, type CampfireVectorView } from './sprites';
import { buildTerrain } from './terrain';

const HIT_FX_SECONDS = 0.18;
const DAMAGE_COLOR = 0xff5a4a;

/** 14.285… → "14"; 12.5 → "12.5". */
function formatDamage(n: number): string {
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString();
}

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

  private readonly players = new Map<number, { view: PlayerView; shadow: Graphics }>();
  private readonly resources = new Map<number, ResourceView>();
  private readonly creatures = new Map<number, SimpleView>();
  private readonly groundItems = new Map<number, SimpleView>();
  private readonly campfires = new Map<number, { view: CampfireVectorView; shadow: Graphics }>();
  private time = 0;
  private lastRenderTime = 0;
  /** Efectos de golpe activos por entidad: tiempo restante y tipo. */
  private readonly hitFx = new Map<number, { t: number; kind: 'hit' | 'hurt'; dx: number; dy: number }>();
  readonly night = new NightLayer();
  fx: Fx | null = null;
  /** Overlay de círculos de colisión (tecla H en desarrollo). */
  showHitboxes = false;
  /** Jugador cuya luz y cámara se usan; por defecto el primero del estado. */
  localPlayerId: number | null = null;
  private readonly hitboxGfx = new Graphics();
  /** Números de daño flotantes. */
  readonly floating = new FloatingNumbers();

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
    this.layers.terrain.addChild(buildTerrain(map, this.app.renderer));
    for (const layer of [this.layers.terrain, this.layers.shadows, this.layers.ground, this.layers.entities, this.layers.fx]) this.world.addChild(layer);
    this.layers.fx.addChild(this.hitboxGfx, this.floating);
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
      if (e.type === 'playerDamaged' && e.playerId === localPlayerId) {
        this.fx.damageFlash();
        const attacker = this.creatures.get(e.byEntityId)?.sprite;
        const me = this.players.get(e.playerId)?.view;
        const dx = attacker && me ? me.x - attacker.x : 1;
        const dy = attacker && me ? me.y - attacker.y : 0;
        const l = Math.hypot(dx, dy) || 1;
        this.hitFx.set(e.playerId, { t: HIT_FX_SECONDS, kind: 'hurt', dx: dx / l, dy: dy / l });
        if (me) this.floating.spawn(me.x, me.y - me.r - 6, `-${formatDamage(e.amount)}`, DAMAGE_COLOR);
      } else if (e.type === 'creatureHit' && e.playerId === localPlayerId) {
        this.fx.hitShake();
        const target = this.creatures.get(e.entityId)?.sprite;
        const me = this.players.get(e.playerId)?.view;
        const dx = target && me ? target.x - me.x : 1;
        const dy = target && me ? target.y - me.y : 0;
        const l = Math.hypot(dx, dy) || 1;
        this.hitFx.set(e.entityId, { t: HIT_FX_SECONDS, kind: 'hit', dx: dx / l, dy: dy / l });
        if (target) this.floating.spawn(target.x, target.y - 30, `-${formatDamage(e.amount)}`, 0xffffff);
      } else if (e.type === 'resourceHit' && e.playerId === localPlayerId) {
        this.fx.hitShake();
        this.hitFx.set(e.entityId, { t: HIT_FX_SECONDS, kind: 'hit', dx: 0, dy: 0 });
      }
    }
  }

  /** Aplica destello (tinte) y empujón a los sprites con un efecto de golpe activo. */
  private applyHitFx(dt: number): void {
    for (const [id, fx] of this.hitFx) {
      fx.t -= dt;
      const k = Math.max(0, fx.t / HIT_FX_SECONDS); // 1 → 0
      // En el jugador se tiñe solo el cuerpo (no el nombre).
      const target = this.creatures.get(id)?.sprite ?? this.resources.get(id)?.sprite ?? this.players.get(id)?.view.body;
      if (!target) {
        this.hitFx.delete(id);
        continue;
      }
      if (k <= 0) {
        target.tint = 0xffffff;
        target.alpha = 1;
        target.scale.set(1);
        target.pivot.set(0, 0);
        this.hitFx.delete(id);
        continue;
      }
      const wave = Math.sin(k * Math.PI); // 0 → 1 → 0
      if (fx.kind === 'hurt') {
        // tinte rojizo suave al recibir daño
        const mix = Math.round(255 - 110 * wave);
        target.tint = (0xff << 16) | (mix << 8) | mix;
      } else {
        // parpadeo al golpear: baja la opacidad un instante
        target.alpha = 1 - 0.45 * wave;
      }
      // "punch" de escala y empujón en la dirección del golpe
      const punch = 1 + wave * 0.16;
      target.scale.set(punch);
      const push = wave * 9;
      target.pivot.set((-fx.dx * push) / punch, (-fx.dy * push) / punch);
    }
  }

  render(state: WorldState, alpha: number, prev: PrevSnapshot | null, _events: GameEvent[] = []): void {
    if (!this.initialized) return;
    this.time = state.time + alpha * this.cfg.stepSeconds;
    const dt = Math.max(0, this.time - this.lastRenderTime);
    this.lastRenderTime = this.time;
    this.fx?.update(dt);
    this.floating.update(dt);
    this.applyHitFx(dt);
    this.syncPlayers(state, alpha, prev);
    this.syncResources(state);
    this.syncCreatures(state, alpha, prev);
    this.syncGroundItems(state);
    this.syncCampfires(state);
    this.hitboxGfx.visible = this.showHitboxes;
    if (this.showHitboxes) drawHitboxes(this.hitboxGfx, hitboxCircles(state, this.cfg));
    this.camera.apply(this.world, this.viewW, this.viewH);
    if (this.fx) {
      this.world.position.x += Math.round(this.fx.shakeX);
      this.world.position.y += Math.round(this.fx.shakeY);
    }
    const localId = this.localPlayerId ?? state.players[0]?.id ?? -1;
    this.night.update(nightAmount(state.isNight, state.phaseRemaining, this.cfg.daySeconds, state.day), lightsFor(state, this.cfg, localId), this.camera, this.viewW, this.viewH);
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

  private buildResourceSprite(state: WorldState, r: ResourceState, broken: boolean): Container {
    const snowy = terrainAt(state.map, r.x, r.y) === 'snow';
    return makeResourceVector(r.kind, r.size, r.radius, broken, r.id * 7919, snowy);
  }

  private syncResources(state: WorldState): void {
    const seen = new Set<number>();
    const b = this.camera.visibleBounds(this.viewW, this.viewH, 220);
    for (const r of state.resources) {
      seen.add(r.id);
      const onScreen = r.x > b.left && r.x < b.right && r.y > b.top && r.y < b.bottom;
      const existing = this.resources.get(r.id);
      if (!onScreen) {
        if (existing) {
          existing.sprite.visible = false;
          existing.shadow.visible = false;
          existing.ring.visible = false;
        }
        continue;
      }
      if (existing) {
        existing.sprite.visible = true;
        existing.shadow.visible = !existing.broken;
        existing.ring.visible = true;
      }
      const broken = r.brokenAt !== null;
      let v = this.resources.get(r.id);
      if (!v) {
        v = { sprite: this.buildResourceSprite(state, r, broken), shadow: makeShadow(r.radius), ring: makeRegenRing(), broken };
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
        v.sprite = this.buildResourceSprite(state, r, broken);
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
        v = { sprite: makeCreatureVector(c.kind, c.radius), shadow: makeShadow(c.radius * 1.3) };
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
        v = { sprite: makeGroundItemVector(g.item), shadow: makeShadow(16) };
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
        v = { view: makeCampfireVector(), shadow: makeShadow(30) };
        v.view.position.set(c.x, c.y);
        v.view.zIndex = c.y;
        v.shadow.position.set(c.x, c.y + 4);
        this.layers.entities.addChild(v.view);
        this.layers.shadows.addChild(v.shadow);
        this.campfires.set(c.id, v);
      }
      animateCampfireVector(v.view, this.time + c.id);
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
