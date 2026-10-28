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
  | 'diamond'
  | 'diamond_pickaxe'
  | 'diamond_sword'
  | 'campfire'
  | 'coat1'
  | 'coat2'
  | 'bear_pelt'
  | 'raw_fish'
  | 'cooked_fish'
  | 'berry'
  | 'canteen'
  | 'canteen_full'
  | 'fishing_rod'
  | 'torch'
  | 'bone'
  | 'emerald'
  | 'emerald_pickaxe'
  | 'emerald_sword'
  | 'stone_wall';

export type Size = 'small' | 'medium' | 'large';
/** `gold_rock` solo da oro con pico de piedra o mejor; `diamond_rock` (solo en nieve) solo con pico de oro o mejor. */
/** `emerald_rock` (solo en nieve) solo con pico de diamante o mejor. */
export type ResourceKind = 'tree' | 'apple_tree' | 'rock' | 'gold_rock' | 'diamond_rock' | 'emerald_rock' | 'berry_bush';
export type CreatureKind = 'tiger' | 'sheep' | 'goblin' | 'wolf' | 'polar_bear' | 'penguin' | 'puma' | 'skeleton';
/** `water` son ríos y lagos (caminable, nadando). `sea` es el borde infranqueable. */
export type Terrain = 'sea' | 'land' | 'sand' | 'water' | 'snow';
/** Bioma de una celda firme: nieve o hierba (todo lo demás). */
export type Biome = 'grass' | 'snow';
export type CoatId = 'coat1' | 'coat2';
export type WeaponClass = 'fist' | 'wood_sword' | 'stone_sword' | 'gold_sword' | 'diamond_sword' | 'emerald_sword';
export type ToolClass = 'hand' | 'wood_pickaxe' | 'stone_pickaxe' | 'gold_pickaxe' | 'diamond_pickaxe' | 'emerald_pickaxe';
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
  /** Montar la criatura domada propia más cercana, o bajarse si ya va montado. */
  | { type: 'mount' }
  /** Correr (solo cambia algo montado). */
  | { type: 'run'; on: boolean }
  /** Órdenes a una criatura domada propia: renombrar, dormir (invulnerable, se cura rápido) o llamar (viene corriendo). */
  | { type: 'rename'; entityId: EntityId; name: string }
  | { type: 'petSleep'; entityId: EntityId }
  | { type: 'petCall'; entityId: EntityId }
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
  /** El jugador domó una criatura (ahora `owner` es él). */
  | { type: 'creatureTamed'; playerId: EntityId; entityId: EntityId; kind: CreatureKind }
  /** Una criatura domada mordió a otra; `playerId` es su dueño. */
  | { type: 'petHit'; playerId: EntityId; entityId: EntityId; amount: number }
  /** Progreso hacia la siguiente casilla del inventario (`kills` de `needed`). */
  | { type: 'slotProgress'; playerId: EntityId; kills: number; needed: number }
  /** El inventario ganó una casilla; `slots` es el total nuevo. */
  | { type: 'slotUnlocked'; playerId: EntityId; slots: number }
  | { type: 'petRenamed'; playerId: EntityId; entityId: EntityId; name: string }
  | { type: 'mounted'; playerId: EntityId; entityId: EntityId }
  | { type: 'dismounted'; playerId: EntityId }
  /** Murió una criatura domada de `playerId` (sin botín ni reaparición). */
  | { type: 'petDied'; playerId: EntityId; entityId: EntityId; kind: CreatureKind }
  | { type: 'crafted'; playerId: EntityId; recipeId: ItemId }
  | { type: 'campfirePlaced'; playerId: EntityId; entityId: EntityId }
  | { type: 'cooked'; playerId: EntityId }
  | { type: 'ate'; playerId: EntityId; item: ItemId }
  | { type: 'coatToggled'; playerId: EntityId; on: boolean }
  | { type: 'canteenFilled'; playerId: EntityId }
  | { type: 'drank'; playerId: EntityId }
  | { type: 'fishingStarted'; playerId: EntityId }
  | { type: 'fished'; playerId: EntityId }
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
  /** Instante en que sale el pez (0 = no está pescando). */
  fishingUntil: number;
  /** Pingüinos matados desde la última casilla ganada (ver `config.slotReward`). */
  slotKills: number;
  /** Criatura domada que monta (null = a pie). Montado va donde va ella y no puede golpear ni fabricar. */
  mount: EntityId | null;
  /** Corriendo (Shift): montado usa `riding.runSpeed`. */
  running: boolean;
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

/**
 * Solo de criaturas domadas: `follow` sigue al dueño, `hunt` persigue a una criatura, `ride` lleva al dueño encima,
 * `sleep` duerme donde está (invulnerable, se cura rápido) y `come` viene corriendo al dueño tras llamarla.
 */
export type CreatureMode = 'wander' | 'chase' | 'flee' | 'attack' | 'follow' | 'hunt' | 'ride' | 'sleep' | 'come';

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
  /** Jugador que la domó; null si es salvaje. */
  owner: EntityId | null;
  /** Nombre que le puso el dueño (vacío si es salvaje). */
  name: string;
  /** Segundos sin avanzar mientras viene al dueño (`come`); pasado `taming.callStuckSeconds` aparece a su lado. */
  stuckFor: number;
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
