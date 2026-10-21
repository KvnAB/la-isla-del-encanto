import { ITEM_META, type GameConfig } from '../config.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { clamp } from '../vec.js';
import { dropToGround } from './ground.js';
import { removeItem } from './inventory.js';

export interface UseHooks {
  placeCampfire?: (state: WorldState, p: PlayerState) => void;
}

/** Usa el slot seleccionado: comida → comer; fogata → colocar; abrigo → poner/quitar; herramientas → nada. */
export function useSelectedSlot(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[], hooks: UseHooks = {}): void {
  const slot = p.inventory[p.selectedSlot];
  if (!slot) return;
  const meta = ITEM_META[slot.item];
  if (!meta.food && !meta.placeable && !meta.equippable) return;
  // Mismo cooldown que el golpe: un clic mantenido no consume varias unidades por paso.
  if (p.hitCooldown > 0) return;
  p.hitCooldown = cfg.player.hitCooldown;
  if (meta.food) {
    const f = cfg.food[slot.item as keyof GameConfig['food']];
    if (!f) return;
    removeItem(p.inventory, slot.item, 1);
    p.hunger = clamp(p.hunger + f.hunger, 0, 100);
    p.health = clamp(p.health + f.health, 0, 100);
    events.push({ type: 'ate', playerId: p.id, item: slot.item });
    return;
  }
  if (meta.equippable) {
    p.coatOn = !p.coatOn;
    events.push({ type: 'coatToggled', playerId: p.id, on: p.coatOn });
    return;
  }
  if (hooks.placeCampfire) hooks.placeCampfire(state, p);
}

/** Tira todo el slot al suelo, delante del jugador. */
export function dropSlot(state: WorldState, p: PlayerState, slot: number, cfg: GameConfig, events: GameEvent[]): void {
  const s = p.inventory[slot];
  if (!s) return;
  p.inventory[slot] = null;
  const d = p.radius + 40;
  dropToGround(state, s.item, s.count, p.x + Math.cos(p.angle) * d, p.y + Math.sin(p.angle) * d, cfg);
  events.push({ type: 'itemDropped', playerId: p.id, item: s.item, amount: s.count });
}
