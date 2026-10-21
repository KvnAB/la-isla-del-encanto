import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { generateIsland } from './island.js';
import { Rng } from './rng.js';
import { placeCampfire, stepCampfires } from './systems/campfire.js';
import { dropSlot, useSelectedSlot } from './systems/consume.js';
import { craft } from './systems/crafting.js';
import { hitCreature, spawnInitialCreatures, stepCreatures, stepRespawns } from './systems/creatures.js';
import { stepDayCycle } from './systems/daycycle.js';
import { stepGroundItems, tryPickup } from './systems/ground.js';
import { resolveHit } from './systems/hit.js';
import { resourceSolids, stepPlayerMovement, type Solid } from './systems/movement.js';
import { spawnResources } from './systems/resources.js';
import { stepVitals } from './systems/vitals.js';
import type { Command, DeathCause, EntityId, GameEvent, PlayerState, StartItem, WorldState } from './types.js';
import { norm } from './vec.js';

export class World {
  readonly cfg: GameConfig;
  private readonly state: WorldState;
  private readonly rng: Rng;
  private readonly queue: Command[] = [];
  private events: GameEvent[] = [];

  /** `seed` por defecto es la isla fija de la configuración; otra semilla genera otra isla (tests). */
  constructor(seed: number = DEFAULT_CONFIG.island.seed, cfg: GameConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
    this.rng = new Rng(seed);
    const map = generateIsland(this.rng, cfg);
    this.state = {
      tick: 0,
      time: 0,
      day: 1,
      isNight: false,
      phaseRemaining: cfg.daySeconds,
      map,
      players: [],
      resources: [],
      creatures: [],
      groundItems: [],
      campfires: [],
      respawnQueue: [],
      nextEntityId: 1,
    };
    spawnResources(this.state, cfg, this.rng);
    spawnInitialCreatures(this.state, cfg, this.rng);
  }

  addPlayer(name: string, startItem: StartItem): EntityId {
    const id = this.state.nextEntityId++;
    const inventory = Array.from({ length: this.cfg.player.inventorySlots }, () => null) as PlayerState['inventory'];
    inventory[0] = { item: startItem, count: 1 };
    this.state.players.push({
      id,
      name,
      x: this.state.map.spawnX,
      y: this.state.map.spawnY,
      angle: 0,
      radius: this.cfg.player.radius,
      health: 100,
      hunger: 100,
      thirst: 100,
      warmth: 100,
      inventory,
      selectedSlot: 0,
      coatOn: true,
      points: 0,
      inWater: false,
      alive: true,
      hitCooldown: 0,
      swing: 0,
      moveDx: 0,
      moveDy: 0,
      cookTimer: 0,
      noRegenUntil: 0,
      lastHitBy: null,
      lastHitAt: -1000,
    });
    return id;
  }

  player(id: EntityId): PlayerState {
    const p = this.state.players.find((x) => x.id === id);
    if (!p) throw new Error(`Jugador ${id} no existe`);
    return p;
  }

  enqueue(cmd: Command): void {
    this.queue.push(cmd);
  }

  getState(): WorldState {
    return this.state;
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  stepSeconds(seconds: number): void {
    const n = Math.round(seconds / this.cfg.stepSeconds);
    for (let i = 0; i < n; i++) this.step();
  }

  step(): void {
    const s = this.state;
    const cfg = this.cfg;
    const dt = cfg.stepSeconds;

    for (const cmd of this.queue) this.apply(cmd);
    this.queue.length = 0;

    const dayBefore = s.day;
    stepDayCycle(s, cfg, dt, this.events);
    if (s.day > dayBefore) for (const p of s.players) if (p.alive) p.points += cfg.points.dayPassed;

    // Las criaturas no bloquean al jugador (puede pasar por debajo para no quedar acorralado); ellas sí se detienen en él.
    const playerSolids: Solid[] = resourceSolids(s, cfg);
    for (const p of s.players) {
      if (!p.alive) continue;
      stepPlayerMovement(s, p, cfg, dt, playerSolids);
      if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);
      if (p.swing > 0) p.swing = Math.max(0, p.swing - dt / cfg.player.hitCooldown);
    }

    stepCreatures(s, cfg, dt, this.rng, this.events);
    stepRespawns(s, cfg, this.rng, this.events);
    stepCampfires(s, cfg, dt, this.events);
    stepGroundItems(s);
    for (const p of s.players) {
      stepVitals(s, p, cfg, dt, this.events);
      this.checkDeath(p);
    }

    s.tick++;
    s.time += dt;
  }

  private checkDeath(p: PlayerState): void {
    if (!p.alive || p.health > 0) return;
    p.health = 0;
    p.alive = false;
    p.moveDx = 0;
    p.moveDy = 0;
    this.events.push({ type: 'playerDied', playerId: p.id, days: this.state.day - 1, points: p.points, cause: this.deathCause(p) });
  }

  /** La criatura que lo golpeó hace poco; si no, la primera barra vacía (hambre, sed, frío); si ninguna, hambre. */
  private deathCause(p: PlayerState): DeathCause {
    if (p.lastHitBy && this.state.time - p.lastHitAt <= this.cfg.combat.lastHitWindow) return { kind: 'creature', creature: p.lastHitBy };
    if (p.hunger <= 0) return { kind: 'hunger' };
    if (p.thirst <= 0) return { kind: 'thirst' };
    if (p.warmth <= 0) return { kind: 'cold' };
    return { kind: 'hunger' };
  }

  private apply(cmd: Command): void {
    const p = this.state.players.find((x) => x.id === cmd.playerId);
    if (!p || !p.alive) return;
    switch (cmd.type) {
      case 'move': {
        const [dx, dy] = norm(cmd.dx, cmd.dy);
        p.moveDx = dx;
        p.moveDy = dy;
        break;
      }
      case 'aim':
        p.angle = cmd.angle;
        break;
      case 'hit':
        resolveHit(this.state, p, this.cfg, this.events, {
          pickup: (pl, g) => tryPickup(this.state, pl, g, this.events),
          creature: (pl, c) => hitCreature(this.state, pl, c, this.cfg, this.rng, this.events),
        });
        break;
      case 'selectSlot':
        if (Number.isInteger(cmd.slot) && cmd.slot >= 0 && cmd.slot < p.inventory.length) p.selectedSlot = cmd.slot;
        break;
      case 'useSlot':
        useSelectedSlot(this.state, p, this.cfg, this.events, {
          placeCampfire: (st, pl) => placeCampfire(st, pl, this.cfg, this.events),
        });
        break;
      case 'dropSlot':
        if (Number.isInteger(cmd.slot) && cmd.slot >= 0 && cmd.slot < p.inventory.length) dropSlot(this.state, p, cmd.slot, this.cfg, this.events);
        break;
      case 'craft':
        craft(p, cmd.recipeId, this.cfg, this.events);
        break;
      default:
        break;
    }
  }
}
