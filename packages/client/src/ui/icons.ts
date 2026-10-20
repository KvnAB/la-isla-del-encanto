import { Application, Container, Rectangle } from 'pixi.js';
import type { ItemId } from '@draycol/core';
import { makeGroundItem } from '../render/sprites';

const cache = new Map<ItemId, string>();
let app: Application | null = null;
let ready: Promise<Application> | null = null;

async function getApp(): Promise<Application> {
  if (app) return app;
  if (!ready) {
    ready = (async () => {
      const a = new Application();
      await a.init({ width: 64, height: 64, backgroundAlpha: 0, antialias: true, resolution: 2, autoStart: false, preference: 'webgl' });
      app = a;
      return a;
    })();
  }
  return ready;
}

/** Icono PNG (data URL) de un objeto, 64×64, generado una vez desde el sprite vectorial. */
export function itemIconDataUrl(item: ItemId): string {
  return cache.get(item) ?? '';
}

/** Genera y cachea los iconos de todos los objetos. Llamar una vez antes de montar el HUD. */
export async function preloadItemIcons(items: ItemId[]): Promise<void> {
  const a = await getApp();
  for (const item of items) {
    if (cache.has(item)) continue;
    const c = new Container();
    const sprite = makeGroundItem(item);
    const b = sprite.getLocalBounds();
    const size = Math.max(b.width, b.height, 1);
    const k = Math.min(1.6, 52 / size);
    sprite.scale.set(k);
    sprite.position.set(32 - (b.x + b.width / 2) * k, 32 - (b.y + b.height / 2) * k);
    c.addChild(sprite);
    const url = await a.renderer.extract.base64({ target: c, frame: new Rectangle(0, 0, 64, 64), resolution: 2 });
    cache.set(item, url);
    c.destroy({ children: true });
  }
}
