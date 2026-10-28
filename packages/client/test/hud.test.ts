import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, World, type PlayerState, type WorldState } from '@draycol/core';

vi.mock('../src/ui/icons', () => ({
  itemIconDataUrl: (item: string) => `data:icon/${item}`,
}));

// jsdom no implementa canvas 2D: el minimapa se queda sin contexto y no dibuja (sin errores en la salida)
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

import { Hud } from '../src/ui/hud';

let root: HTMLElement;
let onCraft: ReturnType<typeof vi.fn>;
let onSelect: ReturnType<typeof vi.fn>;
let hud: Hud;
let state: WorldState;
let p: PlayerState;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root')!;
  onCraft = vi.fn();
  onSelect = vi.fn();
  hud = new Hud(root, DEFAULT_CONFIG, onCraft, onSelect);
  const w = new World(1);
  const id = w.addPlayer('Ana', 'wood_pickaxe');
  state = w.getState();
  p = w.player(id);
});

const text = (sel: string) => root.querySelector(sel)?.textContent ?? '';

describe('Hud', () => {
  it('muestra las barras con su valor', () => {
    p.hunger = 58;
    p.health = 80;
    hud.update(p, state, []);
    const bar = root.querySelector<HTMLElement>('[data-bar="hunger"] .bar-fill')!;
    expect(bar.style.width).toBe('58%');
    expect(text('[data-bar="hunger"]')).toContain('HAMBRE 58');
    expect(text('[data-bar="health"]')).toContain('VIDA 80');
    expect(text('[data-bar="thirst"]')).toContain('SED 100');
    expect(text('[data-bar="warmth"]')).toContain('FRÍO 100');
  });

  it('muestra 12 slots con icono, cantidad y selección', () => {
    p.inventory[1] = { item: 'wood', count: 47 };
    p.selectedSlot = 1;
    hud.update(p, state, []);
    const slots = root.querySelectorAll('.slot');
    expect(slots).toHaveLength(12);
    expect(slots[9].querySelector('.slot-index')?.textContent).toBe('0');
    expect(slots[11].querySelector('.slot-index')?.textContent).toBe('=');
    expect(slots[1].classList.contains('selected')).toBe(true);
    expect(slots[0].classList.contains('selected')).toBe(false);
    expect(slots[1].querySelector('.slot-count')?.textContent).toBe('47');
    expect(slots[1].querySelector<HTMLImageElement>('img')?.src).toContain('data:icon/wood');
    expect(slots[0].querySelector('.slot-count')?.textContent ?? '').toBe('');
    expect(slots[0].querySelector('.slot-index')?.textContent).toBe('1');
  });

  it('clic en un slot llama onSelectSlot', () => {
    hud.update(p, state, []);
    (root.querySelectorAll('.slot')[4] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('muestra tarjetas de receta solo para las disponibles y fabrica al pulsar', () => {
    hud.update(p, state, ['campfire']);
    const cards = root.querySelectorAll('.craft-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Fogata');
    expect(cards[0].textContent).toContain('15 madera · 5 piedra');
    (cards[0].querySelector('button') as HTMLElement).click();
    expect(onCraft).toHaveBeenCalledWith('campfire');
    hud.update(p, state, []);
    expect(root.querySelectorAll('.craft-card')).toHaveLength(0);
  });

  it('muestra día, puntos con separador de miles y sol/luna con cuenta atrás', () => {
    p.points = 1240;
    state.day = 2;
    state.isNight = false;
    state.phaseRemaining = 192;
    hud.update(p, state, []);
    expect(text('.hud-day')).toBe('DÍA 2');
    expect(text('.hud-points')).toBe('1 240 pts');
    expect(text('.hud-phase-icon')).toBe('☀');
    expect(text('.hud-phase-time')).toBe('3:12');
    state.isNight = true;
    state.phaseRemaining = 5;
    hud.update(p, state, []);
    expect(text('.hud-phase-icon')).toBe('☾');
    expect(text('.hud-phase-time')).toBe('0:05');
  });

  it('destroy limpia el DOM', () => {
    hud.update(p, state, []);
    hud.destroy();
    expect(root.querySelector('.hud')).toBeNull();
  });
});

describe('Hud: carteles y avisos', () => {
  it('muestra el cartel del día al amanecer y el de la noche al anochecer', () => {
    hud.onEvents([{ type: 'dayPassed', day: 1 }]);
    expect(text('.hud-banner')).toBe('DÍA 2');
    hud.onEvents([{ type: 'nightFell', day: 2 }]);
    expect(text('.hud-banner')).toBe('CAE LA NOCHE');
    expect(root.querySelectorAll('.hud-banner')).toHaveLength(1);
  });

  it('las barras por debajo del 20 % llevan la clase low', () => {
    p.thirst = 15;
    p.hunger = 50;
    hud.update(p, state, []);
    expect(root.querySelector('[data-bar="thirst"]')!.classList.contains('low')).toBe(true);
    expect(root.querySelector('[data-bar="hunger"]')!.classList.contains('low')).toBe(false);
    p.thirst = 80;
    hud.update(p, state, []);
    expect(root.querySelector('[data-bar="thirst"]')!.classList.contains('low')).toBe(false);
  });
});

describe('Hud: cantimplora', () => {
  it('el slot de la cantimplora llena muestra los tragos que quedan', () => {
    p.inventory[2] = { item: 'canteen_full', count: 2 };
    hud.update(p, state, []);
    const slot = root.querySelectorAll('.slot')[2];
    expect(slot.querySelector<HTMLImageElement>('img')?.title).toBe('Cantimplora · 2 tragos');
    expect(slot.querySelector('.slot-count')?.textContent).toBe('2');
    p.inventory[2] = { item: 'canteen_full', count: 1 };
    hud.update(p, state, []);
    expect(slot.querySelector<HTMLImageElement>('img')?.title).toBe('Cantimplora · 1 trago');
  });
});

describe('Hud: hueso', () => {
  it('el tooltip del hueso explica cómo domar', () => {
    p.inventory[1] = { item: 'bone', count: 2 };
    hud.update(p, state, []);
    const slot = root.querySelectorAll('.slot')[1];
    expect(slot.querySelector<HTMLImageElement>('img')?.title).toBe('Hueso · úsalo apuntando a un puma para domarlo');
  });
});
