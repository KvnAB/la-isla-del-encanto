import { describe, expect, it } from 'vitest';
import { coatWorn } from '../src/systems/vitals.js';
import { clearWorld, makeWorld, placePlayerAt, setInventory } from './helpers.js';

function withCoat() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, [{ item: 'coat1', count: 1 }]);
  const p = world.player(id);
  p.selectedSlot = 0;
  return { world, id, p };
}

function use(world: ReturnType<typeof makeWorld>['world'], id: number) {
  world.player(id).hitCooldown = 0;
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

describe('abrigo', () => {
  it('empieza puesto y usar su slot lo quita y lo vuelve a poner sin consumirlo', () => {
    const { world, id, p } = withCoat();
    expect(coatWorn(p)).toBe(true);
    use(world, id);
    expect(p.coatOn).toBe(false);
    expect(coatWorn(p)).toBe(false);
    expect(world.drainEvents()).toContainEqual({ type: 'coatToggled', playerId: id, on: false });
    use(world, id);
    expect(coatWorn(p)).toBe(true);
    expect(p.inventory[0]).toEqual({ item: 'coat1', count: 1 });
  });

  it('quitado no abriga: de noche el frío baja el doble', () => {
    const { world, id, p } = withCoat();
    use(world, id);
    world.stepSeconds(240.5);
    p.hunger = p.thirst = p.warmth = 100;
    world.stepSeconds(60);
    expect(p.warmth).toBeCloseTo(50, 0);
  });

  it('sin abrigo en el inventario no abriga aunque coatOn sea true', () => {
    const { world, id, p } = withCoat();
    setInventory(world, id, []);
    expect(p.coatOn).toBe(true);
    expect(coatWorn(p)).toBe(false);
  });
});
