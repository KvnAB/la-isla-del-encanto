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
let onPet: ReturnType<typeof vi.fn>;
let hud: Hud;
let state: WorldState;
let p: PlayerState;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root')!;
  onCraft = vi.fn();
  onSelect = vi.fn();
  onPet = vi.fn();
  hud = new Hud(root, DEFAULT_CONFIG, onCraft, onSelect, onPet);
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
    expect(slots).toHaveLength(20); // todas las posibles, pero solo 12 visibles
    expect([...slots].filter((el) => !(el as HTMLElement).hidden)).toHaveLength(12);
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

describe('Hud: casillas ganadas con pingüinos', () => {
  it('muestra solo las casillas que tiene el jugador y crece cuando gana una', () => {
    hud.update(p, state, []);
    const visible = () => [...root.querySelectorAll('.slot')].filter((s) => !(s as HTMLElement).hidden).length;
    expect(visible()).toBe(12);
    p.inventory.push(null);
    hud.update(p, state, []);
    expect(visible()).toBe(13);
    const slots = root.querySelectorAll('.slot');
    expect(slots[12].querySelector('.slot-index')?.textContent).toBe('13');
  });

  it('el cartel avisa de la casilla nueva', () => {
    hud.onEvents([{ type: 'slotUnlocked', playerId: p.id, slots: 13 }]);
    expect(root.querySelector('.hud-banner')?.textContent).toBe('¡CASILLA NUEVA! 13 de 20');
  });
});

describe('Hud: montar', () => {
  const prompt = () => root.querySelector<HTMLElement>('.hud-prompt');
  const puma = (dx: number) => {
    const def = DEFAULT_CONFIG.creatures.defs.puma;
    const c = { id: 900, kind: 'puma' as const, x: p.x + dx, y: p.y, angle: 0, radius: def.radius, hp: def.hp, mode: 'follow' as const, targetX: 0, targetY: 0, attackCooldown: 0, wanderTimer: 0, raid: false, owner: p.id, name: 'Puma 1', stuckFor: 0 };
    state.creatures.push(c);
    return c;
  };

  it('sin puma domado cerca no hay cartel', () => {
    hud.update(p, state, []);
    expect(prompt()?.hidden ?? true).toBe(true);
    puma(300);
    hud.update(p, state, []);
    expect(prompt()?.hidden ?? true).toBe(true);
  });

  it('con el puma domado al lado dice "E · Montar" y montado "E · Bajar"', () => {
    const c = puma(40);
    hud.update(p, state, []);
    expect(prompt()?.hidden).toBe(false);
    expect(prompt()?.textContent).toBe('E · Montar');
    p.mount = c.id;
    hud.update(p, state, []);
    expect(prompt()?.textContent).toBe('E · Bajar');
  });
});

describe('Hud: fichas de mascotas', () => {
  const tamed = (id: number, name: string, mode: 'follow' | 'sleep' | 'hunt' | 'come' | 'ride', hp = 120) => {
    const def = DEFAULT_CONFIG.creatures.defs.puma;
    state.creatures.push({ id, kind: 'puma', x: p.x + 500, y: p.y, angle: 0, radius: def.radius, hp, mode, targetX: 0, targetY: 0, attackCooldown: 0, wanderTimer: 0, raid: false, owner: p.id, name, stuckFor: 0 });
  };

  it('lista los pumas domados con nombre, vida y estado; los salvajes y ajenos no', () => {
    tamed(901, 'Canela', 'follow', 60);
    tamed(902, 'Trueno', 'sleep');
    state.creatures.push({ ...state.creatures[0], id: 903, owner: 777, name: 'Ajeno' });
    state.creatures.push({ ...state.creatures[0], id: 904, owner: null, name: '' });
    hud.update(p, state, []);
    const cards = root.querySelectorAll('.pet-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.pet-name')?.textContent).toBe('Canela');
    expect(cards[0].querySelector('.pet-state')?.textContent).toBe('Te sigue');
    expect((cards[0].querySelector('.pet-hp-fill') as HTMLElement).style.width).toBe('50%');
    expect(cards[1].querySelector('.pet-state')?.textContent).toBe('Durmiendo');
    expect(cards[1].querySelector('.pet-sleep')?.textContent).toBe('Despertar');
    expect(cards[0].querySelector('.pet-sleep')?.textContent).toBe('Dormir');
  });

  it('el nombre llama al puma y el botón lo duerme o lo despierta', () => {
    tamed(901, 'Canela', 'follow');
    tamed(902, 'Trueno', 'sleep');
    hud.update(p, state, []);
    const cards = root.querySelectorAll('.pet-card');
    (cards[0].querySelector('.pet-name') as HTMLElement).click();
    expect(onPet).toHaveBeenLastCalledWith({ type: 'petCall', entityId: 901 });
    (cards[0].querySelector('.pet-sleep') as HTMLElement).click();
    expect(onPet).toHaveBeenLastCalledWith({ type: 'petSleep', entityId: 901 });
    (cards[1].querySelector('.pet-sleep') as HTMLElement).click();
    expect(onPet).toHaveBeenLastCalledWith({ type: 'petCall', entityId: 902 });
  });

  it('al domar aparece el cuadro del nombre y al enviarlo manda rename', () => {
    tamed(901, 'Puma 1', 'follow');
    hud.onEvents([{ type: 'creatureTamed', playerId: p.id, entityId: 901, kind: 'puma' }]);
    const form = root.querySelector<HTMLFormElement>('.hud-name');
    expect(form).not.toBeNull();
    const input = form!.querySelector<HTMLInputElement>('input')!;
    input.value = 'Canela';
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(onPet).toHaveBeenLastCalledWith({ type: 'rename', entityId: 901, name: 'Canela' });
    expect(root.querySelector('.hud-name')).toBeNull();
  });

  it('el cuadro del nombre se cierra sin renombrar con Escape', () => {
    hud.onEvents([{ type: 'creatureTamed', playerId: p.id, entityId: 901, kind: 'puma' }]);
    const input = root.querySelector<HTMLInputElement>('.hud-name input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('.hud-name')).toBeNull();
    expect(onPet).not.toHaveBeenCalled();
  });
});

