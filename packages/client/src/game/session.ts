import { ITEM_META, World, type Command, type GameEvent, type StartItem } from '@draycol/core';

export interface SessionOptions {
  name: string;
  startItem: StartItem;
  seed?: number;
}

/** Una partida: el mundo del núcleo más el jugador local. */
export class Session {
  readonly world: World;
  readonly playerId: number;
  readonly seed: number;

  constructor(opts: SessionOptions) {
    this.seed = opts.seed ?? Date.now() >>> 0;
    this.world = new World(this.seed);
    this.playerId = this.world.addPlayer(opts.name, opts.startItem);
  }

  /** Clic izquierdo: usar el slot si es comida o fogata; si no, golpear. */
  primaryAction(): Command {
    const p = this.world.player(this.playerId);
    const slot = p.inventory[p.selectedSlot];
    const meta = slot ? ITEM_META[slot.item] : null;
    if (meta && (meta.food || meta.placeable)) return { playerId: this.playerId, type: 'useSlot' };
    return { playerId: this.playerId, type: 'hit' };
  }

  step(commands: Command[]): GameEvent[] {
    for (const c of commands) this.world.enqueue(c);
    this.world.step();
    return this.world.drainEvents();
  }
}
