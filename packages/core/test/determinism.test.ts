import { describe, expect, it } from 'vitest';
import { Rng } from '../src/rng.js';
import type { Command } from '../src/types.js';
import { World } from '../src/world.js';

function script(playerId: number, seed: number, n: number): Command[] {
  const rng = new Rng(seed);
  const cmds: Command[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng.next();
    if (r < 0.4) cmds.push({ playerId, type: 'move', dx: rng.range(-1, 1), dy: rng.range(-1, 1) });
    else if (r < 0.6) cmds.push({ playerId, type: 'aim', angle: rng.range(-Math.PI, Math.PI) });
    else if (r < 0.9) cmds.push({ playerId, type: 'hit' });
    else cmds.push({ playerId, type: 'selectSlot', slot: rng.int(0, 7) });
  }
  return cmds;
}

function run(seed: number): string {
  const w = new World(seed);
  const id = w.addPlayer('Ana', 'wood_pickaxe');
  const cmds = script(id, 5, 600);
  for (const c of cmds) {
    w.enqueue(c);
    w.step();
  }
  return JSON.stringify(w.getState());
}

describe('determinismo', () => {
  it('misma semilla y mismos comandos producen el mismo estado', () => {
    expect(run(99)).toBe(run(99));
  });

  it('semillas distintas producen estados distintos', () => {
    expect(run(99)).not.toBe(run(100));
  });
});
