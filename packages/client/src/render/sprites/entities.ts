import { Container, Sprite } from 'pixi.js';
import type { CreatureKind, ItemId, ResourceKind, Size } from '@draycol/core';
import { CREATURE_ROTATION_OFFSET, resourceSpriteKey, SPRITE_FIT, texture, type SpriteKey } from '../assets';

function spriteFit(key: SpriteKey, targetWidth: number): Sprite {
  const s = new Sprite(texture(key));
  s.anchor.set(0.5);
  const k = targetWidth / Math.max(s.texture.width, s.texture.height);
  s.scale.set(k);
  return s;
}

/** Árbol, frutal, roca o su versión rota, escalado a su radio de colisión. */
export function makeResource(kind: ResourceKind, size: Size, radius: number, broken: boolean): Container {
  const key = resourceSpriteKey(kind, size, broken);
  const fit = broken ? (kind === 'rock' ? SPRITE_FIT.rubble : SPRITE_FIT.stump) : kind === 'rock' ? SPRITE_FIT.rock : SPRITE_FIT.tree;
  const c = new Container();
  c.addChild(spriteFit(key, radius * 2 * fit));
  return c;
}

/** Criatura mirando hacia +x (la hoja mira hacia abajo, se compensa con la rotación). */
export function makeCreature(kind: CreatureKind, radius: number): Container {
  const c = new Container();
  const s = spriteFit(kind, radius * 2 * SPRITE_FIT.creature);
  s.rotation = CREATURE_ROTATION_OFFSET;
  c.addChild(s);
  return c;
}

export interface CampfireView extends Container {
  fire: Sprite;
}

export function makeCampfire(): CampfireView {
  const c = new Container() as CampfireView;
  const s = spriteFit('campfire', SPRITE_FIT.campfire);
  c.addChild(s);
  c.fire = s;
  return c;
}

/** Parpadeo sutil del fuego. */
export function animateCampfire(c: CampfireView, t: number): void {
  const base = SPRITE_FIT.campfire / Math.max(c.fire.texture.width, c.fire.texture.height);
  const k = 1 + Math.sin(t * 9) * 0.025 + Math.sin(t * 23) * 0.015;
  c.fire.scale.set(base * k, base * (2 - k));
}

/** Objeto en el suelo. */
export function makeGroundItem(item: ItemId): Container {
  const c = new Container();
  c.addChild(spriteFit(item, SPRITE_FIT.groundItem));
  return c;
}

/** Sprite de herramienta para la mano del jugador. Punta hacia arriba (-y) en coordenadas locales. */
export function makeToolSprite(item: ItemId, length: number): Sprite {
  const s = new Sprite(texture(item));
  s.anchor.set(0.5, 0.62);
  const k = length / Math.max(s.texture.width, s.texture.height);
  s.scale.set(k);
  // En la hoja, pico y espada apuntan hacia arriba-derecha (~45°): se enderezan para que apunten a -y.
  s.rotation = -Math.PI / 4;
  return s;
}
