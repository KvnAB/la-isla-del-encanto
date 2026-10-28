import { DEFAULT_CONFIG, type GameConfig } from '../src/config.js';
import { World } from '../src/world.js';
import type { CreatureKind, EntityId, GroundItemState, ItemId, ResourceKind, Size, Slot } from '../src/types.js';
import { terrainAt } from '../src/island.js';
import { resourceCapacity } from '../src/systems/resources.js';

export function makeWorld(seed = 7, cfg: GameConfig = DEFAULT_CONFIG): { world: World; id: EntityId } {
  const world = new World(seed, cfg);
  const id = world.addPlayer('Ana', 'wood_pickaxe');
  return { world, id };
}

/** Coloca al jugador en una posición y limpia su inventario y cooldowns. */
export function placePlayerAt(world: World, id: EntityId, x: number, y: number): void {
  const p = world.player(id);
  p.x = x;
  p.y = y;
  p.moveDx = 0;
  p.moveDy = 0;
  p.hitCooldown = 0;
}

export function setInventory(world: World, id: EntityId, slots: (Slot | null)[]): void {
  const p = world.player(id);
  p.inventory = Array.from({ length: world.cfg.player.inventorySlots }, (_, i) => slots[i] ?? null);
}

export function putResource(world: World, kind: ResourceKind, size: Size, x: number, y: number, remaining?: number) {
  const s = world.getState();
  const cfg = world.cfg;
  const cap = resourceCapacity(kind, size, cfg);
  const r = {
    id: s.nextEntityId++,
    kind,
    size,
    x,
    y,
    radius: cfg.resources.radius[kind][size],
    remaining: remaining ?? cap,
    brokenAt: null as number | null,
  };
  s.resources.push(r);
  return r;
}

export function putCreature(world: World, kind: CreatureKind, x: number, y: number) {
  const s = world.getState();
  const def = world.cfg.creatures.defs[kind];
  const c = {
    id: s.nextEntityId++,
    kind,
    x,
    y,
    angle: 0,
    radius: def.radius,
    hp: def.hp,
    mode: 'wander' as const,
    targetX: x,
    targetY: y,
    attackCooldown: 0,
    wanderTimer: 0,
    raid: false,
    owner: null,
    name: '',
    stuckFor: 0,
  };
  s.creatures.push(c);
  return c;
}

export function putGroundItem(world: World, item: ItemId, count: number, x: number, y: number): GroundItemState {
  const s = world.getState();
  const g: GroundItemState = { id: s.nextEntityId++, item, count, x, y, expiresAt: s.time + world.cfg.groundItemSeconds };
  s.groundItems.push(g);
  return g;
}

/** Vacía el mundo de recursos y criaturas para tests aislados. */
export function clearWorld(world: World): void {
  const s = world.getState();
  s.resources.length = 0;
  s.creatures.length = 0;
  s.groundItems.length = 0;
  s.campfires.length = 0;
  s.respawnQueue.length = 0;
}

/** Busca un punto de tierra cuyo vecino a `dist` px en +x sea del terreno pedido. */
export function findLandNextTo(world: World, target: 'sea' | 'water', dist: number): { x: number; y: number } {
  const map = world.getState().map;
  for (let r = 1; r < map.rows - 1; r++) {
    for (let c = 1; c < map.cols - 1; c++) {
      const x = (c + 0.5) * map.cellSize;
      const y = (r + 0.5) * map.cellSize;
      if (terrainAt(map, x, y) !== 'land') continue;
      if (terrainAt(map, x + dist, y) === target && terrainAt(map, x - map.cellSize, y) === 'land') return { x, y };
    }
  }
  throw new Error('no se encontró tierra junto a ' + target);
}

export function findTerrainCell(world: World, target: 'water' | 'land' | 'snow'): { x: number; y: number } {
  const map = world.getState().map;
  for (let r = 2; r < map.rows - 2; r++) {
    for (let c = 2; c < map.cols - 2; c++) {
      const x = (c + 0.5) * map.cellSize;
      const y = (r + 0.5) * map.cellSize;
      if (terrainAt(map, x, y) !== target) continue;
      // todas las vecinas (3x3) iguales para que el círculo quepa entero
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (terrainAt(map, x + dc * map.cellSize, y + dr * map.cellSize) !== target) {
            ok = false;
            break;
          }
      if (ok) return { x, y };
    }
  }
  throw new Error('no se encontró celda ' + target);
}
