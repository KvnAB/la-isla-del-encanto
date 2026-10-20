import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { generateIsland } from './island.js';
import { Rng } from './rng.js';
import { stepDayCycle } from './systems/daycycle.js';
import { stepPlayerMovement, type Solid } from './systems/movement.js';
import type { Command, EntityId, GameEvent, PlayerState, StartItem, WorldState } from './types.js';
import { norm } from './vec.js';

export class World {
  readonly cfg: GameConfig;
  private readonly state: WorldState;
  private readonly rng: Rng;
  private readonly queue: Command[] = [];
  private events: GameEvent[] = [];

  constructor(seed: number, cfg: GameConfig = DEFAULT_CONFIG) {
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
  }

  addPlayer(name: string, startItem: StartItem): EntityId {
    const id = this.state.nextEntityId++;
    const inventory = Array.from({ length: 8 }, () => null) as PlayerState['inventory'];
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
      points: 0,
      inWater: false,
      alive: true,
      hitCooldown: 0,
      swing: 0,
      moveDx: 0,
      moveDy: 0,
      cookTimer: 0,
      noRegenUntil: 0,
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

    stepDayCycle(s, cfg, dt, this.events);

    const solids: Solid[] = s.resources;
    for (const p of s.players) {
      if (!p.alive) continue;
      stepPlayerMovement(s, p, cfg, dt, solids);
      if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);
      if (p.swing > 0) p.swing = Math.max(0, p.swing - dt / cfg.player.hitCooldown);
    }

    s.tick++;
    s.time += dt;
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
      default:
        break;
    }
  }
}