describe('Hud: libro de recetas', () => {
  const open = () => (root.querySelector('.hud-book-btn') as HTMLElement).click();
  const items = () => [...root.querySelectorAll<HTMLElement>('.book-item')];

  it('el botón abre el libro con todas las recetas y se cierra con el botón, con R o con Escape', () => {
    hud.update(p, state, []);
    expect(root.querySelector<HTMLElement>('.hud-book')?.hidden).toBe(true);
    open();
    expect(root.querySelector<HTMLElement>('.hud-book')?.hidden).toBe(false);
    expect(items()).toHaveLength(DEFAULT_CONFIG.recipes.length);
    expect(items().map((e) => e.textContent)).toContain('Pico de oro');
    open();
    expect(root.querySelector<HTMLElement>('.hud-book')?.hidden).toBe(true);
    hud.toggleBook();
    expect(root.querySelector<HTMLElement>('.hud-book')?.hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector<HTMLElement>('.hud-book')?.hidden).toBe(true);
  });

  it('al pulsar una receta muestra sus materiales con lo que tienes, en rojo lo que falta y en verde lo que ya hay', () => {
    p.inventory[0] = { item: 'gold', count: 3 };
    p.inventory[1] = { item: 'stone', count: 10 };
    hud.update(p, state, []);
    open();
    items().find((e) => e.textContent === 'Pico de oro')!.click();
    const rows = [...root.querySelectorAll<HTMLElement>('.book-cost')];
    expect(rows.map((r) => r.textContent)).toEqual(['Oro 3/20', 'Piedra 10/10', 'Madera 0/30']);
    expect(rows[0].classList.contains('missing')).toBe(true);
    expect(rows[1].classList.contains('ok')).toBe(true);
    expect(rows[2].classList.contains('missing')).toBe(true);
    expect(root.querySelector('.book-consumes')?.textContent).toBe('Gasta: Pico de piedra (no lo tienes)');
    expect(root.querySelector<HTMLButtonElement>('.book-craft')?.disabled).toBe(true);
  });

  it('con todo lo necesario, Fabricar está activo y fabrica; los números se actualizan al cambiar el inventario', () => {
    p.inventory[0] = { item: 'gold', count: 20 };
    p.inventory[1] = { item: 'stone', count: 30 };
    p.inventory[2] = { item: 'wood', count: 60 };
    p.inventory[3] = { item: 'stone_pickaxe', count: 1 };
    hud.update(p, state, ['gold_pickaxe']);
    open();
    items().find((e) => e.textContent === 'Pico de oro')!.click();
    expect(root.querySelector('.book-consumes')?.textContent).toBe('Gasta: Pico de piedra');
    const btn = root.querySelector<HTMLButtonElement>('.book-craft')!;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onCraft).toHaveBeenCalledWith('gold_pickaxe');
    p.inventory[0] = { item: 'gold', count: 5 };
    hud.update(p, state, []);
    expect(root.querySelector('.book-cost')?.textContent).toBe('Oro 5/20');
    expect(root.querySelector<HTMLButtonElement>('.book-craft')?.disabled).toBe(true);
  });
});
