import { describe, expect, it } from 'vitest';
import { FixedLoop } from '../src/game/loop';

describe('FixedLoop', () => {
  it('ejecuta un paso por cada 1/30 s acumulado y renderiza una vez por frame', () => {
    let steps = 0;
    let renders = 0;
    let lastAlpha = -1;
    const loop = new FixedLoop(
      1 / 30,
      () => steps++,
      (alpha) => {
        renders++;
        lastAlpha = alpha;
      },
    );
    loop.frame(0);
    loop.frame(100);
    expect(steps).toBe(3);
    expect(renders).toBe(2);
    expect(lastAlpha).toBeCloseTo(0, 1);
  });

  it('el primer frame no ejecuta pasos', () => {
    let steps = 0;
    const loop = new FixedLoop(1 / 30, () => steps++, () => {});
    loop.frame(5000);
    expect(steps).toBe(0);
  });

  it('limita el tiempo por frame a 0.25 s para no congelar la pestaña al volver', () => {
    let steps = 0;
    const loop = new FixedLoop(1 / 30, () => steps++, () => {});
    loop.frame(0);
    loop.frame(120_000);
    expect(steps).toBeLessThanOrEqual(8);
    expect(steps).toBeGreaterThanOrEqual(7);
  });

  it('alpha es la fracción del paso pendiente', () => {
    let alpha = 0;
    const loop = new FixedLoop(1 / 30, () => {}, (a) => (alpha = a));
    loop.frame(0);
    loop.frame(1000 / 30 / 2);
    expect(alpha).toBeCloseTo(0.5, 1);
  });

  it('start y stop usan requestAnimationFrame', () => {
    const calls: FrameRequestCallback[] = [];
    const raf = (cb: FrameRequestCallback) => {
      calls.push(cb);
      return calls.length;
    };
    let cancelled = -1;
    const loop = new FixedLoop(1 / 30, () => {}, () => {}, 0.25, { raf, caf: (id) => (cancelled = id) });
    loop.start();
    expect(calls).toHaveLength(1);
    calls[0](16);
    expect(calls).toHaveLength(2);
    loop.stop();
    expect(cancelled).toBe(2);
    calls[1](32);
    expect(calls).toHaveLength(2);
  });
});
