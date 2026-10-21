/**
 * Toda la configuración de balance del juego vive aquí.
 * Los valores vienen del plan de reglas (docs/plan_juego_survival_2d.md);
 * los marcados con (*) son decisiones del constructor dentro de lo que el plan permite.
 */
import type { Biome, CoatId, CreatureKind, ItemId, ResourceKind, Size, ToolClass, WeaponClass } from './types.js';

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
  /** Dónde aparece (por defecto en cualquier terreno firme). */
  biome?: Biome;
  /** Aparecen juntos de `packSize` en `packSize`. */
  packSize?: number;
  /** Cuántos aparecen cerca del jugador al caer la noche (manada nocturna). */
  nightRaid?: number;
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
    /** En nieve el frío baja más: de día y, en vez del multiplicador nocturno normal, de noche. */
    snowColdMult: number;
    snowNightColdMult: number;
    /** Por abrigo puesto. */
    coatColdMult: Record<CoatId, number>;
    thirstRefillPerSec: number;
    campfireWarmthPerSec: number;
    campfireRadius: number;
    healthRegenGood: number;
    healthRegenBase: number;
    goodThreshold: number;
    healthLossPerEmptyBar: number;
    regenDelayAfterDamage: number;
    /** Por debajo de este valor una barra avisa (evento `vitalLow`). */
    lowThreshold: number;
    /** Por debajo de esta vida el cliente muestra la viñeta y el latido. */
    lowHealth: number;
  };
  /** Empujones al golpear y al ser golpeado, y ventana para atribuir la muerte a una criatura. */
  combat: { creatureKnockback: number; playerKnockback: number; lastHitWindow: number };
  /** Radios de luz de noche (en px de mundo). */
  lights: { player: number; torch: number; campfire: number };
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
    diamondCapacity: Record<Size, number>;
    regenSeconds: Record<Size, number>;
    appleYield: Record<Size, number>;
    /** Bayas por arbusto (siempre pequeño). */
    berryYield: number;
    radius: Record<ResourceKind, Record<Size, number>>;
    /** Fracción del radio dibujado que bloquea el paso; el resto del dibujo se puede rozar. */
    collision: Record<ResourceKind, number>;
    /** Fracción del radio que bloquea un recurso roto (tocón o escombro). */
    brokenCollision: number;
    woodPerHit: Record<ToolClass, number>;
    stonePerHit: Record<ToolClass, number>;
    goldPerHit: Record<ToolClass, number>;
    diamondPerHit: Record<ToolClass, number>;
    counts: Record<ResourceKind, number>;
    /** Bioma obligatorio de un recurso; sin entrada, cualquier terreno firme. */
    biome: Partial<Record<ResourceKind, Biome>>;
    /** Recursos que siempre salen del mismo tamaño. */
    fixedSize: Partial<Record<ResourceKind, Size>>;
    minDistFromSpawn: number;
  };
  food: Record<'apple' | 'raw_steak' | 'cooked_steak' | 'raw_fish' | 'cooked_fish' | 'berry', { hunger: number; health: number }>;
  /** `cooks`: qué crudo se convierte en qué cocinado junto a la fogata. */
  campfire: { durationSeconds: number; cookSeconds: number; placeDistance: number; cooks: Partial<Record<ItemId, ItemId>> };
  canteen: { sips: number; thirstPerSip: number };
  fishing: { seconds: number; points: number };
  groundItemSeconds: number;
  groundItemRadius: number;
  creatures: {
    maxActive: number;
    respawnSeconds: number;
    minSpawnDistFromPlayer: number;
    /** La manada nocturna aparece a esta distancia del jugador, a partir de esta noche. */
    nightRaidDist: { min: number; max: number };
    nightRaidFromDay: number;
    defs: Record<CreatureKind, CreatureDef>;
  };
  weaponDamage: Record<WeaponClass, number>;
  recipes: RecipeDef[];
  points: { gatherPerUnit: number; cook: number; dayPassed: number };
}

const treeRadius: Record<Size, number> = { small: 36, medium: 50, large: 70 };

