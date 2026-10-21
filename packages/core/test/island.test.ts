import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config.js';
import { biomeAt, findLandSpot, generateIsland, isGround, isWalkable, terrainAt } from '../src/island.js';
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
    expect(map.cols).toBe(112);
    expect(map.rows).toBe(112);
    expect(map.cells.length).toBe(112 * 112);
    expect(map.width).toBe(4500);
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
    expect(terrainAt(map, 7000, 100)).toBe('sea');
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
  it('devuelve un punto en terreno firme, lejos del punto indicado', () => {
    const map = gen(1);
    const rng = new Rng(5);
    for (let i = 0; i < 20; i++) {
      const p = findLandSpot(map, rng, { x: map.spawnX, y: map.spawnY, d: 600 });
      expect(['land', 'sand', 'snow']).toContain(terrainAt(map, p.x, p.y));
      expect(Math.hypot(p.x - map.spawnX, p.y - map.spawnY)).toBeGreaterThanOrEqual(600);
    }
  });
});

describe('bioma', () => {
  it('isGround acepta tierra, arena y nieve; biomeAt distingue nieve de hierba', () => {
    expect(isGround('land')).toBe(true);
    expect(isGround('sand')).toBe(true);
    expect(isGround('snow')).toBe(true);
    expect(isGround('water')).toBe(false);
    expect(isGround('sea')).toBe(false);
    const map = gen(1);
    expect(biomeAt(map, map.spawnX, map.spawnY)).toBe('grass');
  });

  it('findLandSpot con bioma grass nunca devuelve nieve', () => {
    const map = gen(1);
    const rng = new Rng(9);
    for (let i = 0; i < 20; i++) {
      const p = findLandSpot(map, rng, undefined, 'grass');
      expect(['land', 'sand']).toContain(terrainAt(map, p.x, p.y));
    }
  });
});

describe('nieve', () => {
  const map = gen(1);

  it('hay nieve y toda está en la mitad norte', () => {
    let n = 0;
    for (let r = 0; r < map.rows; r++)
      for (let c = 0; c < map.cols; c++)
        if (map.cells[r * map.cols + c] === 'snow') {
          n++;
          expect(r).toBeLessThan(map.rows * 0.5);
        }
    expect(n).toBeGreaterThan(200);
    // y es una parte sustancial, pero no la mayoría, de lo caminable
    const ratio = n / walkableCount(map);
    expect(ratio).toBeGreaterThan(0.12);
    expect(ratio).toBeLessThan(0.45);
  });

  it('el spawn no está en nieve y la isla fija tampoco', () => {
    expect(terrainAt(map, map.spawnX, map.spawnY)).toBe('land');
    const fixed = generateIsland(new Rng(DEFAULT_CONFIG.island.seed), DEFAULT_CONFIG);
    expect(terrainAt(fixed, fixed.spawnX, fixed.spawnY)).toBe('land');
    expect(fixed.cells.includes('snow')).toBe(true);
  });

  it('findLandSpot con bioma snow devuelve nieve y con grass nunca', () => {
    const rng = new Rng(4);
    for (let i = 0; i < 20; i++) {
      expect(terrainAt(map, ...xy(findLandSpot(map, rng, undefined, 'snow')))).toBe('snow');
      expect(terrainAt(map, ...xy(findLandSpot(map, rng, undefined, 'grass')))).not.toBe('snow');
    }
  });
});

function xy(p: { x: number; y: number }): [number, number] {
  return [p.x, p.y];
}
