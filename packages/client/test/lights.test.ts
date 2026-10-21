import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, World } from '@draycol/core';
import { lightsFor } from '../src/render/lights';

function setup() {
  const w = new World(1);
  const id = w.addPlayer('Ana', 'wood_pickaxe');
  const s = w.getState();
  s.campfires.length = 0;
  return { w, id, s, p: w.player(id) };
}

describe('lightsFor', () => {
  it('el jugador sin antorcha tiene una luz fría de 150 px en su posición', () => {
    const { s, id, p } = setup();
    expect(lightsFor(s, DEFAULT_CONFIG, id)).toEqual([{ x: p.x, y: p.y, r: 150, warm: false }]);
  });

  it('con antorcha en cualquier slot la luz es cálida y de 380 px', () => {
    const { s, id, p } = setup();
    p.inventory[5] = { item: 'torch', count: 1 };
    p.selectedSlot = 0;
    expect(lightsFor(s, DEFAULT_CONFIG, id)).toEqual([{ x: p.x, y: p.y, r: 380, warm: true }]);
  });

  it('cada fogata es una luz cálida de 220 px', () => {
    const { s, id, p } = setup();
    s.campfires.push({ id: 99, x: 100, y: 200, expiresAt: 999 });
    const lights = lightsFor(s, DEFAULT_CONFIG, id);
    expect(lights).toContainEqual({ x: 100, y: 200, r: 220, warm: true });
    expect(lights).toContainEqual({ x: p.x, y: p.y, r: 150, warm: false });
  });

  it('el jugador muerto no da luz', () => {
    const { s, id, p } = setup();
    p.alive = false;
    expect(lightsFor(s, DEFAULT_CONFIG, id)).toEqual([]);
  });
});
