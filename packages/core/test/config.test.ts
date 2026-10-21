import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META } from '../src/config.js';

describe('DEFAULT_CONFIG reproduce los valores del plan', () => {
  const c = DEFAULT_CONFIG;

  it('ciclo de día de 8 minutos, mitad día', () => {
    expect(c.dayCycleSeconds).toBe(480);
    expect(c.daySeconds).toBe(240);
  });

  it('capacidades y regeneración de recursos', () => {
    expect(c.resources.capacity).toEqual({ small: 20, medium: 50, large: 100 });
    expect(c.resources.regenSeconds).toEqual({ small: 60, medium: 120, large: 210 });
    expect(c.resources.appleYield).toEqual({ small: 3, medium: 4, large: 6 });
  });

  it('rendimiento por herramienta', () => {
    expect(c.resources.woodPerHit).toEqual({ hand: 1, wood_pickaxe: 2, stone_pickaxe: 3, gold_pickaxe: 4 });
    expect(c.resources.stonePerHit).toEqual({ hand: 0, wood_pickaxe: 1, stone_pickaxe: 2, gold_pickaxe: 3 });
    expect(c.resources.goldPerHit).toEqual({ hand: 0, wood_pickaxe: 0, stone_pickaxe: 1, gold_pickaxe: 2 });
  });

  it('barras vacías en 4 minutos, objetos en el suelo 1 minuto, reaparición 45 s', () => {
    expect(c.vitals.drainSeconds).toBe(240);
    expect(c.groundItemSeconds).toBe(60);
    expect(c.creatures.respawnSeconds).toBe(45);
    expect(c.campfire.durationSeconds).toBe(90);
    expect(c.campfire.cookSeconds).toBe(4);
  });

  it('recetas con sus costes', () => {
    const byId = Object.fromEntries(c.recipes.map((r) => [r.id, r]));
    expect(byId.wood_pickaxe.cost).toEqual({ wood: 10 });
    expect(byId.wood_sword.cost).toEqual({ wood: 30 });
    expect(byId.stone_pickaxe.cost).toEqual({ wood: 20, stone: 20 });
    expect(byId.stone_pickaxe.consumes).toBe('wood_pickaxe');
    expect(byId.stone_sword.cost).toEqual({ wood: 60, stone: 30 });
    expect(byId.stone_sword.consumes).toBe('wood_sword');
    expect(byId.campfire.cost).toEqual({ wood: 15, stone: 5 });
    expect(byId.coat1.cost).toEqual({ wool: 5, tiger_pelt: 5, needle: 1 });
    expect(byId.coat1.unique).toBe(true);
    expect(byId.wood_pickaxe.points).toBe(25);
    expect(byId.stone_sword.points).toBe(100);
  });

  it('golpes para matar derivados de hp y daño coinciden con el plan', () => {
    const d = c.weaponDamage;
    const hits = (hp: number) => [Math.ceil(hp / d.fist), Math.ceil(hp / d.wood_sword), Math.ceil(hp / d.stone_sword)];
    expect(hits(c.creatures.defs.tiger.hp)).toEqual([30, 15, 10]);
    expect(hits(c.creatures.defs.sheep.hp)).toEqual([20, 10, 7]);
    expect(hits(c.creatures.defs.goblin.hp)).toEqual([8, 4, 3]);
  });

  it('daño de criaturas: tigre mata en 7, oveja en 8, duende 0', () => {
    expect(Math.ceil(100 / c.creatures.defs.tiger.damage)).toBe(7);
    expect(Math.ceil(100 / c.creatures.defs.sheep.damage)).toBe(8);
    expect(c.creatures.defs.goblin.damage).toBe(0);
  });

  it('velocidades relativas', () => {
    expect(c.creatures.defs.tiger.speed).toBeLessThan(c.player.speed);
    expect(c.creatures.defs.sheep.speed).toBeLessThan(c.player.speed);
    expect(c.creatures.defs.goblin.speed).toBeGreaterThan(c.player.speed);
  });

  it('puntos', () => {
    expect(c.points).toEqual({ gatherPerUnit: 1, cook: 10, dayPassed: 250 });
    expect(c.creatures.defs.sheep.points).toBe(40);
    expect(c.creatures.defs.goblin.points).toBe(60);
    expect(c.creatures.defs.tiger.points).toBe(80);
  });

  it('comida', () => {
    expect(c.food.apple).toEqual({ hunger: 20, health: 0 });
    expect(c.food.raw_steak).toEqual({ hunger: 15, health: -10 });
    expect(c.food.cooked_steak).toEqual({ hunger: 45, health: 0 });
  });

  it('ITEM_META clasifica herramientas, armas, comida y colocables', () => {
    expect(ITEM_META.wood_pickaxe.tool).toBe('wood_pickaxe');
    expect(ITEM_META.stone_sword.weapon).toBe('stone_sword');
    expect(ITEM_META.apple.food).toBe(true);
    expect(ITEM_META.campfire.placeable).toBe(true);
    expect(ITEM_META.wood.stackable).toBe(true);
    expect(ITEM_META.wood_sword.stackable).toBe(false);
  });
});
