import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';

function walk(v: unknown, path: string, bad: string[]): void {
  if (v === undefined || typeof v === 'function') bad.push(path);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, bad));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, bad);
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) listFiles(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('API pública y serialización', () => {
  it('el estado no contiene funciones ni undefined', () => {
    const w = new core.World(3);
    w.addPlayer('Ana', 'wood_sword');
    w.stepSeconds(5);
    const bad: string[] = [];
    walk(w.getState(), 'state', bad);
    expect(bad).toEqual([]);
  });

  it('index exporta la API del núcleo', () => {
    expect(core.World).toBeTypeOf('function');
    expect(core.DEFAULT_CONFIG).toBeTypeOf('object');
    expect(core.ITEM_META).toBeTypeOf('object');
    expect(core.Rng).toBeTypeOf('function');
    expect(core.availableRecipes).toBeTypeOf('function');
    expect(core.terrainAt).toBeTypeOf('function');
    expect(core.resourceAvailable).toBeTypeOf('function');
    expect(core.isWalkable).toBeTypeOf('function');
  });

  it('el núcleo no usa Math.random ni APIs de navegador', () => {
    const files = listFiles(join(__dirname, '..', 'src'));
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      if (/Math\.random|\bdocument\b|\bwindow\b|pixi\.js/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
