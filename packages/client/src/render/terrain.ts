import { Container, Graphics } from 'pixi.js';
import type { IslandMap, Rng, Terrain } from '@draycol/core';
import { PALETTE } from './palette';

/**
 * Dibuja la isla una sola vez. Los bordes se hacen con círculos superpuestos por celda,
 * lo que da costas y lagos orgánicos en lugar de una rejilla.
 */
export function buildTerrain(map: IslandMap, rng: Rng): Container {
  const root = new Container();
  const cs = map.cellSize;
  const at = (c: number, r: number): Terrain => map.cells[r * map.cols + c];
  const center = (c: number, r: number): [number, number] => [(c + 0.5) * cs, (r + 0.5) * cs];
  // Margen de mar: los bounds totales quedan en ≤ 4000 px para que la textura cacheada sea 4096² (64 MB), no 8192²/16384².
  const margin = Math.floor((4000 - Math.max(map.width, map.height)) / 2);

  // Mar de fondo con una banda más clara cerca de la costa.
  const sea = new Graphics();
  sea.rect(-margin, -margin, map.width + margin * 2, map.height + margin * 2).fill(PALETTE.seaDeep);
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'sea' && hasNeighbour(map, c, r, (t) => t !== 'sea', 2)) {
        const [x, y] = center(c, r);
        sea.circle(x, y, cs * 1.1).fill(PALETTE.sea);
      }
  root.addChild(sea);

  // Tierra (incluye arena y agua interior) como manchas redondas → costa orgánica.
  const land = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) !== 'sea') {
        const [x, y] = center(c, r);
        land.circle(x, y, cs * 0.78).fill(PALETTE.grass);
      }
  root.addChild(land);

  // Variación de hierba: manchas suaves claras y oscuras.
  const grass = new Graphics();
  for (let i = 0; i < 420; i++) {
    const c = rng.int(0, map.cols - 1);
    const r = rng.int(0, map.rows - 1);
    if (at(c, r) !== 'land') continue;
    const [x, y] = center(c, r);
    grass.circle(x + rng.range(-cs, cs), y + rng.range(-cs, cs), rng.range(cs * 0.4, cs * 1.4)).fill({ color: rng.next() < 0.5 ? PALETTE.grassLight : PALETTE.grassDark, alpha: 0.6 });
  }
  for (let i = 0; i < 26; i++) {
    const c = rng.int(2, map.cols - 3);
    const r = rng.int(2, map.rows - 3);
    if (at(c, r) !== 'land') continue;
    const [x, y] = center(c, r);
    grass.ellipse(x, y, rng.range(cs * 1.5, cs * 3.5), rng.range(cs * 0.9, cs * 2)).fill({ color: PALETTE.dirt, alpha: 0.32 });
  }
  root.addChild(grass);

  // Arena en costas y orillas.
  const sand = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'sand') {
        const [x, y] = center(c, r);
        sand.circle(x, y, cs * 0.76).fill(PALETTE.sand);
      }
  root.addChild(sand);

  // Agua interior: borde oscuro, cuerpo y centro más claro.
  const water = new Graphics();
  const waterCells: [number, number][] = [];
  for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) if (at(c, r) === 'water') waterCells.push(center(c, r));
  for (const [x, y] of waterCells) water.circle(x, y, cs * 0.8).fill(PALETTE.waterEdge);
  for (const [x, y] of waterCells) water.circle(x, y, cs * 0.76).fill(PALETTE.water);
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'water' && !hasNeighbour(map, c, r, (t) => t !== 'water', 1)) {
        const [x, y] = center(c, r);
        water.circle(x, y, cs * 0.7).fill(PALETTE.waterInner);
      }
  // Ondas
  for (let i = 0; i < waterCells.length; i++) {
    if (rng.next() > 0.12) continue;
    const [x, y] = waterCells[i];
    const w = cs * 0.5;
    water
      .moveTo(x - w / 2, y)
      .quadraticCurveTo(x, y - w * 0.35, x + w / 2, y)
      .stroke({ width: 3, color: PALETTE.waterRipple, alpha: 0.75, cap: 'round' });
  }
  root.addChild(water);

  // Resolución 1 fija: con DPR 2 la caché doblaría a 8192² y superaría el máximo de muchas GPU integradas.
  root.cacheAsTexture({ resolution: 1, antialias: true });
  return root;
}

function hasNeighbour(map: IslandMap, c: number, r: number, pred: (t: Terrain) => boolean, dist: number): boolean {
  for (let dr = -dist; dr <= dist; dr++)
    for (let dc = -dist; dc <= dist; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= map.cols || nr >= map.rows) continue;
      if (pred(map.cells[nr * map.cols + nc])) return true;
    }
  return false;
}
