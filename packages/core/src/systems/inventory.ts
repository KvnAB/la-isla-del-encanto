import { ITEM_META } from '../config.js';
import type { ItemId, Slot } from '../types.js';

/** Añade `count` unidades. Devuelve lo que NO cupo (0 si todo). Apila con el slot del mismo item; si no, usa el primer hueco. */
export function addItem(inv: (Slot | null)[], item: ItemId, count: number): number {
  if (count <= 0) return 0;
  if (ITEM_META[item].stackable) {
    const existing = inv.find((s) => s?.item === item);
    if (existing) {
      existing.count += count;
      return 0;
    }
  }
  const free = inv.findIndex((s) => s === null);
  if (free === -1) return count;
  inv[free] = { item, count };
  return 0;
}
