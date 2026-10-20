import { Assets, Texture } from 'pixi.js';
import type { CreatureKind, ItemId, ResourceKind, Size } from '@draycol/core';

/** Claves de sprite disponibles en /sprites/<clave>.png */
export type SpriteKey =
  | ItemId
  | CreatureKind
  | 'tree'
  | 'apple_tree'
  | 'stump'
  | 'rock_large'
  | 'rock_medium'
  | 'rock_small'
  | 'rubble';

export const SPRITE_KEYS: SpriteKey[] = [
  'wood', 'stone', 'apple', 'raw_steak', 'cooked_steak', 'wool', 'tiger_pelt', 'needle',
  'wood_pickaxe', 'wood_sword', 'stone_pickaxe', 'stone_sword', 'campfire', 'coat1',
  'tiger', 'sheep', 'goblin',
  'tree', 'apple_tree', 'stump', 'rock_large', 'rock_medium', 'rock_small', 'rubble',
];

export function spriteUrl(key: SpriteKey): string {
  return `/sprites/${key}.png`;
}

const textures = new Map<SpriteKey, Texture>();

/** Carga todas las texturas una vez. Llamar antes de crear el renderer. */
export async function loadSprites(): Promise<void> {
  const missing = SPRITE_KEYS.filter((k) => !textures.has(k));
  if (missing.length === 0) return;
  const loaded = (await Assets.load(missing.map((k) => ({ alias: k, src: spriteUrl(k) })))) as Record<string, Texture>;
  for (const k of missing) {
    const t = loaded[k];
    if (!t) throw new Error(`Sprite no cargado: ${k}`);
    textures.set(k, t);
  }
}

export function texture(key: SpriteKey): Texture {
  const t = textures.get(key);
  if (!t) throw new Error(`Sprite no cargado: ${key} (llama a loadSprites() antes)`);
  return t;
}

export function resourceSpriteKey(kind: ResourceKind, size: Size, broken: boolean): SpriteKey {
  if (broken) return kind === 'rock' ? 'rubble' : 'stump';
  if (kind === 'rock') return size === 'large' ? 'rock_large' : size === 'medium' ? 'rock_medium' : 'rock_small';
  return kind;
}

/**
 * Diámetro en píxeles de mundo que debe ocupar cada sprite, en función del radio de colisión.
 * Las criaturas de la hoja miran hacia abajo (+y): el renderer aplica -90° para que miren hacia +x.
 */
export const SPRITE_FIT = {
  /** Factor por el que se multiplica el diámetro de colisión para fijar el ancho del sprite. */
  tree: 1.45,
  apple_tree: 1.45,
  rock: 1.35,
  stump: 1.0,
  rubble: 1.5,
  creature: 1.9,
  groundItem: 36,
  campfire: 84,
} as const;

export const CREATURE_ROTATION_OFFSET = -Math.PI / 2;
