import './styles.css';
import { availableRecipes, DEFAULT_CONFIG, ITEM_META, type ItemId } from '@draycol/core';
import { Hud } from './ui/hud';
import { preloadItemIcons } from './ui/icons';
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
  await preloadItemIcons(Object.keys(ITEM_META) as ItemId[]);
  const hud = new Hud(
    root,
    DEFAULT_CONFIG,
    (id) => session.world.enqueue({ playerId: session.playerId, type: 'craft', recipeId: id }),
    (i) => session.world.enqueue({ playerId: session.playerId, type: 'selectSlot', slot: i }),
  );
  if (import.meta.env.DEV) {
    const p = session.world.player(session.playerId);
    p.inventory[1] = { item: 'campfire', count: 3 };
    p.inventory[2] = { item: 'wood_sword', count: 1 };
    p.inventory[3] = { item: 'apple', count: 4 };
    p.inventory[4] = { item: 'wood', count: 47 };
    p.inventory[5] = { item: 'stone', count: 12 };
    p.hunger = 58;
    p.thirst = 42;
    p.health = 80;
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
      const events = session.step(cmds);
      renderer.onEvents(events, session.playerId);
      const p = session.world.player(session.playerId);
      hud.update(p, session.world.getState(), availableRecipes(p.inventory, DEFAULT_CONFIG));
    },
    (alpha) => renderer.render(session.world.getState(), alpha, prev),
  );
  loop.start();
  if (import.meta.env.DEV) (window as unknown as { __dbg: unknown }).__dbg = { session, renderer, loop };
}

void main();
