import type { ItemId } from '@draycol/core';
import { spriteUrl } from '../render/assets';

/** Icono de un objeto para el HUD y las pantallas: el mismo PNG que se usa en el mundo. */
export function itemIconDataUrl(item: ItemId): string {
  return spriteUrl(item);
}
