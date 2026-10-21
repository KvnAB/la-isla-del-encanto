import type { CreatureKind, DeathCause, ItemId } from '@draycol/core';

export const ITEM_NAMES: Record<ItemId, string> = {
  wood: 'Madera',
  stone: 'Piedra',
  gold: 'Oro',
  apple: 'Manzana',
  raw_steak: 'Filete crudo',
  cooked_steak: 'Filete cocinado',
  wool: 'Lana',
  tiger_pelt: 'Piel de tigre',
  needle: 'Aguja',
  wood_pickaxe: 'Pico de madera',
  wood_sword: 'Espada de madera',
  stone_pickaxe: 'Pico de piedra',
  stone_sword: 'Espada de piedra',
  gold_pickaxe: 'Pico de oro',
  gold_sword: 'Espada de oro',
  campfire: 'Fogata',
  coat1: 'Abrigo nivel 1',
  coat2: 'Abrigo nivel 2',
  bear_pelt: 'Piel de oso',
  torch: 'Antorcha',
};

export const CREATURE_NAMES: Record<CreatureKind, string> = {
  tiger: 'Tigre',
  sheep: 'Oveja mala',
  goblin: 'Duende',
  wolf: 'Lobo',
};

/** "un tigre", "una oveja mala": artículo según el género del nombre. */
const CREATURE_WITH_ARTICLE: Record<CreatureKind, string> = {
  tiger: 'un tigre',
  sheep: 'una oveja mala',
  goblin: 'un duende',
  wolf: 'un lobo',
};

/** Frase de la pantalla de muerte. */
export function causeText(cause: DeathCause): string {
  switch (cause.kind) {
    case 'creature':
      return `Te mató ${CREATURE_WITH_ARTICLE[cause.creature]}`;
    case 'hunger':
      return 'Moriste de hambre';
    case 'thirst':
      return 'Moriste de sed';
    case 'cold':
      return 'Moriste de frío';
  }
}

/** Nombre en minúsculas para listas de materiales ("15 madera"). */
export const ITEM_NAMES_LOWER: Record<ItemId, string> = Object.fromEntries(
  Object.entries(ITEM_NAMES).map(([k, v]) => [k, v.toLowerCase()]),
) as Record<ItemId, string>;

/** Separador de miles con espacio: 1240 → "1 240". */
export function formatPoints(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
