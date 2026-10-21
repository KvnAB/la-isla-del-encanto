import type { GameConfig } from './config.js';
import type { Rng } from './rng.js';
import type { Biome, IslandMap, Terrain } from './types.js';

export function isWalkable(t: Terrain): boolean {
  return t !== 'sea';
}

/** Terreno firme (sin nadar): tierra, arena o nieve. Donde pueden estar recursos y criaturas. */
export function isGround(t: Terrain): boolean {
  return t === 'land' || t === 'sand' || t === 'snow';
}

export function biomeAt(map: IslandMap, x: number, y: number): Biome {
  return terrainAt(map, x, y) === 'snow' ? 'snow' : 'grass';
}

export function terrainAt(map: IslandMap, x: number, y: number): Terrain {
  const c = Math.floor(x / map.cellSize);
  const r = Math.floor(y / map.cellSize);
  if (c < 0 || r < 0 || c >= map.cols || r >= map.rows) return 'sea';
  return map.cells[r * map.cols + c];
}

/** Ruido de valor 2D con interpolación suave, rejilla de valores aleatorios de `size`×`size`. */
class ValueNoise {
  private readonly grid: Float32Array;
  constructor(private readonly size: number, rng: Rng) {
    this.grid = new Float32Array(size * size);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = rng.next();
  }
  private at(ix: number, iy: number): number {
    const s = this.size;
    return this.grid[((iy % s) + s) % s * s + (((ix % s) + s) % s)];
  }
  /** u,v en unidades de rejilla. */
  sample(u: number, v: number): number {
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const fx = u - x0;
    const fy = v - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = this.at(x0, y0);
    const b = this.at(x0 + 1, y0);
    const c = this.at(x0, y0 + 1);
    const d = this.at(x0 + 1, y0 + 1);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
}

function fbm(noises: ValueNoise[], u: number, v: number): number {
  let sum = 0;
  let amp = 1;
  let total = 0;
  let freq = 1;
  for (const n of noises) {
    sum += n.sample(u * freq, v * freq) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / total;
}

export function generateIsland(rng: Rng, cfg: GameConfig): IslandMap {
  const { width, height, cellSize } = cfg.island;
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  const cells: Terrain[] = new Array(cols * rows).fill('sea');
  const idx = (c: number, r: number) => r * cols + c;
  const inBounds = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows;

  // 1) Forma de la isla: ruido + caída radial.
  const landNoise = [new ValueNoise(6, rng), new ValueNoise(12, rng), new ValueNoise(24, rng)];
  const cx = cols / 2;
  const cy = rows / 2;
  const R = Math.min(cols, rows) / 2;
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const dx = (c + 0.5 - cx) / R;
      const dy = (r + 0.5 - cy) / R;
      const d2 = dx * dx + dy * dy;
      const n = fbm(landNoise, (c / cols) * 5, (r / rows) * 5);
      const h = n * 0.7 + 0.58 - d2 * 0.62;
      cells[idx(c, r)] = h > 0.5 ? 'land' : 'sea';
    }
  }

