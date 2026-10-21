/**
 * Toda la configuración de balance del juego vive aquí.
 * Los valores vienen del plan de reglas (docs/plan_juego_survival_2d.md);
 * los marcados con (*) son decisiones del constructor dentro de lo que el plan permite.
 */
import type { CreatureKind, ItemId, ResourceKind, Size, ToolClass, WeaponClass } from './types.js';

export interface RecipeDef {
  id: ItemId;
  cost: Partial<Record<ItemId, number>>;
  /** Objeto que se consume además del coste (y cuyo slot ocupa el resultado). */
  consumes?: ItemId;
  replaces?: ItemId;
  /** Solo se puede tener uno a la vez. */
  unique?: boolean;
  points: number;
}

export interface CreatureDef {
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  aggroRadius: number;
  fleeRadius: number;
  attackCooldown: number;
  loot: { item: ItemId; count: number }[];
  points: number;
  aggressive: boolean;
  initialCount: number;
}

export interface GameConfig {
  stepSeconds: number;
  /** `seed` fija la isla: todas las partidas (y todos los jugadores) comparten el mismo mapa. */
  island: { width: number; height: number; cellSize: number; seed: number };
  dayCycleSeconds: number;
  daySeconds: number;
  vitals: {
    drainSeconds: number;
    nightColdMult: number;
    waterColdMult: number;
    coatColdMult: number;
    thirstRefillPerSec: number;
    campfireWarmthPerSec: number;
    campfireRadius: number;
    healthRegenGood: number;
    healthRegenBase: number;
    goodThreshold: number;
    healthLossPerEmptyBar: number;
    regenDelayAfterDamage: number;
  };
  player: {
    speed: number;
    waterSpeedMult: number;
    radius: number;
    reach: number;
    hitCooldown: number;
    hitArc: number;
    inventorySlots: number;
  };
  resources: {
    capacity: Record<Size, number>;
    goldCapacity: Record<Size, number>;
    regenSeconds: Record<Size, number>;
    appleYield: Record<Size, number>;
    radius: Record<ResourceKind, Record<Size, number>>;
    woodPerHit: Record<ToolClass, number>;
    stonePerHit: Record<ToolClass, number>;
    goldPerHit: Record<ToolClass, number>;
    counts: Record<ResourceKind, number>;
    minDistFromSpawn: number;
  };
  food: Record<'apple' | 'raw_steak' | 'cooked_steak', { hunger: number; health: number }>;
  campfire: { durationSeconds: number; cookSeconds: number; placeDistance: number };
  groundItemSeconds: number;
  groundItemRadius: number;
  creatures: {
    maxActive: number;
    respawnSeconds: number;
    minSpawnDistFromPlayer: number;
    defs: Record<CreatureKind, CreatureDef>;
  };
  weaponDamage: Record<WeaponClass, number>;
  recipes: RecipeDef[];
  points: { gatherPerUnit: number; cook: number; dayPassed: number };
}

const treeRadius: Record<Size, number> = { small: 36, medium: 50, large: 70 };

