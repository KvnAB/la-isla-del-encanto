import { describe, expect, it } from 'vitest';
import { availableRecipes, craft } from '../src/systems/crafting.js';
import { makeWorld, setInventory } from './helpers.js';
import type { Slot } from '../src/types.js';

function playerWith(slots: (Slot | null)[]) {
  const { world, id } = makeWorld();
  setInventory(world, id, slots);
  return { world, id, p: world.player(id) };
}

describe('recetas disponibles', () => {
  it('con 10 de madera solo el pico de madera', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 10 }]);
    expect(availableRecipes(p.inventory, world.cfg)).toEqual(['wood_pickaxe']);
  });

  it('con 30 de madera pico y espada, en el orden de la config', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 30 }]);
    expect(availableRecipes(p.inventory, world.cfg)).toEqual(['wood_pickaxe', 'wood_sword']);
  });

  it('pico de piedra requiere tener el pico de madera aunque sobren materiales', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 20 }, { item: 'stone', count: 20 }]);
    expect(availableRecipes(p.inventory, world.cfg)).not.toContain('stone_pickaxe');
  });

  it('abrigo no disponible si ya se tiene uno', () => {
    const { p, world } = playerWith([
      { item: 'wool', count: 5 },
      { item: 'tiger_pelt', count: 5 },
      { item: 'needle', count: 1 },
      { item: 'coat1', count: 1 },
    ]);
    expect(availableRecipes(p.inventory, world.cfg)).not.toContain('coat1');
  });

  it('fogata con 15 madera y 5 piedra', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 15 }, { item: 'stone', count: 5 }]);
    expect(availableRecipes(p.inventory, world.cfg)).toContain('campfire');
  });
});

describe('craft', () => {
  it('pico de madera: resta 10 madera, añade pico, +25 puntos, evento crafted', () => {
    const { p, world, id } = playerWith([{ item: 'wood', count: 10 }]);
    world.enqueue({ playerId: id, type: 'craft', recipeId: 'wood_pickaxe' });
    world.step();
    expect(p.inventory[0]).toEqual({ item: 'wood_pickaxe', count: 1 });
    expect(p.inventory.filter((s) => s?.item === 'wood')).toHaveLength(0);
    expect(p.points).toBe(25);
    expect(world.drainEvents()).toContainEqual({ type: 'crafted', playerId: id, recipeId: 'wood_pickaxe' });
  });

  it('pico de piedra reemplaza al de madera en su mismo slot y da 100 puntos', () => {
    const { p, world } = playerWith([
      { item: 'wood', count: 20 },
      { item: 'stone', count: 20 },
      null,
      { item: 'wood_pickaxe', count: 1 },
    ]);
    const events: never[] = [];
    expect(craft(p, 'stone_pickaxe', world.cfg, events)).toBe(true);
    expect(p.inventory[3]).toEqual({ item: 'stone_pickaxe', count: 1 });
    expect(p.inventory[0]).toBeNull();
    expect(p.inventory[1]).toBeNull();
    expect(p.points).toBe(100);
  });

  it('espada de piedra reemplaza a la de madera', () => {
    const { p, world } = playerWith([{ item: 'wood_sword', count: 1 }, { item: 'wood', count: 60 }, { item: 'stone', count: 30 }]);
    expect(craft(p, 'stone_sword', world.cfg, [])).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'stone_sword', count: 1 });
  });

  it('receta no disponible devuelve false y no cambia nada', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 9 }]);
    expect(craft(p, 'wood_pickaxe', world.cfg, [])).toBe(false);
    expect(p.inventory[0]).toEqual({ item: 'wood', count: 9 });
    expect(p.points).toBe(0);
  });

  it('fogata se apila con fogatas existentes', () => {
    const { p, world } = playerWith([{ item: 'wood', count: 15 }, { item: 'stone', count: 5 }, { item: 'campfire', count: 1 }]);
    expect(craft(p, 'campfire', world.cfg, [])).toBe(true);
    expect(p.inventory[2]).toEqual({ item: 'campfire', count: 2 });
  });

  it('con inventario lleno de otros tipos no se puede fabricar algo nuevo', () => {
    const { p, world } = playerWith([
      { item: 'wood', count: 10 },
      { item: 'stone', count: 1 },
      { item: 'apple', count: 1 },
      { item: 'wool', count: 1 },
      { item: 'needle', count: 1 },
      { item: 'tiger_pelt', count: 1 },
      { item: 'raw_steak', count: 1 },
      { item: 'cooked_steak', count: 1 },
    ]);
    // la madera se consume entera y libera el slot, así que sí cabe
    expect(craft(p, 'wood_pickaxe', world.cfg, [])).toBe(true);
    expect(p.inventory.some((s) => s?.item === 'wood_pickaxe')).toBe(true);
  });
});

describe('abrigo nivel 2', () => {
  it('cuesta 5 piel de oso + 10 lana + 10 oro + 1 aguja, sustituye al abrigo 1 en su slot y queda puesto', () => {
    const { world, id } = makeWorld();
    const p = world.player(id);
    setInventory(world, id, [
      { item: 'wood_pickaxe', count: 1 },
      { item: 'coat1', count: 1 },
      { item: 'bear_pelt', count: 5 },
      { item: 'wool', count: 10 },
      { item: 'gold', count: 10 },
      { item: 'needle', count: 1 },
    ]);
    p.coatOn = false;
    expect(availableRecipes(p.inventory, world.cfg)).toContain('coat2');
    expect(craft(p, 'coat2', world.cfg, [])).toBe(true);
    expect(p.inventory[1]).toEqual({ item: 'coat2', count: 1 });
    expect(p.inventory.filter((s) => s?.item === 'coat1')).toHaveLength(0);
    expect(p.inventory.filter((s) => s?.item === 'bear_pelt' || s?.item === 'gold' || s?.item === 'needle' || s?.item === 'wool')).toHaveLength(0);
    expect(p.coatOn).toBe(true);
    expect(p.points).toBe(300);
    expect(availableRecipes(p.inventory, world.cfg)).not.toContain('coat2');
  });

  it('sin abrigo 1 no se puede fabricar el 2', () => {
    const { world, id } = makeWorld();
    const p = world.player(id);
    setInventory(world, id, [
      { item: 'bear_pelt', count: 5 },
      { item: 'wool', count: 10 },
      { item: 'gold', count: 10 },
      { item: 'needle', count: 1 },
    ]);
    expect(availableRecipes(p.inventory, world.cfg)).not.toContain('coat2');
  });
});
