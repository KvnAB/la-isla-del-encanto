export type ItemId =
  | 'wood'
  | 'stone'
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
  | 'campfire'
  | 'coat1';

export type Size = 'small' | 'medium' | 'large';
export type ResourceKind = 'tree' | 'apple_tree' | 'rock';
export type CreatureKind = 'tiger' | 'sheep' | 'goblin';
/** `water` son ríos y lagos (caminable, nadando). `sea` es el borde infranqueable. */
export type Terrain = 'sea' | 'land' | 'sand' | 'water';
export type WeaponClass = 'fist' | 'wood_sword' | 'stone_sword';
export type ToolClass = 'hand' | 'wood_pickaxe' | 'stone_pickaxe';
export type EntityId = number;
export type StartItem = 'wood_pickaxe' | 'wood_sword';

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
  | { type: 'creatureHit'; playerId: EntityId; entityId: EntityId }
  | { type: 'creatureDied'; playerId: EntityId; entityId: EntityId; kind: CreatureKind }
  | { type: 'creatureSpawned'; entityId: EntityId; kind: CreatureKind }
  | { type: 'crafted'; playerId: EntityId; recipeId: ItemId }
  | { type: 'campfirePlaced'; playerId: EntityId; entityId: EntityId }
  | { type: 'cooked'; playerId: EntityId }
  | { type: 'ate'; playerId: EntityId; item: ItemId }
  | { type: 'playerDamaged'; playerId: EntityId; amount: number; byEntityId: EntityId }
  | { type: 'dayPassed'; day: number }
  | { type: 'playerDied'; playerId: EntityId; days: number; points: number };

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
