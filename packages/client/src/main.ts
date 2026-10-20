import './styles.css';
import { DEFAULT_CONFIG } from '@draycol/core';
import { InputController } from './game/input';
import { FixedLoop } from './game/loop';
import { Session } from './game/session';
import { Renderer, snapshot, type PrevSnapshot } from './render/renderer';

// Arranque temporal (Tarea 14): partida directa para verificar terreno y cámara.
async function main(): Promise<void> {
  const root = document.getElementById('app')!;
  const session = new Session({ name: 'Prueba', startItem: 'wood_pickaxe', seed: 1 });
  const renderer = new Renderer(root, DEFAULT_CONFIG);
  await renderer.init(session.world.getState().map);
  if (import.meta.env.DEV) {
    const p = session.world.player(session.playerId);
    p.inventory[1] = { item: 'campfire', count: 3 };
    p.inventory[2] = { item: 'wood_sword', count: 1 };
    p.inventory[3] = { item: 'apple', count: 4 };
  }

  const input = new InputController(renderer.app.canvas, {
    getPlayerId: () => session.playerId,
    getSelectedSlot: () => session.world.player(session.playerId).selectedSlot,
    aimAngle: (mx, my) => {
      const p = session.world.player(session.playerId);
      return renderer.toWorldAngle(p.x, p.y, mx, my);
    },
  });
  input.attach();

  let prev: PrevSnapshot | null = null;
  const loop = new FixedLoop(
    DEFAULT_CONFIG.stepSeconds,
    () => {
      prev = snapshot(session.world.getState());
      const cmds = input.drain();
      if (input.primaryDown) cmds.push(session.primaryAction());
      session.step(cmds);
    },
    (alpha) => renderer.render(session.world.getState(), alpha, prev),
  );
  loop.start();
  if (import.meta.env.DEV) (window as unknown as { __dbg: unknown }).__dbg = { session, renderer, loop };
}

void main();