export const DEFAULT_CONFIG: GameConfig = {
  stepSeconds: 1 / 30,
  island: { width: 4500, height: 4500, cellSize: 40, seed: 20261042 }, // (*) 112×112 celdas; el tercio norte es nieve
  dayCycleSeconds: 480,
  daySeconds: 240,
  vitals: {
    drainSeconds: 240,
    nightColdMult: 2, // (*)
    waterColdMult: 2.5, // (*)
    snowColdMult: 2, // (*)
    snowNightColdMult: 3, // (*)
    coatColdMult: { coat1: 0.5, coat2: 0.25 }, // (*)
    thirstRefillPerSec: 25, // (*)
    campfireWarmthPerSec: 20, // (*)
    campfireRadius: 150, // (*)
    healthRegenGood: 2, // (*)
    healthRegenBase: 0.5, // (*)
    goodThreshold: 60, // (*)
    healthLossPerEmptyBar: 2, // (*)
    regenDelayAfterDamage: 5, // (*) sin regen 5 s tras daño: así 7 ataques seguidos de tigre matan
    lowThreshold: 20, // (*)
    lowHealth: 25, // (*)
  },
  combat: { creatureKnockback: 26, playerKnockback: 18, lastHitWindow: 3 }, // (*)
  lights: { player: 150, torch: 380, campfire: 220 }, // (*)
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
    diamondCapacity: { small: 3, medium: 5, large: 8 }, // (*)
    regenSeconds: { small: 60, medium: 120, large: 210 },
    appleYield: { small: 3, medium: 4, large: 6 },
    berryYield: 3, // (*)
    radius: {
      tree: treeRadius,
      apple_tree: treeRadius,
      rock: { small: 28, medium: 40, large: 56 },
      gold_rock: { small: 28, medium: 40, large: 56 },
      diamond_rock: { small: 28, medium: 40, large: 56 },
      berry_bush: { small: 24, medium: 24, large: 24 },
    }, // (*)
    collision: { tree: 0.75, apple_tree: 0.85, rock: 0.9, gold_rock: 0.9, diamond_rock: 0.9, berry_bush: 0.6 }, // (*)
    brokenCollision: 0.5, // (*) el tocón se dibuja a la mitad del radio
    woodPerHit: { hand: 1, wood_pickaxe: 2, stone_pickaxe: 3, gold_pickaxe: 4, diamond_pickaxe: 5 },
    stonePerHit: { hand: 0, wood_pickaxe: 1, stone_pickaxe: 2, gold_pickaxe: 3, diamond_pickaxe: 4 },
    // El oro solo sale con pico de piedra (1 por golpe); el de oro saca 2; el de diamante 3.
    goldPerHit: { hand: 0, wood_pickaxe: 0, stone_pickaxe: 1, gold_pickaxe: 2, diamond_pickaxe: 3 },
    // El diamante solo sale con pico de oro (1) o de diamante (2).
    diamondPerHit: { hand: 0, wood_pickaxe: 0, stone_pickaxe: 0, gold_pickaxe: 1, diamond_pickaxe: 2 },
    counts: { tree: 135, apple_tree: 40, rock: 90, gold_rock: 30, diamond_rock: 8, berry_bush: 30 }, // (*) ×2,25 al pasar de 3000 a 4500
    biome: { apple_tree: 'grass', diamond_rock: 'snow', berry_bush: 'grass' }, // (*)
    fixedSize: { berry_bush: 'small' }, // (*) regenera en 60 s
    minDistFromSpawn: 200, // (*)
  },
  food: {
    apple: { hunger: 20, health: 0 },
    raw_steak: { hunger: 15, health: -10 },
    cooked_steak: { hunger: 45, health: 0 },
    raw_fish: { hunger: 12, health: -5 }, // (*)
    cooked_fish: { hunger: 35, health: 0 }, // (*)
    berry: { hunger: 10, health: 0 }, // (*)
  },
  campfire: { durationSeconds: 90, cookSeconds: 4, placeDistance: 50, cooks: { raw_steak: 'cooked_steak', raw_fish: 'cooked_fish' } },
  canteen: { sips: 3, thirstPerSip: 40 }, // (*)
  fishing: { seconds: 3, points: 5 }, // (*)
  groundItemSeconds: 60,
  groundItemRadius: 14, // (*)
  creatures: {
    maxActive: 26, // (*)
    respawnSeconds: 45,
    minSpawnDistFromPlayer: 600, // (*)
    nightRaidDist: { min: 500, max: 800 }, // (*)
    nightRaidFromDay: 2, // (*) la noche 1 se deja para aprender
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
        biome: 'grass',
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
        biome: 'grass',
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
        biome: 'grass',
      },
      wolf: {
        hp: 25,
        damage: 10, // (*) mata en 10; dos lobos juntos quitan 20/s
        speed: 200, // (*) más rápido que el tigre, más lento que el jugador
        radius: 26, // (*)
        aggroRadius: 420, // (*)
        fleeRadius: 0,
        attackCooldown: 1, // (*)
        loot: [{ item: 'raw_steak', count: 1 }],
        points: 100,
        aggressive: true,
        initialCount: 2, // (*) nativos de la nieve
        biome: 'snow',
        packSize: 2,
        nightRaid: 2,
      },
      polar_bear: {
        hp: 60,
        damage: 20, // mata en 5
        speed: 150, // (*)
        radius: 36, // (*)
        aggroRadius: 300, // (*)
        fleeRadius: 0,
        attackCooldown: 1, // (*)
        loot: [
          { item: 'bear_pelt', count: 1 },
          { item: 'raw_steak', count: 2 },
        ],
        points: 150,
        aggressive: true,
        initialCount: 3, // (*)
        biome: 'snow',
      },
      penguin: {
        hp: 10,
        damage: 0,
        speed: 120, // (*) huye despacio
        radius: 18, // (*)
        aggroRadius: 0,
        fleeRadius: 200, // (*)
        attackCooldown: 1,
        loot: [{ item: 'raw_fish', count: 1 }],
        points: 30,
        aggressive: false,
        initialCount: 4, // (*)
        biome: 'snow',
      },
    },
  },
  weaponDamage: { fist: 1, wood_sword: 2, stone_sword: 3, gold_sword: 4, diamond_sword: 6 }, // (*) oro: tigre 8, oveja 5, duende 2; diamante: tigre 5, oso 10
  recipes: [
    { id: 'wood_pickaxe', cost: { wood: 10 }, points: 25 },
    { id: 'wood_sword', cost: { wood: 30 }, points: 25 },
    { id: 'stone_pickaxe', cost: { wood: 20, stone: 20 }, consumes: 'wood_pickaxe', replaces: 'wood_pickaxe', points: 100 },
    { id: 'stone_sword', cost: { wood: 60, stone: 30 }, consumes: 'wood_sword', replaces: 'wood_sword', points: 100 },
    { id: 'gold_pickaxe', cost: { gold: 20, stone: 10, wood: 30 }, consumes: 'stone_pickaxe', replaces: 'stone_pickaxe', points: 200 },
    { id: 'gold_sword', cost: { gold: 20, stone: 30, wood: 60 }, consumes: 'stone_sword', replaces: 'stone_sword', points: 200 },
    { id: 'diamond_pickaxe', cost: { diamond: 15, gold: 20, stone: 30 }, consumes: 'gold_pickaxe', replaces: 'gold_pickaxe', points: 400 },
    { id: 'diamond_sword', cost: { diamond: 15, gold: 20, wood: 60 }, consumes: 'gold_sword', replaces: 'gold_sword', points: 400 },
    { id: 'campfire', cost: { wood: 15, stone: 5 }, points: 25 },
    { id: 'coat1', cost: { wool: 5, tiger_pelt: 5, needle: 1 }, unique: true, points: 100 },
    { id: 'torch', cost: { wood: 5, stone: 1 }, points: 25 },
    { id: 'canteen', cost: { wood: 10, wool: 5 }, points: 50 },
    { id: 'fishing_rod', cost: { wood: 10, wool: 2 }, points: 50 },
    { id: 'coat2', cost: { bear_pelt: 5, wool: 10, gold: 10, needle: 1 }, consumes: 'coat1', replaces: 'coat1', unique: true, points: 300 },
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
  /** Se dibuja en la mano al seleccionarlo aunque no sea herramienta ni arma. */
  held?: boolean;
  /** El clic lo usa (cantimplora, caña) en vez de golpear. */
  usable?: boolean;
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
  gold_sword: { stackable: false, weapon: 'gold_sword' },
  diamond: { stackable: true },
  diamond_pickaxe: { stackable: false, tool: 'diamond_pickaxe' },
  diamond_sword: { stackable: false, weapon: 'diamond_sword' },
  campfire: { stackable: true, placeable: true },
  coat1: { stackable: false, equippable: true },
  coat2: { stackable: false, equippable: true },
  bear_pelt: { stackable: true },
  raw_fish: { stackable: true, food: true },
  cooked_fish: { stackable: true, food: true },
  berry: { stackable: true, food: true },
  canteen: { stackable: false, usable: true, held: true },
  canteen_full: { stackable: false, usable: true, held: true },
  fishing_rod: { stackable: false, usable: true, held: true },
  torch: { stackable: false, held: true },
};
