import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InputController } from '../src/game/input';

let el: HTMLElement;
let input: InputController;
let selected = 2;

beforeEach(() => {
  el = document.createElement('div');
  document.body.appendChild(el);
  selected = 2;
  input = new InputController(el, { getPlayerId: () => 1, getSelectedSlot: () => selected, slotCount: () => 12, aimAngle: (mx, my) => Math.atan2(my, mx) });
  input.attach();
});
afterEach(() => {
  input.detach();
  el.remove();
});

const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));

describe('InputController', () => {
  it('W produce move hacia arriba', () => {
    key('keydown', 'KeyW');
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'move', dx: 0, dy: -1 });
  });

  it('W+D produce diagonal sin normalizar; soltar produce un (0,0) una sola vez', () => {
    key('keydown', 'KeyW');
    key('keydown', 'KeyD');
    expect(input.drain().at(-1)).toEqual({ playerId: 1, type: 'move', dx: 1, dy: -1 });
    key('keyup', 'KeyW');
    key('keyup', 'KeyD');
    expect(input.drain().at(-1)).toEqual({ playerId: 1, type: 'move', dx: 0, dy: 0 });
    expect(input.drain().filter((c) => c.type === 'move')).toHaveLength(0);
  });

  it('las flechas también mueven', () => {
    key('keydown', 'ArrowLeft');
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'move', dx: -1, dy: 0 });
  });

  it('no repite move si la dirección no cambia', () => {
    key('keydown', 'KeyS');
    input.drain();
    key('keydown', 'KeyS');
    expect(input.drain().filter((c) => c.type === 'move')).toHaveLength(0);
  });

  it('Digit3 selecciona el slot 2', () => {
    key('keydown', 'Digit3');
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'selectSlot', slot: 2 });
  });

  it('Digit0, Minus y Equal seleccionan los slots 10, 11 y 12', () => {
    key('keydown', 'Digit0');
    key('keydown', 'Minus');
    key('keydown', 'Equal');
    const slots = input.drain().filter((c) => c.type === 'selectSlot');
    expect(slots).toEqual([
      { playerId: 1, type: 'selectSlot', slot: 9 },
      { playerId: 1, type: 'selectSlot', slot: 10 },
      { playerId: 1, type: 'selectSlot', slot: 11 },
    ]);
  });

  it('la rueda pasa al siguiente slot de forma cíclica', () => {
    selected = 11;
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'selectSlot', slot: 0 });
    selected = 0;
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'selectSlot', slot: 11 });
  });

  it('Q tira el slot seleccionado', () => {
    selected = 4;
    key('keydown', 'KeyQ');
    expect(input.drain()).toContainEqual({ playerId: 1, type: 'dropSlot', slot: 4 });
  });

  it('mover el ratón produce aim con el ángulo calculado', () => {
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true }));
    const aims = input.drain().filter((c) => c.type === 'aim');
    expect(aims).toHaveLength(1);
    if (aims[0].type === 'aim') expect(aims[0].angle).toBeCloseTo(Math.PI / 4, 3);
  });

  it('no repite aim si el ángulo apenas cambia', () => {
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
    input.drain();
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100.1, bubbles: true }));
    expect(input.drain().filter((c) => c.type === 'aim')).toHaveLength(0);
  });

  it('primaryDown refleja el botón izquierdo', () => {
    expect(input.primaryDown).toBe(false);
    el.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    expect(input.primaryDown).toBe(true);
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    expect(input.primaryDown).toBe(false);
  });

  it('un clic corto entre dos drains se registra una vez con takeClick', () => {
    expect(input.takeClick()).toBe(false);
    el.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    expect(input.primaryDown).toBe(false);
    expect(input.takeClick()).toBe(true);
    expect(input.takeClick()).toBe(false);
  });

  it('tras detach no escucha nada', () => {
    input.detach();
    key('keydown', 'KeyW');
    expect(input.drain()).toEqual([]);
    input.attach();
  });
});

describe('rueda con inventario que crece', () => {
  it('la rueda da la vuelta según el número de casillas actual', () => {
    const el2 = document.createElement('div');
    let count = 12;
    const inp = new InputController(el2, { getPlayerId: () => 1, getSelectedSlot: () => 11, slotCount: () => count, aimAngle: () => 0 });
    inp.attach();
    el2.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
    expect(inp.drain()).toContainEqual({ playerId: 1, type: 'selectSlot', slot: 0 });
    count = 13;
    el2.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
    expect(inp.drain()).toContainEqual({ playerId: 1, type: 'selectSlot', slot: 12 });
    inp.detach();
  });
});
