import './styles.css';
import { DEFAULT_CONFIG, type WorldState } from '@draycol/core';
import { InputController } from './game/input';
import { FixedLoop } from './game/loop';
import { Session } from './game/session';
import { Renderer } from './render/renderer';

// Arranque temporal (Tarea 14): partida directa para verificar terreno y cámara.
async function main(): Promise<void> {
  const root = document.getElementById('app')!;
  const session = new Session({ name: 'Prueba', startItem: 'wood_pickaxe', seed: 1 });
  const renderer = new Renderer(root);
  await renderer.init(session.world.getState().map);

  const input = new InputController(renderer.app.canvas, {
    getPlayerId: () => session.playerId,
    getSelectedSlot: () => session.world.player(session.playerId).selectedSlot,
    aimAngle: (mx, my) => {
      const p = session.world.player(session.playerId);
      return renderer.toWorldAngle(p.x, p.y, mx, my);
    },
  });
  input.attach();

  let prev: WorldState | null = null;
  const loop = new FixedLoop(
    DEFAULT_CONFIG.stepSeconds,
    () => {
      prev = JSON.parse(JSON.stringify(session.world.getState())) as WorldState;
      const cmds = input.drain();
      if (input.primaryDown) cmds.push(session.primaryAction());
      session.step(cmds);
    },
    (alpha) => renderer.render(session.world.getState(), alpha, prev),
  );
  loop.start();
}

void main();