  // 2) Lagos: ruido independiente con umbral alto, solo sobre tierra lejos del borde.
  const lakeNoise = [new ValueNoise(8, rng), new ValueNoise(16, rng)];
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      if (cells[idx(c, r)] !== 'land') continue;
      const n = fbm(lakeNoise, (c / cols) * 4, (r / rows) * 4);
      if (n > 0.66) cells[idx(c, r)] = 'water';
    }
  }

  // 3) Conectividad: conservar solo la masa de tierra conectada más grande (incluye agua interior).
  const comp = new Int32Array(cols * rows).fill(-1);
  let bestComp = -1;
  let bestSize = 0;
  let compCount = 0;
  for (let i = 0; i < cells.length; i++) {
    if (comp[i] !== -1 || !isWalkable(cells[i])) continue;
    const id = compCount++;
    let size = 0;
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const j = stack.pop()!;
      size++;
      const c = j % cols;
      const r = (j - c) / cols;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nc = c + dc;
        const nr = r + dr;
        if (!inBounds(nc, nr)) continue;
        const k = idx(nc, nr);
        if (comp[k] !== -1 || !isWalkable(cells[k])) continue;
        comp[k] = id;
        stack.push(k);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestComp = id;
    }
  }
  for (let i = 0; i < cells.length; i++) if (isWalkable(cells[i]) && comp[i] !== bestComp) cells[i] = 'sea';

  // 4) Garantizar al menos un lago: si no hay agua, abrir uno circular cerca del centro.
  if (!cells.some((t) => t === 'water')) {
    const lc = Math.floor(cx + R * 0.3);
    const lr = Math.floor(cy);
    for (let r = lr - 3; r <= lr + 3; r++)
      for (let c = lc - 4; c <= lc + 4; c++)
        if (inBounds(c, r) && cells[idx(c, r)] === 'land' && (c - lc) ** 2 / 16 + (r - lr) ** 2 / 9 <= 1) cells[idx(c, r)] = 'water';
  }

  // 5) Río: desde una celda de lago, camino sesgado hacia el mar más cercano, ancho 2.
  const lakeCells: number[] = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === 'water') lakeCells.push(i);
  if (lakeCells.length) {
    const start = lakeCells[Math.floor(rng.next() * lakeCells.length)];
    let c = start % cols;
    let r = (start - c) / cols;
    // dirección hacia el mar: alejarse del centro
    let dirX = c + 0.5 - cx;
    let dirY = r + 0.5 - cy;
    const dl = Math.hypot(dirX, dirY) || 1;
    dirX /= dl;
    dirY /= dl;
    let fx = c + 0.5;
    let fy = r + 0.5;
    for (let steps = 0; steps < cols * 2; steps++) {
      const wobble = (rng.next() - 0.5) * 0.8;
      const ax = dirX - dirY * wobble;
      const ay = dirY + dirX * wobble;
      const al = Math.hypot(ax, ay) || 1;
      fx += ax / al;
      fy += ay / al;
      c = Math.floor(fx);
      r = Math.floor(fy);
      if (!inBounds(c, r) || cells[idx(c, r)] === 'sea') break;
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1]] as const) {
        const nc = c + dc;
        const nr = r + dr;
        if (inBounds(nc, nr) && cells[idx(nc, nr)] === 'land') cells[idx(nc, nr)] = 'water';
      }
    }
  }

  // 6) Arena: tierra adyacente a mar o agua.
  const sandMask = new Uint8Array(cells.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[idx(c, r)] !== 'land') continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nc = c + dc;
        const nr = r + dr;
        if (!inBounds(nc, nr)) continue;
        const t = cells[idx(nc, nr)];
        if (t === 'sea' || t === 'water') {
          sandMask[idx(c, r)] = 1;
          break;
        }
      }
    }
  }
  for (let i = 0; i < cells.length; i++) if (sandMask[i]) cells[i] = 'sand';

  // 6b) Nieve: el tercio norte, con borde irregular por ruido. Cubre tierra y arena (no el agua).
  const snowNoise = [new ValueNoise(8, rng), new ValueNoise(16, rng)];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = cells[idx(c, r)];
      if (t !== 'land' && t !== 'sand') continue;
      const n = fbm(snowNoise, (c / cols) * 4, (r / rows) * 4);
      if (r < rows * 0.34 + (n - 0.5) * rows * 0.14) cells[idx(c, r)] = 'snow';
    }
  }

  // 7) Spawn: celda de tierra más cercana al centro a ≥ 3 celdas de agua/mar.
  const safe = (c: number, r: number): boolean => {
    if (cells[idx(c, r)] !== 'land') return false;
    for (let dr = -3; dr <= 3; dr++)
      for (let dc = -3; dc <= 3; dc++) {
        const nc = c + dc;
        const nr = r + dr;
        if (!inBounds(nc, nr)) return false;
        const t = cells[idx(nc, nr)];
        if (t === 'sea' || t === 'water') return false;
      }
    return true;
  };
  let spawnC = Math.floor(cx);
  let spawnR = Math.floor(cy);
  let bestD = Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = (c - cx) ** 2 + (r - cy) ** 2;
      if (d < bestD && safe(c, r)) {
        bestD = d;
        spawnC = c;
        spawnR = r;
      }
    }
  }
  if (bestD === Infinity) {
    // Sin celda segura: la de tierra más cercana al centro.
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const d = (c - cx) ** 2 + (r - cy) ** 2;
        if (d < bestD && cells[idx(c, r)] === 'land') {
          bestD = d;
          spawnC = c;
          spawnR = r;
        }
      }
  }

  return {
    width,
    height,
    cellSize,
    cols,
    rows,
    cells,
    spawnX: (spawnC + 0.5) * cellSize,
    spawnY: (spawnR + 0.5) * cellSize,
  };
}

/** Punto aleatorio en terreno firme (y del bioma pedido, si se indica); opcionalmente a ≥ d de un punto dado. Lanza si no encuentra. */
export function findLandSpot(map: IslandMap, rng: Rng, minDistFrom?: { x: number; y: number; d: number }, biome?: Biome): { x: number; y: number } {
  // Un bioma que no existe en el mapa (p. ej. nieve en una isla sin nieve) no restringe nada.
  const want = biome === 'snow' && !map.cells.includes('snow') ? undefined : biome;
  for (let i = 0; i < 2000; i++) {
    const x = rng.next() * map.width;
    const y = rng.next() * map.height;
    const t = terrainAt(map, x, y);
    if (!isGround(t)) continue;
    if (want && biomeAt(map, x, y) !== want) continue;
    if (minDistFrom && Math.hypot(x - minDistFrom.x, y - minDistFrom.y) < minDistFrom.d) continue;
    return { x, y };
  }
  throw new Error('findLandSpot: no se encontró un punto en tierra');
}
