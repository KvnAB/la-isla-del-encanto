import { availableRecipes, DEFAULT_CONFIG, ITEM_META, type GameEvent, type ItemId, type StartItem } from '@draycol/core';
import { getScores, postScore } from './api';
import { GameAudio } from './audio';
import { InputController } from './game/input';
import { FixedLoop } from './game/loop';
import { Session } from './game/session';
import { Renderer, snapshot, type PrevSnapshot } from './render/renderer';
import { DeathScreen } from './ui/death-screen';
import { Hud } from './ui/hud';
import { preloadItemIcons } from './ui/icons';
import { StartScreen } from './ui/start-screen';

type Screen = 'start' | 'playing' | 'dead';

interface Running {
  session: Session;
  renderer: Renderer;
  hud: Hud;
  input: InputController;
  loop: FixedLoop;
  gameLayer: HTMLElement;
}

/** Máquina de pantallas: inicio → partida → muerte → inicio. */
export class App {
  private screen: Screen = 'start';
  private running: Running | null = null;
  private readonly startScreen: StartScreen;
  private readonly deathScreen: DeathScreen;
  readonly audio = new GameAudio();
  /** Última partida: nombre y objeto inicial, para "Jugar otra vez". */
  private lastPlay: { name: string; startItem: StartItem } | null = null;

  constructor(private readonly root: HTMLElement) {
    this.startScreen = new StartScreen(root, (opts) => void this.play(opts.name, opts.startItem), () => getScores(20));
    this.deathScreen = new DeathScreen(
      root,
      () => void this.backToStart(),
      () => void this.playAgain(),
      (s) => postScore(s),
    );
  }

  async start(): Promise<void> {
    // El audio solo puede arrancar tras un gesto del usuario; M silencia.
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', (e) => {
      unlock();
      if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) this.audio.setMuted(!this.audio.muted);
      // Solo en desarrollo: H muestra los círculos de colisión para ajustar `resources.collision`.
      if (import.meta.env.DEV && e.code === 'KeyH' && this.running) this.running.renderer.showHitboxes = !this.running.renderer.showHitboxes;
    });
    await preloadItemIcons(Object.keys(ITEM_META) as ItemId[]);
    await this.startScreen.show();
    this.screen = 'start';
  }

  private async play(name: string, startItem: StartItem): Promise<void> {
    if (this.screen === 'playing') return;
    this.startScreen.hide();
    this.screen = 'playing';
    this.lastPlay = { name, startItem };

    const gameLayer = document.createElement('div');
    gameLayer.className = 'game-layer';
    this.root.appendChild(gameLayer);

    const session = new Session({ name, startItem });
    const renderer = new Renderer(gameLayer, DEFAULT_CONFIG);
    renderer.localPlayerId = session.playerId;
    await renderer.init(session.world.getState().map);

    const hud = new Hud(
      gameLayer,
      DEFAULT_CONFIG,
      (id) => session.world.enqueue({ playerId: session.playerId, type: 'craft', recipeId: id }),
      (i) => {
        session.world.enqueue({ playerId: session.playerId, type: 'selectSlot', slot: i });
        // Clic en el slot del abrigo: se pone o se quita directamente.
        const item = session.world.player(session.playerId).inventory[i]?.item;
        if (item && ITEM_META[item].equippable) session.world.enqueue({ playerId: session.playerId, type: 'useSlot' });
      },
    );

    const input = new InputController(renderer.app.canvas, {
      getPlayerId: () => session.playerId,
      getSelectedSlot: () => session.world.player(session.playerId).selectedSlot,
      slotCount: DEFAULT_CONFIG.player.inventorySlots,
      aimAngle: (mx, my) => {
        const p = session.world.player(session.playerId);
        return renderer.toWorldAngle(p.x, p.y, mx, my);
      },
    });
    input.attach();

    let prev: PrevSnapshot | null = null;
    let died: GameEvent | null = null;
    const loop = new FixedLoop(
      DEFAULT_CONFIG.stepSeconds,
      () => {
        if (died) return;
        prev = snapshot(session.world.getState());
        const cmds = input.drain();
        if (input.takeClick() || input.primaryDown) cmds.push(session.primaryAction());
        const events = session.step(cmds);
        renderer.onEvents(events, session.playerId);
        this.audio.onEvents(events, session.playerId);
        hud.onEvents(events);
        const p = session.world.player(session.playerId);
        hud.update(p, session.world.getState(), availableRecipes(p.inventory, DEFAULT_CONFIG));
        this.audio.tick(DEFAULT_CONFIG.stepSeconds, p.health, DEFAULT_CONFIG.vitals.lowHealth);
        renderer.fx?.setLowHealth(p.alive && p.health < DEFAULT_CONFIG.vitals.lowHealth);
        const dead = events.find((e) => e.type === 'playerDied' && e.playerId === session.playerId);
        if (dead) {
          died = dead;
          setTimeout(() => void this.onDeath(name, dead), 900);
        }
      },
      (alpha) => renderer.render(session.world.getState(), alpha, prev),
    );
    this.running = { session, renderer, hud, input, loop, gameLayer };
    loop.start();
    if (import.meta.env.DEV) (window as unknown as { __dbg: unknown }).__dbg = this.running;
  }

  private async onDeath(name: string, e: GameEvent): Promise<void> {
    if (e.type !== 'playerDied' || !this.running) return;
    const { days, points, cause } = e;
    this.teardown();
    this.screen = 'dead';
    await this.deathScreen.show({ name, days, points, cause });
  }

  private teardown(): void {
    const r = this.running;
    if (!r) return;
    r.loop.stop();
    r.input.detach();
    r.hud.destroy();
    r.renderer.destroy();
    r.gameLayer.remove();
    this.running = null;
  }

  /** Desde la pantalla de muerte: misma persona, mismo objeto inicial, isla nueva. */
  private async playAgain(): Promise<void> {
    const last = this.lastPlay;
    if (!last) return this.backToStart();
    this.deathScreen.hide();
    this.teardown();
    this.screen = 'start';
    await this.play(last.name, last.startItem);
  }

  private async backToStart(): Promise<void> {
    this.deathScreen.hide();
    this.teardown();
    this.screen = 'start';
    await this.startScreen.show();
  }
}
