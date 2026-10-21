import { Container, Graphics, Rectangle, Sprite, type Renderer as PixiRenderer } from 'pixi.js';
import type { IslandMap } from '@draycol/core';
import { smoothLoop, traceContours } from './contours';
import { PALETTE } from './palette';

/** Margen de mar dibujado alrededor de la isla (px de mundo). */
export const SEA_MARGIN = 600;
/** Lado de cada trozo de terreno cacheado como textura (así ninguna textura supera el límite de la GPU). */
export const TERRAIN_CHUNK = 1500;

/**
 * Isla en estilo plano con contornos continuos (referencia estilo-plano), en vectores:
 * - costa: hierba con cuadrícula, banda de arena (trazo interior del contorno) y borde oscuro;
 * - nieve: polígonos de las celdas de nieve, con cuadrícula tenue y borde interior gris azulado, encima de la arena;
 * - ríos y lagos: agua con banda clara interior y borde oscuro.
 * Las bandas se dibujan como trazos alineados al interior del polígono: no hay que encoger el contorno.
 */
export function buildTerrainVector(map: IslandMap): Container {
  const root = new Container();
  const cs = map.cellSize;
  const at = (c: number, r: number) => map.cells[r * map.cols + c];

  // Mar
  const sea = new Graphics();
  sea.rect(-SEA_MARGIN, -SEA_MARGIN, map.width + SEA_MARGIN * 2, map.height + SEA_MARGIN * 2).fill(PALETTE.seaDeep);
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
  root.addChild(coast);

  // Nieve: cubre hierba y arena del norte; cuadrícula más tenue y borde interior
  const snowLoops = traceContours(map.cols, map.rows, cs, (c, r) => at(c, r) === 'snow').map((l) => smoothLoop(l, 3));
  if (snowLoops.length) {
    const snow = new Graphics();
    for (const l of snowLoops) snow.poly(l, true).fill(PALETTE.snow);
    root.addChild(snow);
    const snowGrid = new Graphics();
    for (let c = 0; c <= map.cols; c++) snowGrid.moveTo(c * cs, 0).lineTo(c * cs, map.height).stroke({ width: 1.2, color: PALETTE.snowGrid, alpha: 0.9 });
    for (let r = 0; r <= map.rows; r++) snowGrid.moveTo(0, r * cs).lineTo(map.width, r * cs).stroke({ width: 1.2, color: PALETTE.snowGrid, alpha: 0.9 });
    const snowMask = new Graphics();
    for (const l of snowLoops) snowMask.poly(l, true).fill(0xffffff);
    snowGrid.mask = snowMask;
    root.addChild(snowMask, snowGrid);
    const snowEdge = new Graphics();
    for (const l of snowLoops) snowEdge.poly(l, true).stroke({ width: cs * 0.5, color: PALETTE.snowEdge, join: 'round', alignment: 0 });
    root.addChild(snowEdge);
  }

  // Borde oscuro de la costa, encima de todo lo anterior (la nieve llega hasta el mar)
  const coastEdge = new Graphics();
  for (const l of islandLoops) coastEdge.poly(l, true).stroke({ width: 5, color: PALETTE.waterEdge, join: 'round' });
  root.addChild(coastEdge);

  // Agua interior: relleno, banda clara interior y borde oscuro
  const waterLoops = traceContours(map.cols, map.rows, cs, (c, r) => at(c, r) === 'water').map((l) => smoothLoop(l, 3));
  const water = new Graphics();
  for (const l of waterLoops) water.poly(l, true).fill(PALETTE.sea);
  for (const l of waterLoops) water.poly(l, true).stroke({ width: cs * 0.55, color: PALETTE.water, join: 'round', alignment: 0 });
  for (const l of waterLoops) water.poly(l, true).stroke({ width: 6, color: PALETTE.waterEdge, join: 'round' });
  root.addChild(water);

  return root;
}

/** Rectángulos de los trozos que cubren la isla y su margen de mar. */
export function terrainChunks(map: IslandMap, chunk = TERRAIN_CHUNK, margin = SEA_MARGIN): Rectangle[] {
  const out: Rectangle[] = [];
  const x0 = -margin;
  const y0 = -margin;
  const x1 = map.width + margin;
  const y1 = map.height + margin;
  for (let y = y0; y < y1; y += chunk) for (let x = x0; x < x1; x += chunk) out.push(new Rectangle(x, y, Math.min(chunk, x1 - x), Math.min(chunk, y1 - y)));
  return out;
}

/**
 * Terreno listo para dibujar: el vector se rasteriza por trozos de `TERRAIN_CHUNK` px en sprites
 * (una isla de 4500 px entera superaría el tamaño máximo de textura de algunas GPU) y se descarta.
 */
export function buildTerrain(map: IslandMap, renderer: PixiRenderer): Container {
  const vector = buildTerrainVector(map);
  const root = new Container();
  for (const frame of terrainChunks(map)) {
    const texture = renderer.generateTexture({ target: vector, frame, resolution: 1, antialias: true });
    const sprite = new Sprite(texture);
    sprite.position.set(frame.x, frame.y);
    root.addChild(sprite);
  }
  vector.destroy({ children: true });
  return root;
}
