import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, World, terrainAt } from '@draycol/core';

vi.mock('../src/ui/icons', () => ({ itemIconDataUrl: (item: string) => `data:icon/${item}` }));

// jsdom no implementa canvas 2D: el minimapa se queda sin contexto y no dibuja (sin errores en la salida)
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

import { Hud } from '../src/ui/hud';
import { islandShapes, MINIMAP_SIZE, minimapMarkers, toMinimap } from '../src/ui/minimap';

const world = new World();
const map = world.getState().map;

describe('minimapa', () => {
  it('toMinimap escala el mundo al tamaño del mapa', () => {
    expect(toMinimap(0, 0, map)).toEqual({ x: 0, y: 0 });
    expect(toMinimap(map.width, map.height, map)).toEqual({ x: MINIMAP_SIZE, y: MINIMAP_SIZE });
    expect(toMinimap(map.width / 2, map.height / 4, map)).toEqual({ x: MINIMAP_SIZE / 2, y: MINIMAP_SIZE / 4 });
  });

  it('islandShapes devuelve contornos suaves de la isla y del agua interior, en píxeles del minimapa', () => {
    const { island, water } = islandShapes(map);
    expect(island.length).toBeGreaterThanOrEqual(1);
    expect(water.length).toBeGreaterThanOrEqual(1);
    for (const loop of [...island, ...water]) {
      expect(loop.length).toBeGreaterThan(16); // suavizado: muchos más vértices que celdas
      for (const v of loop) expect(v).toBeGreaterThanOrEqual(0);
      for (const v of loop) expect(v).toBeLessThanOrEqual(MINIMAP_SIZE);
    }
    // el punto de aparición cae dentro del contorno principal (test de rayo horizontal)
    const s = toMinimap(map.spawnX, map.spawnY, map);
    const main = island.reduce((a, b) => (b.length > a.length ? b : a));
    let crossings = 0;
    for (let i = 0; i < main.length; i += 2) {
      const x1 = main[i], y1 = main[i + 1];
      const x2 = main[(i + 2) % main.length], y2 = main[(i + 3) % main.length];
      if (y1 > s.y !== y2 > s.y && s.x < x1 + ((s.y - y1) * (x2 - x1)) / (y2 - y1)) crossings++;
    }
    expect(crossings % 2).toBe(1);
  });

  it('minimapMarkers da un marcador por recurso con su tipo, posición escalada y un radio mínimo visible', () => {
    const state = world.getState();
    const markers = minimapMarkers(state, map);
    expect(markers).toHaveLength(state.resources.length);
    const gold = state.resources.find((r) => r.kind === 'gold_rock')!;
    const m = markers.find((k) => k.id === gold.id)!;
    expect(m.kind).toBe('gold_rock');
    expect({ x: m.x, y: m.y }).toEqual(toMinimap(gold.x, gold.y, map));
    expect(m.r).toBeGreaterThanOrEqual(2);
    const big = state.resources.find((r) => r.kind === 'tree' && r.size === 'large')!;
    const small = state.resources.find((r) => r.kind === 'tree' && r.size === 'small')!;
    expect(markers.find((k) => k.id === big.id)!.r).toBeGreaterThan(markers.find((k) => k.id === small.id)!.r);
    expect(markers.every((k) => k.broken === false)).toBe(true);
  });
});

describe('Hud con minimapa', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root')!;
  });

  it('coloca un canvas cuadrado en el bloque de arriba a la derecha y recuerda la posición del jugador', () => {
    const hud = new Hud(root, DEFAULT_CONFIG, () => {}, () => {});
    const w = new World();
    const id = w.addPlayer('Ana', 'wood_pickaxe');
    const p = w.player(id);
    hud.update(p, w.getState(), []);
    const canvas = root.querySelector<HTMLCanvasElement>('.hud-topright .hud-minimap canvas')!;
    expect(canvas).not.toBeNull();
    expect(canvas.style.width).toBe(MINIMAP_SIZE + 'px');
    expect(canvas.width).toBeGreaterThanOrEqual(MINIMAP_SIZE);
    expect(root.querySelector('.hud-topright .hud-top')).not.toBeNull();
    expect(hud.minimap.player).toEqual({ ...toMinimap(p.x, p.y, map), angle: p.angle });
  });
});

describe('minimapa: nieve y marcadores nuevos', () => {
  it('islandShapes devuelve contornos de nieve y todos están en la mitad norte', () => {
    const { snow } = islandShapes(map);
    expect(snow.length).toBeGreaterThanOrEqual(1);
    for (const loop of snow) for (let i = 1; i < loop.length; i += 2) expect(loop[i]).toBeLessThan(MINIMAP_SIZE * 0.55);
  });

  it('las rocas de diamante tienen marcador', () => {
    const markers = minimapMarkers(world.getState(), map);
    expect(markers.filter((m) => m.kind === 'diamond_rock')).toHaveLength(8);
  });
});
