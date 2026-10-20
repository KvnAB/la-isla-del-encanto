import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { findLandSpot, generateIsland, isWalkable, terrainAt } from '../src/island.js';
import { Rng } from '../src/rng.js';
import type { IslandMap } from '../src/types.js';

function gen(seed: number): IslandMap {
  return generateIsland(new Rng(seed), DEFAULT_CONFIG);
}

function walkableCount(map: IslandMap): number {
  return map.cells.filter(isWalkable).length;
}

function floodReach(map: IslandMap): number {
  const { cols, rows } = map;
  const sc = Math.floor(map.spawnX / map.cellSize);
  const sr = Math.floor(map.spawnY / map.cellSize);
  const seen = new Uint8Array(cols * rows);
  const stack = [sr * cols + sc];
  seen[stack[0]] = 1;
  let n = 0;
  while (stack.length) {
    const i = stack.pop()!;
    n++;
    const c = i % cols;
    const r = (i - c) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const j = nr * cols + nc;
      if (seen[j] || !isWalkable(map.cells[j])) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  return n;
}

describe('generateIsland', () => {
  const map = gen(1);

  it('tiene la rejilla esperada', () => {
    expect(map.cols).toBe(75);
    expect(map.rows).toBe(75);
    expect(map.cells.length).toBe(5625);
    expect(map.width).toBe(3000);
    expect(map.cellSize).toBe(40);
  });

  it('el borde exterior es mar', () => {
    const { cols, rows, cells } = map;
    for (let c = 0; c < cols; c++) {
      expect(cells[c]).toBe('sea');
      expect(cells[(rows - 1) * cols + c]).toBe('sea');
    }
    for (let r = 0; r < rows; r++) {
      expect(cells[r * cols]).toBe('sea');
      expect(cells[r * cols + cols - 1]).toBe('sea');
    }
  });

  it('entre 35% y 70% de las celdas son caminables', () => {
    const ratio = walkableCount(map) / map.cells.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.7);
  });

  it('tiene agua interior y arena', () => {
    expect(map.cells.some((t) => t === 'water')).toBe(true);
    expect(map.cells.some((t) => t === 'sand')).toBe(true);
  });

  it('el spawn está en tierra', () => {
    expect(terrainAt(map, map.spawnX, map.spawnY)).toBe('land');
  });

  it('fuera del mapa es mar', () => {
    expect(terrainAt(map, -10, -10)).toBe('sea');
    expect(terrainAt(map, 5000, 100)).toBe('sea');
  });

  it('es determinista por semilla', () => {
    expect(gen(1).cells).toEqual(map.cells);
    expect(gen(2).cells).not.toEqual(map.cells);
  });

  it('casi todo lo caminable está conectado con el spawn', () => {
    expect(floodReach(map) / walkableCount(map)).toBeGreaterThanOrEqual(0.9);
  });

  it('funciona para varias semillas', () => {
    for (const s of [3, 17, 99, 12345]) {
      const m = gen(s);
      expect(terrainAt(m, m.spawnX, m.spawnY)).toBe('land');
      const ratio = walkableCount(m) / m.cells.length;
      expect(ratio).toBeGreaterThan(0.35);
      expect(ratio).toBeLessThan(0.7);
      expect(m.cells.some((t) => t === 'water')).toBe(true);
    }
  });
});

describe('findLandSpot', () => {
  it('devuelve un punto en tierra o arena, lejos del punto indicado', () => {
    const map = gen(1);
    const rng = new Rng(5);
    for (let i = 0; i < 20; i++) {
      const p = findLandSpot(map, rng, { x: map.spawnX, y: map.spawnY, d: 600 });
      expect(['land', 'sand']).toContain(terrainAt(map, p.x, p.y));
      expect(Math.hypot(p.x - map.spawnX, p.y - map.spawnY)).toBeGreaterThanOrEqual(600);
    }
  });
});
