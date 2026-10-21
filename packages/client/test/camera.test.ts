import { describe, expect, it } from 'vitest';
import { Camera, DEFAULT_ZOOM } from '../src/render/camera';

describe('Camera', () => {
  it('arranca con el zoom por defecto, más cerca que 1:1', () => {
    const c = new Camera();
    expect(DEFAULT_ZOOM).toBeGreaterThan(1);
    expect(c.zoom).toBe(DEFAULT_ZOOM);
  });

  it('con zoom, el centro de la pantalla sigue siendo el punto seguido y el área visible se reduce', () => {
    const c = new Camera();
    c.zoom = 2;
    c.follow(1000, 500);
    expect(c.toWorld(640, 400, 1280, 800)).toEqual([1000, 500]);
    expect(c.toWorld(1280, 400, 1280, 800)).toEqual([1000 + 320, 500]);
    const b = c.visibleBounds(1280, 800);
    expect(b.right - b.left).toBe(640);
    expect(b.bottom - b.top).toBe(400);
  });
});
