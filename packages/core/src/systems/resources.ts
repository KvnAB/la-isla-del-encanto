import { ITEM_META, type GameConfig } from '../config.js';
import { nextId } from '../entities.js';
import { findLandSpot, terrainAt } from '../island.js';
import type { Rng } from '../rng.js';
import type { GameEvent, ItemId, PlayerState, ResourceKind, ResourceState, Size, Slot, ToolClass, WeaponClass, WorldState } from '../types.js';
import { addItem } from './inventory.js';

const SIZES: Size[] = ['small', 'medium', 'large'];

export function resourceCapacity(kind: ResourceKind, size: Size, cfg: GameConfig): number {
  if (kind === 'apple_tree') return cfg.resources.appleYield[size];
  if (kind === 'gold_rock') return cfg.resources.goldCapacity[size];
  return cfg.resources.capacity[size];
}

export function spawnResources(state: WorldState, cfg: GameConfig, rng: Rng): void {
  const map = state.map;
  const spawn = { x: map.spawnX, y: map.spawnY, d: cfg.resources.minDistFromSpawn };
  const kinds: ResourceKind[] = ['tree', 'apple_tree', 'rock', 'gold_rock'];
  for (const kind of kinds) {
    for (let i = 0; i < cfg.resources.counts[kind]; i++) {
      const size = rng.pick(SIZES);
      const radius = cfg.resources.radius[kind][size];
      let placed = false;
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const p = findLandSpot(map, rng, spawn);
        // el círculo entero debe estar en tierra/arena
        let ok = true;
        for (const [dx, dy] of [[radius, 0], [-radius, 0], [0, radius], [0, -radius]] as const) {
          const t = terrainAt(map, p.x + dx, p.y + dy);
          if (t !== 'land' && t !== 'sand') {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (const r of state.resources) {
          if (Math.hypot(r.x - p.x, r.y - p.y) < r.radius + radius + 20) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        state.resources.push({ id: nextId(state), kind, size, x: p.x, y: p.y, radius, remaining: resourceCapacity(kind, size, cfg), brokenAt: null });
        placed = true;
      }
    }
  }
}


/** Unidades disponibles ahora: lo que queda, o la fracción regenerada si está roto. */
/** Radio que bloquea el paso: más pequeño que el dibujado, y aún menor cuando está roto. */
export function collisionRadius(r: ResourceState, cfg: GameConfig): number {
  const k = r.brokenAt !== null ? cfg.resources.brokenCollision : cfg.resources.collision[r.kind];
  return r.radius * k;
}

export function resourceAvailable(r: ResourceState, cfg: GameConfig, now: number): number {
  if (r.brokenAt === null) return r.remaining;
  const cap = resourceCapacity(r.kind, r.size, cfg);
  const progress = Math.min(1, (now - r.brokenAt) / cfg.resources.regenSeconds[r.size]);
  return Math.floor(cap * progress + 1e-6);
}

export function toolClassOf(slot: Slot | null): ToolClass {
  return slot ? (ITEM_META[slot.item].tool ?? 'hand') : 'hand';
}

export function weaponClassOf(slot: Slot | null): WeaponClass {
  return slot ? (ITEM_META[slot.item].weapon ?? 'fist') : 'fist';
}

function yieldFor(kind: ResourceKind, tool: ToolClass, cfg: GameConfig): { item: ItemId; perHit: number } {
  switch (kind) {
    case 'tree':
      return { item: 'wood', perHit: cfg.resources.woodPerHit[tool] };
    case 'rock':
      return { item: 'stone', perHit: cfg.resources.stonePerHit[tool] };
    case 'gold_rock':
      return { item: 'gold', perHit: cfg.resources.goldPerHit[tool] };
    case 'apple_tree':
      return { item: 'apple', perHit: Number.POSITIVE_INFINITY };
  }
}

export function hitResource(state: WorldState, p: PlayerState, r: ResourceState, cfg: GameConfig, events: GameEvent[]): void {
  const available = resourceAvailable(r, cfg, state.time);
  if (available <= 0) return;
  const tool = toolClassOf(p.inventory[p.selectedSlot]);
  const { item, perHit } = yieldFor(r.kind, tool, cfg);
  if (perHit <= 0) return;
  const amount = Math.min(available, perHit);
  if (amount <= 0) return;

  const notAdded = addItem(p.inventory, item, amount);
  const gained = amount - notAdded;
  if (gained <= 0) {
    events.push({ type: 'inventoryFull', playerId: p.id });
    return;
  }
  // Un recurso roto que se golpea vuelve a estar activo con lo acumulado.
  r.remaining = available - gained;
  r.brokenAt = null;
  p.points += gained * cfg.points.gatherPerUnit;
  events.push({ type: 'resourceHit', playerId: p.id, entityId: r.id, item, amount: gained });
  if (r.remaining <= 0) {
    r.remaining = 0;
    r.brokenAt = state.time;
    events.push({ type: 'resourceBroken', entityId: r.id });
  }
}
