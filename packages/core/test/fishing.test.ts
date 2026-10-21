import { describe, expect, it } from 'vitest';
import { clearWorld, findLandNextTo, makeWorld, placePlayerAt, setInventory } from './helpers.js';

/** Jugador en tierra con agua a 60 px en +x, mirando hacia ella, con la caña seleccionada. */
function byWater(extra: { item: 'fishing_rod'; count: 1 } | null = { item: 'fishing_rod', count: 1 }) {
  const { world, id } = makeWorld();
  clearWorld(world);
  const spot = findLandNextTo(world, 'water', 60);
  placePlayerAt(world, id, spot.x, spot.y);
  setInventory(world, id, [extra, null]);
  const p = world.player(id);
  p.angle = 0;
  p.selectedSlot = 0;
  return { world, id, p };
}

function use(world: ReturnType<typeof makeWorld>['world'], id: number) {
  world.player(id).hitCooldown = 0;
  world.enqueue({ playerId: id, type: 'useSlot' });
  world.step();
}

const fish = (p: ReturnType<typeof byWater>['p']) => p.inventory.find((s) => s?.item === 'raw_fish')?.count ?? 0;

describe('pesca', () => {
  it('lanzar la caña al agua y esperar 3 s da un pescado crudo y 5 puntos', () => {
    const { world, id, p } = byWater();
    use(world, id);
    expect(p.fishingUntil).toBeGreaterThan(0);
    expect(world.drainEvents()).toContainEqual({ type: 'fishingStarted', playerId: id });
    world.stepSeconds(2.5);
    expect(fish(p)).toBe(0);
    world.stepSeconds(0.6);
    expect(fish(p)).toBe(1);
    expect(p.points).toBe(5);
    expect(p.fishingUntil).toBe(0);
    expect(world.drainEvents()).toContainEqual({ type: 'fished', playerId: id });
  });

  it('moverse cancela la pesca', () => {
    const { world, id, p } = byWater();
    use(world, id);
    world.stepSeconds(1);
    world.enqueue({ playerId: id, type: 'move', dx: -1, dy: 0 });
    world.step();
    expect(p.fishingUntil).toBe(0);
    world.enqueue({ playerId: id, type: 'move', dx: 0, dy: 0 });
    world.stepSeconds(3);
    expect(fish(p)).toBe(0);
  });

  it('cambiar de slot cancela', () => {
    const { world, id, p } = byWater();
    use(world, id);
    world.stepSeconds(1);
    world.enqueue({ playerId: id, type: 'selectSlot', slot: 1 });
    world.stepSeconds(3);
    expect(p.fishingUntil).toBe(0);
    expect(fish(p)).toBe(0);
  });

  it('sin agua delante no se lanza', () => {
    const { world, id, p } = byWater();
    p.angle = Math.PI; // mirando a tierra
    use(world, id);
    expect(p.fishingUntil).toBe(0);
    expect(world.drainEvents().some((e) => e.type === 'fishingStarted')).toBe(false);
  });

  it('mantener el clic no reinicia el temporizador', () => {
    const { world, id, p } = byWater();
    use(world, id);
    world.stepSeconds(1.5);
    use(world, id);
    world.stepSeconds(1.6);
    expect(fish(p)).toBe(1);
  });

  it('nadando también se puede pescar', () => {
    const { world, id, p } = byWater();
    const spot = findLandNextTo(world, 'water', 60);
    placePlayerAt(world, id, spot.x + 60 + 20, spot.y);
    world.step();
    expect(p.inWater).toBe(true);
    p.angle = Math.PI;
    use(world, id);
    expect(p.fishingUntil).toBeGreaterThan(0);
  });
});

describe('pesca en movimiento', () => {
  it('no se lanza la caña mientras el jugador se mueve', () => {
    const { world, id, p } = byWater();
    world.enqueue({ playerId: id, type: 'move', dx: 0, dy: -1 });
    world.step();
    p.hitCooldown = 0;
    world.enqueue({ playerId: id, type: 'useSlot' });
    world.step();
    expect(p.fishingUntil).toBe(0);
    expect(world.drainEvents().some((e) => e.type === 'fishingStarted')).toBe(false);
  });
});
