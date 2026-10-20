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

export function countItem(inv: (Slot | null)[], item: ItemId): number {
  let n = 0;
  for (const s of inv) if (s?.item === item) n += s.count;
  return n;
}

export function findSlot(inv: (Slot | null)[], item: ItemId): number {
  return inv.findIndex((s) => s?.item === item);
}

/** Quita `count` unidades. Si no hay suficientes devuelve false y no quita nada. */
export function removeItem(inv: (Slot | null)[], item: ItemId, count: number): boolean {
  if (countItem(inv, item) < count) return false;
  let left = count;
  for (let i = 0; i < inv.length && left > 0; i++) {
    const s = inv[i];
    if (!s || s.item !== item) continue;
    const take = Math.min(s.count, left);
    s.count -= take;
    left -= take;
    if (s.count <= 0) inv[i] = null;
  }
  return true;
}