export const DEFAULT_CONFIG: GameConfig = {
  stepSeconds: 1 / 30,
  island: { width: 3000, height: 3000, cellSize: 40, seed: 20261042 }, // (*)
  dayCycleSeconds: 480,
  daySeconds: 240,
  vitals: {
    drainSeconds: 240,
    nightColdMult: 2, // (*)
    waterColdMult: 2.5, // (*)
    coatColdMult: 0.5, // (*)
    thirstRefillPerSec: 25, // (*)
    campfireWarmthPerSec: 20, // (*)
    campfireRadius: 150, // (*)
    healthRegenGood: 2, // (*)
    healthRegenBase: 0.5, // (*)
    goodThreshold: 60, // (*)
    healthLossPerEmptyBar: 2, // (*)
    regenDelayAfterDamage: 5, // (*) sin regen 5 s tras daño: así 7 ataques seguidos de tigre matan
  },
  player: {
    speed: 220, // (*)
    waterSpeedMult: 0.5, // (*)
    radius: 22, // (*)
    reach: 70, // (*)
    hitCooldown: 0.4, // (*)
    hitArc: Math.PI / 2, // (*)
    inventorySlots: 12,
  },
  resources: {
    capacity: { small: 20, medium: 50, large: 100 },
    goldCapacity: { small: 6, medium: 12, large: 20 }, // (*)
    regenSeconds: { small: 60, medium: 120, large: 210 },
    appleYield: { small: 3, medium: 4, large: 6 },
    radius: {
      tree: treeRadius,
      apple_tree: treeRadius,
      rock: { small: 28, medium: 40, large: 56 },
      gold_rock: { small: 28, medium: 40, large: 56 },
    }, // (*)
    woodPerHit: { hand: 1, wood_pickaxe: 2, stone_pickaxe: 3, gold_pickaxe: 4 },
    stonePerHit: { hand: 0, wood_pickaxe: 1, stone_pickaxe: 2, gold_pickaxe: 3 },
    // El oro solo sale con pico de piedra (1 por golpe); el de oro saca 2.
    goldPerHit: { hand: 0, wood_pickaxe: 0, stone_pickaxe: 1, gold_pickaxe: 2 },
    counts: { tree: 60, apple_tree: 18, rock: 40, gold_rock: 14 }, // (*)
    minDistFromSpawn: 200, // (*)
  },
  food: {
    apple: { hunger: 20, health: 0 },
    raw_steak: { hunger: 15, health: -10 },
    cooked_steak: { hunger: 45, health: 0 },
  },
  campfire: { durationSeconds: 90, cookSeconds: 4, placeDistance: 50 },
  groundItemSeconds: 60,
  groundItemRadius: 14, // (*)
  creatures: {
    maxActive: 12, // (*)
    respawnSeconds: 45,
    minSpawnDistFromPlayer: 600, // (*)
    defs: {
      tiger: {
        hp: 30,
        damage: 100 / 7,
        speed: 180, // (*)
        radius: 30, // (*)
        aggroRadius: 350, // (*)
        fleeRadius: 0,
        attackCooldown: 1, // (*)
        loot: [
          { item: 'tiger_pelt', count: 1 },
          { item: 'raw_steak', count: 1 },
        ],
        points: 80,
        aggressive: true,
        initialCount: 3, // (*)
      },
      sheep: {
        hp: 20,
        damage: 12.5,
        speed: 170, // (*)
        radius: 26, // (*)
        aggroRadius: 300, // (*)
        fleeRadius: 0,
        attackCooldown: 1, // (*)
        loot: [{ item: 'wool', count: 2 }],
        points: 40,
        aggressive: true,
        initialCount: 4, // (*)
      },
      goblin: {
        hp: 8,
        damage: 0,
        speed: 280, // (*)
        radius: 16, // (*)
        aggroRadius: 0,
        fleeRadius: 250, // (*)
        attackCooldown: 1,
        loot: [{ item: 'needle', count: 1 }],
        points: 60,
        aggressive: false,
        initialCount: 3, // (*)
      },
    },
  },
  weaponDamage: { fist: 1, wood_sword: 2, stone_sword: 3 },
  recipes: [
    { id: 'wood_pickaxe', cost: { wood: 10 }, points: 25 },
    { id: 'wood_sword', cost: { wood: 30 }, points: 25 },
    { id: 'stone_pickaxe', cost: { wood: 20, stone: 20 }, consumes: 'wood_pickaxe', replaces: 'wood_pickaxe', points: 100 },
    { id: 'stone_sword', cost: { wood: 60, stone: 30 }, consumes: 'wood_sword', replaces: 'wood_sword', points: 100 },
    { id: 'gold_pickaxe', cost: { gold: 20, stone: 10, wood: 30 }, consumes: 'stone_pickaxe', replaces: 'stone_pickaxe', points: 200 },
    { id: 'campfire', cost: { wood: 15, stone: 5 }, points: 25 },
    { id: 'coat1', cost: { wool: 5, tiger_pelt: 5, needle: 1 }, unique: true, points: 100 },
  ],
  points: { gatherPerUnit: 1, cook: 10, dayPassed: 250 },
};

export interface ItemMeta {
  stackable: boolean;
  weapon?: WeaponClass;
  tool?: ToolClass;
  food?: boolean;
  placeable?: boolean;
  /** Se pone y se quita usando el slot (clic). */
  equippable?: boolean;
}

export const ITEM_META: Record<ItemId, ItemMeta> = {
  wood: { stackable: true },
  stone: { stackable: true },
  gold: { stackable: true },
  apple: { stackable: true, food: true },
  raw_steak: { stackable: true, food: true },
  cooked_steak: { stackable: true, food: true },
  wool: { stackable: true },
  tiger_pelt: { stackable: true },
  needle: { stackable: true },
  wood_pickaxe: { stackable: false, tool: 'wood_pickaxe' },
  wood_sword: { stackable: false, weapon: 'wood_sword' },
  stone_pickaxe: { stackable: false, tool: 'stone_pickaxe' },
  stone_sword: { stackable: false, weapon: 'stone_sword' },
  gold_pickaxe: { stackable: false, tool: 'gold_pickaxe' },
  campfire: { stackable: true, placeable: true },
  coat1: { stackable: false, equippable: true },
};
