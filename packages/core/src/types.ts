export type ItemId =
  | 'wood'
  | 'stone'
  | 'gold'
  | 'apple'
  | 'raw_steak'
  | 'cooked_steak'
  | 'wool'
  | 'tiger_pelt'
  | 'needle'
  | 'wood_pickaxe'
  | 'wood_sword'
  | 'stone_pickaxe'
  | 'stone_sword'
  | 'gold_pickaxe'
  | 'gold_sword'
  | 'campfire'
  | 'coat1'
  | 'torch';

export type Size = 'small' | 'medium' | 'large';
/** `gold_rock` solo da oro con pico de piedra o mejor. */
export type ResourceKind = 'tree' | 'apple_tree' | 'rock' | 'gold_rock';
export type CreatureKind = 'tiger' | 'sheep' | 'goblin' | 'wolf';
/** `water` son ríos y lagos (caminable, nadando). `sea` es el borde infranqueable. */
export type Terrain = 'sea' | 'land' | 'sand' | 'water' | 'snow';
/** Bioma de una celda firme: nieve o hierba (todo lo demás). */
export type Biome = 'grass' | 'snow';
export type WeaponClass = 'fist' | 'wood_sword' | 'stone_sword' | 'gold_sword';
export type ToolClass = 'hand' | 'wood_pickaxe' | 'stone_pickaxe' | 'gold_pickaxe';
export type EntityId = number;
export type StartItem = 'wood_pickaxe' | 'wood_sword';

/** Por qué murió el jugador: la criatura que lo golpeó hace poco, o la primera barra vacía. */
export type DeathCause = { kind: 'creature'; creature: CreatureKind } | { kind: 'hunger' | 'thirst' | 'cold' };

export type Command = { playerId: EntityId } & (
  | { type: 'move'; dx: number; dy: number }
  | { type: 'aim'; angle: number }
  | { type: 'hit' }
  | { type: 'selectSlot'; slot: number }
  | { type: 'useSlot' }
  | { type: 'dropSlot'; slot: number }
  | { type: 'craft'; recipeId: ItemId }
);

export type GameEvent =
  | { type: 'resourceHit'; playerId: EntityId; entityId: EntityId; item: ItemId; amount: number }
  | { type: 'resourceBroken'; entityId: EntityId }
  | { type: 'itemPicked'; playerId: EntityId; item: ItemId; amount: number }
  | { type: 'inventoryFull'; playerId: EntityId }
  | { type: 'itemDropped'; playerId: EntityId; item: ItemId; amount: number }
  | { type: 'creatureHit'; playerId: EntityId; entityId: EntityId; amount: number }
  | { type: 'creatureDied'; playerId: EntityId; entityId: EntityId; kind: CreatureKind }
  | { type: 'creatureSpawned'; entityId: EntityId; kind: CreatureKind }
  | { type: 'creatureDespawned'; entityId: EntityId; kind: CreatureKind }
  | { type: 'crafted'; playerId: EntityId; recipeId: ItemId }
  | { type: 'campfirePlaced'; playerId: EntityId; entityId: EntityId }
  | { type: 'cooked'; playerId: EntityId }
  | { type: 'ate'; playerId: EntityId; item: ItemId }
  | { type: 'coatToggled'; playerId: EntityId; on: boolean }
  | { type: 'playerDamaged'; playerId: EntityId; amount: number; byEntityId: EntityId }
  | { type: 'dayPassed'; day: number }
  | { type: 'nightFell'; day: number }
  | { type: 'vitalLow'; playerId: EntityId; bar: 'hunger' | 'thirst' | 'warmth' }
  | { type: 'playerDied'; playerId: EntityId; days: number; points: number; cause: DeathCause };

export interface Slot {
  item: ItemId;
  count: number;
}

export interface PlayerState {
  id: EntityId;
  name: string;
  x: number;
  y: number;
  angle: number;
  radius: number;
  health: number;
  hunger: number;
  thirst: number;
  warmth: number;
  inventory: (Slot | null)[];
  selectedSlot: number;
  /** El abrigo solo abriga si está puesto; se pone/quita usando su slot. */
  coatOn: boolean;
  points: number;
  inWater: boolean;
  alive: boolean;
  hitCooldown: number;
  /** 0..1, animación de golpe (1 justo al golpear, decrece a 0). */
  swing: number;
  moveDx: number;
  moveDy: number;
  cookTimer: number;
  noRegenUntil: number;
  /** Última criatura que lo golpeó y cuándo (para la causa de muerte). */
  lastHitBy: CreatureKind | null;
  lastHitAt: number;
}

export interface ResourceState {
  id: EntityId;
  kind: ResourceKind;
  size: Size;
  x: number;
  y: number;
  radius: number;
  remaining: number;
  brokenAt: number | null;
}

export type CreatureMode = 'wander' | 'chase' | 'flee' | 'attack';

export interface CreatureState {
  id: EntityId;
  kind: CreatureKind;
  x: number;
  y: number;
  angle: number;
  radius: number;
  hp: number;
  mode: CreatureMode;
  targetX: number;
  targetY: number;
  attackCooldown: number;
  wanderTimer: number;
  /** Miembro de una manada nocturna: desaparece al amanecer y no reaparece. */
  raid: boolean;
}

export interface GroundItemState {
  id: EntityId;
  item: ItemId;
  count: number;
  x: number;
  y: number;
  expiresAt: number;
}

export interface CampfireState {
  id: EntityId;
  x: number;
  y: number;
  expiresAt: number;
}

export interface IslandMap {
  width: number;
  height: number;
  cellSize: number;
  cols: number;
  rows: number;
  cells: Terrain[];
  spawnX: number;
  spawnY: number;
}

export interface WorldState {
  tick: number;
  time: number;
  day: number;
  isNight: boolean;
  phaseRemaining: number;
  map: IslandMap;
  players: PlayerState[];
  resources: ResourceState[];
  creatures: CreatureState[];
  groundItems: GroundItemState[];
  campfires: CampfireState[];
  respawnQueue: { kind: CreatureKind; at: number }[];
  nextEntityId: number;
}
