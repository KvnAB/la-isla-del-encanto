import { Container, Graphics } from 'pixi.js';
import type { IslandMap, Rng } from '@draycol/core';
import { smoothLoop, traceContours } from './contours';
import { PALETTE } from './palette';

/**
 * Isla en estilo plano con contornos continuos (referencia estilo-plano):
 * - costa: hierba con cuadrícula, banda de arena (trazo interior del contorno) y borde oscuro;
 * - ríos y lagos: agua con banda clara interior (trazo interior) y borde oscuro.
 * Las bandas se dibujan como trazos alineados al interior del polígono: no hay que encoger el contorno.
 */
export function buildTerrain(map: IslandMap, _rng: Rng): Container {
  const root = new Container();
  const cs = map.cellSize;
  const at = (c: number, r: number) => map.cells[r * map.cols + c];
  const margin = Math.floor((4000 - Math.max(map.width, map.height)) / 2);

  // Mar
  const sea = new Graphics();
  sea.rect(-margin, -margin, map.width + margin * 2, map.height + margin * 2).fill(PALETTE.seaDeep);
  root.addChild(sea);

  const islandLoops = traceContours(map.cols, map.rows, cs, (c, r) => at(c, r) !== 'sea').map((l) => smoothLoop(l, 3));

  // Aguas poco profundas alrededor de la isla (trazo exterior)
  const shallow = new Graphics();
  for (const l of islandLoops) shallow.poly(l, true).stroke({ width: cs * 1.4, color: PALETTE.sea, join: 'round', alignment: 1 });
  root.addChild(shallow);

  // Hierba
  const grass = new Graphics();
  for (const l of islandLoops) grass.poly(l, true).fill(PALETTE.grass);
  root.addChild(grass);

  // Cuadrícula sobre la hierba (recortada a la isla)
  const grid = new Graphics();
  for (let c = 0; c <= map.cols; c++) grid.moveTo(c * cs, 0).lineTo(c * cs, map.height).stroke({ width: 1.2, color: PALETTE.grassGrid, alpha: 0.7 });
  for (let r = 0; r <= map.rows; r++) grid.moveTo(0, r * cs).lineTo(map.width, r * cs).stroke({ width: 1.2, color: PALETTE.grassGrid, alpha: 0.7 });
  const gridMask = new Graphics();
  for (const l of islandLoops) gridMask.poly(l, true).fill(0xffffff);
  grid.mask = gridMask;
  root.addChild(gridMask, grid);

  // Banda de arena (trazo interior) y borde oscuro de la costa
  const coast = new Graphics();
  for (const l of islandLoops) coast.poly(l, true).stroke({ width: cs * 0.9, color: PALETTE.sand, join: 'round', alignment: 0 });
  for (const l of islandLoops) coast.poly(l, true).stroke({ width: 5, color: PALETTE.waterEdge, join: 'round' });
  root.addChild(coast);

  // Agua interior: relleno, banda clara interior y borde oscuro
  const waterLoops = traceContours(map.cols, map.rows, cs, (c, r) => at(c, r) === 'water').map((l) => smoothLoop(l, 3));
  const water = new Graphics();
  for (const l of waterLoops) water.poly(l, true).fill(PALETTE.sea);
  for (const l of waterLoops) water.poly(l, true).stroke({ width: cs * 0.55, color: PALETTE.water, join: 'round', alignment: 0 });
  for (const l of waterLoops) water.poly(l, true).stroke({ width: 6, color: PALETTE.waterEdge, join: 'round' });
  root.addChild(water);

  root.cacheAsTexture({ resolution: 1, antialias: true });
  return root;
}
