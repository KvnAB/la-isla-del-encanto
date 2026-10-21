import { Container, Graphics } from 'pixi.js';
import type { IslandMap, Rng, Terrain } from '@draycol/core';
import { PALETTE } from './palette';

/**
 * Isla en estilo plano: hierba lisa con cuadrícula sutil, arena en las orillas, agua y mar con contorno oscuro.
 * Las costas se dibujan con círculos por celda para que queden orgánicas, pero sin sombreado.
 */
export function buildTerrain(map: IslandMap, _rng: Rng): Container {
  const root = new Container();
  const cs = map.cellSize;
  const at = (c: number, r: number): Terrain => map.cells[r * map.cols + c];
  const center = (c: number, r: number): [number, number] => [(c + 0.5) * cs, (r + 0.5) * cs];
  const margin = Math.floor((4000 - Math.max(map.width, map.height)) / 2);

  // Mar
  const sea = new Graphics();
  sea.rect(-margin, -margin, map.width + margin * 2, map.height + margin * 2).fill(PALETTE.seaDeep);
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'sea' && hasNeighbour(map, c, r, (t) => t !== 'sea', 3)) {
        const [x, y] = center(c, r);
        sea.circle(x, y, cs * 1.2).fill(PALETTE.sea);
      }
  root.addChild(sea);

  // Contorno oscuro de la costa y luego tierra (hierba) encima
  const coast = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) !== 'sea') {
        const [x, y] = center(c, r);
        coast.circle(x, y, cs * 0.86).fill(PALETTE.waterEdge);
      }
  root.addChild(coast);
  const land = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) !== 'sea') {
        const [x, y] = center(c, r);
        land.circle(x, y, cs * 0.78).fill(PALETTE.grass);
      }
  root.addChild(land);

  // Cuadrícula sutil (solo sobre tierra)
  const grid = new Graphics();
  for (let c = 0; c <= map.cols; c++) grid.moveTo(c * cs, 0).lineTo(c * cs, map.height).stroke({ width: 1.2, color: PALETTE.grassGrid, alpha: 0.6 });
  for (let r = 0; r <= map.rows; r++) grid.moveTo(0, r * cs).lineTo(map.width, r * cs).stroke({ width: 1.2, color: PALETTE.grassGrid, alpha: 0.6 });
  const gridMask = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'land') {
        const [x, y] = center(c, r);
        gridMask.circle(x, y, cs * 0.74).fill(0xffffff);
      }
  grid.mask = gridMask;
  root.addChild(gridMask, grid);

  // Arena
  const sand = new Graphics();
  for (let r = 0; r < map.rows; r++)
    for (let c = 0; c < map.cols; c++)
      if (at(c, r) === 'sand') {
        const [x, y] = center(c, r);
        sand.circle(x, y, cs * 0.76).fill(PALETTE.sand);
      }
  root.addChild(sand);

  // Agua interior con contorno oscuro
  const water = new Graphics();
  const cells: [number, number][] = [];
  for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) if (at(c, r) === 'water') cells.push(center(c, r));
  for (const [x, y] of cells) water.circle(x, y, cs * 0.84).fill(PALETTE.waterEdge);
  for (const [x, y] of cells) water.circle(x, y, cs * 0.74).fill(PALETTE.water);
  root.addChild(water);

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
