import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type CreatureKind } from '@draycol/core';

// jsdom no implementa canvas 2D; pixi lo toca al cargar, así que el stub va antes de los imports (hoisted)
vi.hoisted(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
});

import { makeCreatureVector } from '../src/render/sprites/vector-creatures';

describe('sprites de criaturas', () => {
  it('toda criatura de la configuración tiene dibujo', () => {
    for (const kind of Object.keys(DEFAULT_CONFIG.creatures.defs) as CreatureKind[]) {
      const c = makeCreatureVector(kind, DEFAULT_CONFIG.creatures.defs[kind].radius);
      expect(c.children.length, kind).toBeGreaterThan(0);
    }
  });

  it('el puma domado lleva collar (un dibujo más que el salvaje)', () => {
    const wild = makeCreatureVector('puma', 28, false);
    const tamed = makeCreatureVector('puma', 28, true);
    expect(tamed.children.length).toBe(wild.children.length + 1);
  });
});
