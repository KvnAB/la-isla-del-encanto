export interface LoopTimers {
  raf: (cb: FrameRequestCallback) => number;
  caf: (id: number) => void;
}

/**
 * Bucle de paso fijo: acumula tiempo real, ejecuta `onStep` las veces necesarias
 * y llama a `onRender(alpha)` con la fracción del paso pendiente para interpolar.
 */
export class FixedLoop {
  private acc = 0;
  private last: number | null = null;
  private rafId = 0;
  private running = false;
  private readonly timers: LoopTimers;

  constructor(
    private readonly stepSeconds: number,
    private readonly onStep: () => void,
    private readonly onRender: (alpha: number) => void,
    private readonly maxFrameSeconds = 0.25,
    timers?: LoopTimers,
  ) {
    this.timers = timers ?? {
      raf: (cb) => requestAnimationFrame(cb),
      caf: (id) => cancelAnimationFrame(id),
    };
  }

  frame(nowMs: number): void {
    if (this.last === null) {
      this.last = nowMs;
      this.onRender(0);
      return;
    }
    let dt = (nowMs - this.last) / 1000;
    this.last = nowMs;
    if (dt > this.maxFrameSeconds) dt = this.maxFrameSeconds;
    if (dt < 0) dt = 0;
    this.acc += dt;
    while (this.acc >= this.stepSeconds) {
      this.onStep();
      this.acc -= this.stepSeconds;
    }
    this.onRender(this.acc / this.stepSeconds);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = null;
    const tick: FrameRequestCallback = (t) => {
      if (!this.running) return;
      this.frame(t);
      this.rafId = this.timers.raf(tick);
    };
    this.rafId = this.timers.raf(tick);
  }

  stop(): void {
    this.running = false;
    this.timers.caf(this.rafId);
  }
}
