import type { Command } from '@draycol/core';

type CommandBody = Command extends infer C ? (C extends { playerId: number } ? Omit<C, 'playerId'> : never) : never;

export interface InputOptions {
  getPlayerId: () => number;
  getSelectedSlot: () => number;
  /** Número de slots del inventario (para la rueda). */
  slotCount: number;
  /** Ángulo de apuntado a partir de la posición del ratón relativa al elemento. */
  aimAngle: (mouseX: number, mouseY: number) => number;
}

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** Teclas de la fila numérica → índice de slot: 1..9, 0, -, = (12 slots). */
export const SLOT_KEYS: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
  Minus: 10,
  Equal: 11,
};

/** Etiqueta de la tecla que selecciona cada slot. */
export const SLOT_KEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

/** Convierte teclado y ratón en comandos del núcleo. No toca el mundo. */
export class InputController {
  private readonly down = new Set<string>();
  private pending: Command[] = [];
  private lastMove: [number, number] = [0, 0];
  private lastAim: number | null = null;
  private attached = false;
  private _primaryDown = false;
  private clicked = false;

  constructor(
    private readonly target: HTMLElement,
    private readonly opts: InputOptions,
  ) {}

  get primaryDown(): boolean {
    return this._primaryDown;
  }

  /** True una sola vez por clic (mousedown) desde la última llamada: registra clics más cortos que un paso. */
  takeClick(): boolean {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code in MOVE_KEYS) {
      this.down.add(e.code);
      this.emitMove();
      e.preventDefault();
      return;
    }
    const slot = SLOT_KEYS[e.code];
    if (slot !== undefined && slot < this.opts.slotCount) {
      this.push({ type: 'selectSlot', slot });
      return;
    }
    if (e.code === 'KeyQ') this.push({ type: 'dropSlot', slot: this.opts.getSelectedSlot() });
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (e.code in MOVE_KEYS) {
      this.down.delete(e.code);
      this.emitMove();
    }
  };

  private readonly onBlur = (): void => {
    this.down.clear();
    this._primaryDown = false;
    this.emitMove();
  };

  private readonly onWheel = (e: WheelEvent): void => {
    const dir = e.deltaY > 0 ? 1 : -1;
    const n = this.opts.slotCount;
    this.push({ type: 'selectSlot', slot: (this.opts.getSelectedSlot() + dir + n) % n });
    e.preventDefault();
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    const rect = this.target.getBoundingClientRect();
    const angle = this.opts.aimAngle(e.clientX - rect.left, e.clientY - rect.top);
    if (this.lastAim !== null && Math.abs(angle - this.lastAim) < 0.01) return;
    this.lastAim = angle;
    this.push({ type: 'aim', angle });
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this._primaryDown = true;
      this.clicked = true;
      e.preventDefault();
    }
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this._primaryDown = false;
  };

  private readonly onContextMenu = (e: Event): void => e.preventDefault();

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mouseup', this.onMouseUp);
    this.target.addEventListener('wheel', this.onWheel, { passive: false });
    this.target.addEventListener('mousemove', this.onMouseMove);
    this.target.addEventListener('mousedown', this.onMouseDown);
    this.target.addEventListener('contextmenu', this.onContextMenu);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.target.removeEventListener('wheel', this.onWheel);
    this.target.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    this.target.removeEventListener('contextmenu', this.onContextMenu);
    this.down.clear();
    this._primaryDown = false;
    this.clicked = false;
    this.pending = [];
  }

  /** Devuelve y vacía los comandos acumulados desde la última llamada. */
  drain(): Command[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }

  private push(c: CommandBody): void {
    this.pending.push({ playerId: this.opts.getPlayerId(), ...c } as Command);
  }

  private emitMove(): void {
    let dx = 0;
    let dy = 0;
    for (const code of this.down) {
      const [x, y] = MOVE_KEYS[code];
      dx += x;
      dy += y;
    }
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    if (dx === this.lastMove[0] && dy === this.lastMove[1]) return;
    this.lastMove = [dx, dy];
    this.push({ type: 'move', dx, dy });
  }
}
