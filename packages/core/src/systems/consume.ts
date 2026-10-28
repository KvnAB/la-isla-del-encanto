import { ITEM_META, type GameConfig } from '../config.js';
import type { GameEvent, ItemId, PlayerState, Slot, WorldState } from '../types.js';
import { clamp } from '../vec.js';
import { aimedAtWater } from './fishing.js';
import { dropToGround } from './ground.js';
import { removeItem } from './inventory.js';

export interface UseHooks {
  placeCampfire?: (state: WorldState, p: PlayerState) => void;
  fish?: (state: WorldState, p: PlayerState) => void;
  /** Devuelve true si domó a una criatura con el objeto seleccionado. */
  tame?: (state: WorldState, p: PlayerState) => boolean;
}

/** Usa el slot seleccionado: comida → comer; fogata → colocar; abrigo → poner/quitar; cantimplora → llenar/beber; caña → pescar; hueso → domar; herramientas → nada. */
export function useSelectedSlot(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[], hooks: UseHooks = {}): void {
  const slot = p.inventory[p.selectedSlot];
  if (!slot) return;
  const meta = ITEM_META[slot.item];
  if (!meta.food && !meta.placeable && !meta.equippable && !meta.usable) return;
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
  if (slot.item === 'canteen' || slot.item === 'canteen_full') {
    useCanteen(state, p, slot, cfg, events);
    return;
  }
  if (slot.item === 'fishing_rod') {
    if (hooks.fish) hooks.fish(state, p);
    return;
  }
  if (isTamingItem(slot.item, cfg)) {
    if (hooks.tame) hooks.tame(state, p);
    return;
  }
  if (hooks.placeCampfire) hooks.placeCampfire(state, p);
}

/** Algún tipo de criatura se doma con este objeto. */
export function isTamingItem(item: ItemId, cfg: GameConfig): boolean {
  return Object.values(cfg.creatures.defs).some((d) => d.tameWith === item);
}

/**
 * Vacía junto al agua (nadando o apuntando) → llena (3 tragos). Con tragos: nadando → rellena; si no → un trago de sed,
 * aunque se esté apuntando al agua desde la orilla (así beber tras llenarla siempre funciona).
 */
function useCanteen(state: WorldState, p: PlayerState, slot: Slot, cfg: GameConfig, events: GameEvent[]): void {
  const refill = slot.item === 'canteen' ? aimedAtWater(state, p, cfg) : p.inWater && slot.count < cfg.canteen.sips;
  if (refill) {
    p.inventory[p.selectedSlot] = { item: 'canteen_full', count: cfg.canteen.sips };
    events.push({ type: 'canteenFilled', playerId: p.id });
    return;
  }
  if (slot.item !== 'canteen_full' || p.inWater) return;
  p.thirst = clamp(p.thirst + cfg.canteen.thirstPerSip, 0, 100);
  slot.count -= 1;
  if (slot.count <= 0) p.inventory[p.selectedSlot] = { item: 'canteen', count: 1 };
  events.push({ type: 'drank', playerId: p.id });
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
