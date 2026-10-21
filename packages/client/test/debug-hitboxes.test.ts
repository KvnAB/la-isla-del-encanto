import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, World } from '@draycol/core';
import { hitboxCircles } from '../src/render/debug';

describe('hitboxCircles', () => {
  it('devuelve el círculo de colisión (no el dibujado) de cada recurso, y los de criaturas y jugadores', () => {
    const world = new World();
    const id = world.addPlayer('yo', 'wood_sword');
    const state = world.getState();
    const circles = hitboxCircles(state, DEFAULT_CONFIG);
    const tree = state.resources.find((r) => r.kind === 'tree' && r.size === 'large')!;
    expect(circles).toContainEqual({ x: tree.x, y: tree.y, r: tree.radius * 0.75, visual: tree.radius, kind: 'resource' });
    const c = state.creatures[0];
    expect(circles).toContainEqual({ x: c.x, y: c.y, r: c.radius, visual: c.radius, kind: 'creature' });
    const p = world.player(id);
    expect(circles).toContainEqual({ x: p.x, y: p.y, r: p.radius, visual: p.radius, kind: 'player' });
    expect(circles).toHaveLength(state.resources.length + state.creatures.length + 1);
  });
});
