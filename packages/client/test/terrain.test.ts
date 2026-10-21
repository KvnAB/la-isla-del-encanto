import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@draycol/core';
import { SEA_MARGIN, TERRAIN_CHUNK, terrainChunks } from '../src/render/terrain';

describe('terrainChunks', () => {
  it('cubre la isla y su margen de mar sin huecos y ningún trozo supera el tamaño de trozo', () => {
    const map = { width: DEFAULT_CONFIG.island.width, height: DEFAULT_CONFIG.island.height } as Parameters<typeof terrainChunks>[0];
    const chunks = terrainChunks(map);
    const total = chunks.reduce((a, r) => a + r.width * r.height, 0);
    expect(total).toBe((map.width + SEA_MARGIN * 2) * (map.height + SEA_MARGIN * 2));
    for (const r of chunks) {
      expect(r.width).toBeLessThanOrEqual(TERRAIN_CHUNK);
      expect(r.height).toBeLessThanOrEqual(TERRAIN_CHUNK);
    }
    expect(chunks[0].x).toBe(-SEA_MARGIN);
    expect(chunks[0].y).toBe(-SEA_MARGIN);
  });
});
