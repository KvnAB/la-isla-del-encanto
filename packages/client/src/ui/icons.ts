import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import type { ItemId } from '@draycol/core';
import { drawItem } from '../render/sprites/vector-items';

const cache = new Map<ItemId, string>();
let app: Application | null = null;
let ready: Promise<Application> | null = null;

async function getApp(): Promise<Application> {
  if (app) return app;
  if (!ready) {
    ready = (async () => {
      const a = new Application();
      await a.init({ width: 96, height: 96, backgroundAlpha: 0, antialias: true, resolution: 2, autoStart: false, preference: 'webgl' });
      app = a;
      return a;
    })();
  }
  return ready;
}

/** Icono PNG (data URL) de un objeto, generado una vez desde el dibujo vectorial. */
export function itemIconDataUrl(item: ItemId): string {
  return cache.get(item) ?? '';
}

/** Genera y cachea los iconos. Llamar una vez antes de montar el HUD o la pantalla de inicio. */
export async function preloadItemIcons(items: ItemId[]): Promise<void> {
  const a = await getApp();
  for (const item of items) {
    if (cache.has(item)) continue;
    const c = new Container();
    const g = new Graphics();
    drawItem(g, item, 38);
    g.position.set(48, 48);
    c.addChild(g);
    const url = await a.renderer.extract.base64({ target: c, frame: new Rectangle(0, 0, 96, 96), resolution: 2 });
    cache.set(item, url);
    c.destroy({ children: true });
  }
}
