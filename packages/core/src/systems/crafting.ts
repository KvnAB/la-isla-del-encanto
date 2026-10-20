import type { GameConfig, RecipeDef } from '../config.js';
import type { GameEvent, ItemId, PlayerState, Slot } from '../types.js';
import { addItem, countItem, findSlot, removeItem } from './inventory.js';

function canCraft(inv: (Slot | null)[], r: RecipeDef): boolean {
  for (const [item, n] of Object.entries(r.cost) as [ItemId, number][]) if (countItem(inv, item) < n) return false;
  if (r.consumes && findSlot(inv, r.consumes) === -1) return false;
  if (r.unique && findSlot(inv, r.id) !== -1) return false;
  return true;
}

/** Recetas fabricables con el inventario actual, en el orden de cfg.recipes. */
export function availableRecipes(inv: (Slot | null)[], cfg: GameConfig): ItemId[] {
  return cfg.recipes.filter((r) => canCraft(inv, r)).map((r) => r.id);
}

/** Fabrica la receta. Devuelve false si no es posible (sin cambios). */
export function craft(p: PlayerState, recipeId: ItemId, cfg: GameConfig, events: GameEvent[]): boolean {
  const r = cfg.recipes.find((x) => x.id === recipeId);
  if (!r || !canCraft(p.inventory, r)) return false;

  const inv = p.inventory;
  let targetSlot = -1;
  if (r.consumes) {
    targetSlot = findSlot(inv, r.consumes);
    inv[targetSlot] = null;
  }
  for (const [item, n] of Object.entries(r.cost) as [ItemId, number][]) removeItem(inv, item, n);

  if (targetSlot !== -1) {
    inv[targetSlot] = { item: r.id, count: 1 };
  } else if (addItem(inv, r.id, 1) > 0) {
    // Sin hueco: devolver lo gastado (no debería pasar salvo inventario lleno de tipos distintos).
    for (const [item, n] of Object.entries(r.cost) as [ItemId, number][]) addItem(inv, item, n);
    return false;
  }
  p.points += r.points;
  events.push({ type: 'crafted', playerId: p.id, recipeId: r.id });
  return true;
}
