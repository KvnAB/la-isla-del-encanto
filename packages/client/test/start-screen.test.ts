import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScoreEntry } from '../src/api';

vi.mock('../src/ui/icons', () => ({
  itemIconDataUrl: (item: string) => `data:icon/${item}`,
}));

import { renderScoresTable, StartScreen } from '../src/ui/start-screen';

let root: HTMLElement;
let onPlay: ReturnType<typeof vi.fn>;

const flush = () => new Promise((r) => setTimeout(r, 0));
const entry = (id: number, name: string, days: number, points: number): ScoreEntry => ({ id, name, days, points, createdAt: '' });

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root')!;
  onPlay = vi.fn();
});

describe('StartScreen', () => {
  it('el botón Jugar está deshabilitado sin nombre o sin elección', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    const btn = root.querySelector<HTMLButtonElement>('.play-btn')!;
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    expect(btn.disabled).toBe(true);
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));
    expect(btn.disabled).toBe(true);
    (root.querySelector('[data-start="wood_pickaxe"]') as HTMLElement).click();
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onPlay).toHaveBeenCalledWith({ name: 'Ana', startItem: 'wood_pickaxe' });
  });

  it('recorta espacios del nombre y limita a 16 caracteres', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    expect(input.maxLength).toBe(16);
    input.value = '  Ana ';
    input.dispatchEvent(new Event('input'));
    (root.querySelector('[data-start="wood_sword"]') as HTMLElement).click();
    root.querySelector<HTMLButtonElement>('.play-btn')!.click();
    expect(onPlay).toHaveBeenCalledWith({ name: 'Ana', startItem: 'wood_sword' });
  });

  it('un nombre solo de espacios no habilita Jugar', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    (root.querySelector('[data-start="wood_sword"]') as HTMLElement).click();
    expect(root.querySelector<HTMLButtonElement>('.play-btn')!.disabled).toBe(true);
  });

  it('muestra la tabla de récords en el orden recibido', async () => {
    const s = new StartScreen(root, onPlay, async () => [entry(1, 'Bea', 3, 900), entry(2, 'Ana', 1, 500)]);
    await s.show();
    await flush();
    const rows = root.querySelectorAll('.scores-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Bea');
    expect(rows[0].textContent).toContain('900');
    expect(rows[1].textContent).toContain('Ana');
  });

  it('si los récords fallan muestra el aviso y Jugar sigue funcionando', async () => {
    const s = new StartScreen(root, onPlay, async () => {
      throw new Error('caído');
    });
    await s.show();
    await flush();
    expect(root.textContent).toContain('No se pudieron cargar los récords');
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));
    (root.querySelector('[data-start="wood_pickaxe"]') as HTMLElement).click();
    root.querySelector<HTMLButtonElement>('.play-btn')!.click();
    expect(onPlay).toHaveBeenCalled();
  });

  it('sin récords muestra un mensaje vacío', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    await flush();
    expect(root.textContent).toContain('Todavía no hay partidas');
  });

  it('Enter en el campo de nombre equivale a Jugar cuando está habilitado', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));
    (root.querySelector('[data-start="wood_pickaxe"]') as HTMLElement).click();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('hide elimina la pantalla', async () => {
    const s = new StartScreen(root, onPlay, async () => []);
    await s.show();
    s.hide();
    expect(root.querySelector('.start-screen')).toBeNull();
  });
});

describe('renderScoresTable', () => {
  it('resalta la fila indicada', () => {
    const el = document.createElement('div');
    renderScoresTable(el, [entry(1, 'Bea', 3, 900), entry(2, 'Ana', 1, 500)], 2);
    const rows = el.querySelectorAll('tbody tr');
    expect(rows[1].classList.contains('highlight')).toBe(true);
    expect(rows[0].classList.contains('highlight')).toBe(false);
    expect(rows[0].querySelector('td')?.textContent).toBe('1');
  });
});
