import { describe, expect, it } from 'vitest';
import { clearWorld, findTerrainCell, makeWorld, placePlayerAt, setInventory } from './helpers.js';

function fresh() {
  const { world, id } = makeWorld();
  clearWorld(world);
  placePlayerAt(world, id, 1500, 1500);
  setInventory(world, id, []);
  return { world, id, p: world.player(id) };
}

describe('barras vitales', () => {
  it('hambre, sed y frío se vacían en 240 s de día en tierra', () => {
    const { world, p } = fresh();
    world.stepSeconds(240);
    expect(p.hunger).toBeCloseTo(0, 0);
    expect(p.thirst).toBeCloseTo(0, 0);
    expect(p.warmth).toBeCloseTo(0, 0);
  });

  it('en 60 s bajan 25 cada una', () => {
    const { world, p } = fresh();
    world.stepSeconds(60);
    expect(p.hunger).toBeCloseTo(75, 0);
    expect(p.thirst).toBeCloseTo(75, 0);
    expect(p.warmth).toBeCloseTo(75, 0);
  });

  it('de noche el frío baja el doble', () => {
    const { world, p } = fresh();
    world.stepSeconds(240.5);
    expect(world.getState().isNight).toBe(true);
    p.hunger = p.thirst = p.warmth = 100;
    world.stepSeconds(60);
    expect(p.warmth).toBeCloseTo(50, 0);
  });

  it('en el agua la sed se llena y el frío baja 2.5 veces más rápido', () => {
    const { world, id, p } = fresh();
    const w = findTerrainCell(world, 'water');
    placePlayerAt(world, id, w.x, w.y);
    p.thirst = 10;
    world.stepSeconds(60);
    expect(p.thirst).toBe(100);
    expect(p.warmth).toBeCloseTo(100 - 62.5, 0);
  });

  it('con abrigo de noche el frío baja a la mitad', () => {
    const { world, id, p } = fresh();
    setInventory(world, id, [{ item: 'coat1', count: 1 }]);
    world.stepSeconds(240.5);
    p.hunger = p.thirst = p.warmth = 100;
    world.stepSeconds(60);
    expect(p.warmth).toBeCloseTo(75, 0);
  });

  it('con todas las barras altas la vida sube 2/s', () => {
    const { world, p } = fresh();
    p.health = 50;
    world.stepSeconds(10);
    expect(p.health).toBeCloseTo(70, 0);
  });

  it('con una barra baja la vida sube 0.5/s', () => {
    const { world, p } = fresh();
    p.health = 50;
    p.hunger = 30;
    world.stepSeconds(10);
    expect(p.health).toBeCloseTo(55, 0);
  });

  it('con una barra en cero la vida baja 2/s', () => {
    const { world, p } = fresh();
    p.hunger = 0;
    world.stepSeconds(10);
    expect(p.health).toBeCloseTo(80, 0);
  });

  it('con dos barras en cero baja 4/s y el jugador muere', () => {
    const { world, id, p } = fresh();
    p.hunger = 0;
    p.thirst = 0;
    p.health = 10;
    world.stepSeconds(3);
    expect(p.alive).toBe(false);
    expect(p.health).toBe(0);
    expect(world.drainEvents()).toContainEqual(expect.objectContaining({ type: 'playerDied', playerId: id }));
    const x = p.x;
    world.enqueue({ playerId: id, type: 'move', dx: 1, dy: 0 });
    world.stepSeconds(1);
    expect(p.x).toBe(x);
  });

  it('tras recibir daño no regenera durante 5 s', () => {
    const { world, p } = fresh();
    p.health = 50;
    p.noRegenUntil = world.getState().time + 5;
    world.stepSeconds(4.9);
    expect(p.health).toBeCloseTo(50, 0);
    world.stepSeconds(2);
    expect(p.health).toBeGreaterThan(51);
  });

  it('la vida no supera 100', () => {
    const { world, p } = fresh();
    p.health = 99;
    world.stepSeconds(5);
    expect(p.health).toBe(100);
  });
});

describe('día completo', () => {
  it('sobrevivir 480 s da 250 puntos', () => {
    const { world, p } = fresh();
    for (let i = 0; i < 481 * 30; i++) {
      p.hunger = p.thirst = p.warmth = 100;
      world.step();
    }
    expect(p.alive).toBe(true);
    expect(p.points).toBe(250);
    expect(world.getState().day).toBe(2);
  });
});

describe('aviso de barra baja', () => {
  it('emite vitalLow una vez al cruzar el 20 % hacia abajo', () => {
    const { world, id, p } = fresh();
    p.hunger = 21;
    world.stepSeconds(5);
    const ev = world.drainEvents().filter((e) => e.type === 'vitalLow');
    expect(ev).toEqual([{ type: 'vitalLow', playerId: id, bar: 'hunger' }]);
    world.stepSeconds(5);
    expect(world.drainEvents().filter((e) => e.type === 'vitalLow')).toHaveLength(0);
  });

  it('si la barra vuelve a subir y baja de nuevo, avisa otra vez', () => {
    const { world, id, p } = fresh();
    p.thirst = 15;
    world.stepSeconds(1);
    expect(world.drainEvents().filter((e) => e.type === 'vitalLow')).toHaveLength(0);
    p.thirst = 60;
    world.stepSeconds(100);
    const ev = world.drainEvents().filter((e) => e.type === 'vitalLow' && e.bar === 'thirst');
    expect(ev).toEqual([{ type: 'vitalLow', playerId: id, bar: 'thirst' }]);
  });
});
