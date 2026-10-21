import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa canvas 2D: Text mide con él; sin contexto no dibuja y no hace falta
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

import { FLOAT_SECONDS, FloatingNumbers } from '../src/render/floating';

describe('FloatingNumbers', () => {
  it('un número sube y se desvanece, y desaparece al acabar', () => {
    const f = new FloatingNumbers();
    f.spawn(100, 200, '-4', 0xffffff);
    expect(f.children).toHaveLength(1);
    const t = f.children[0];
    const y0 = t.y;
    f.update(FLOAT_SECONDS / 2);
    expect(t.y).toBeLessThan(y0);
    expect(t.alpha).toBeLessThan(1);
    expect(t.alpha).toBeGreaterThan(0);
    f.update(FLOAT_SECONDS);
    expect(f.children).toHaveLength(0);
  });

  it('varios números a la vez se gestionan por separado', () => {
    const f = new FloatingNumbers();
    f.spawn(0, 0, '-1', 0xffffff);
    f.update(FLOAT_SECONDS * 0.8);
    f.spawn(0, 0, '-2', 0xff5a4a);
    expect(f.children).toHaveLength(2);
    f.update(FLOAT_SECONDS * 0.3);
    expect(f.children).toHaveLength(1);
  });
});
