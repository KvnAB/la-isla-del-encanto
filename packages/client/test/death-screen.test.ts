import { beforeEach, describe, expect, it, vi } from 'vitest';


import { DeathScreen } from '../src/ui/death-screen';

let root: HTMLElement;
let onBack: ReturnType<typeof vi.fn>;
let onAgain: ReturnType<typeof vi.fn>;
const flush = () => new Promise((r) => setTimeout(r, 0));
const score = { id: 9, name: 'Ana', days: 2, points: 1240, createdAt: '' };

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root')!;
  onBack = vi.fn();
  onAgain = vi.fn();
});

describe('DeathScreen', () => {
  it('muestra nombre, días y puntos formateados', async () => {
    const submit = vi.fn().mockResolvedValue({ score, rank: 3 });
    const s = new DeathScreen(root, onBack, onAgain, submit);
    await s.show({ name: 'Ana', days: 2, points: 1240, cause: { kind: 'creature', creature: 'tiger' } });
    expect(root.textContent).toContain('Has muerto');
    expect(root.textContent).toContain('Ana');
    expect(root.querySelector('.stat-days .stat-value')?.textContent).toBe('2');
    expect(root.querySelector('.stat-points .stat-value')?.textContent).toBe('1 240');
  });

  it('envía el récord una sola vez y muestra el puesto', async () => {
    const submit = vi.fn().mockResolvedValue({ score, rank: 3 });
    const s = new DeathScreen(root, onBack, onAgain, submit);
    await s.show({ name: 'Ana', days: 2, points: 1240, cause: { kind: 'creature', creature: 'tiger' } });
    await flush();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({ name: 'Ana', days: 2, points: 1240 });
    expect(root.querySelector('.death-rank')?.textContent).toContain('Puesto #3');
  });

  it('si falla el envío avisa y el botón sigue volviendo al inicio', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('caído'));
    const s = new DeathScreen(root, onBack, onAgain, submit);
    await s.show({ name: 'Ana', days: 0, points: 10, cause: { kind: 'thirst' } });
    await flush();
    expect(root.textContent).toContain('No se pudo guardar el récord');
    (root.querySelector('.back-btn') as HTMLElement).click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('el botón Volver al inicio llama onBack', async () => {
    const s = new DeathScreen(root, onBack, onAgain, vi.fn().mockResolvedValue({ score, rank: 1 }));
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'cold' } });
    (root.querySelector('.back-btn') as HTMLElement).click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hide elimina la pantalla', async () => {
    const s = new DeathScreen(root, onBack, onAgain, vi.fn().mockResolvedValue({ score, rank: 1 }));
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'cold' } });
    s.hide();
    expect(root.querySelector('.death-screen')).toBeNull();
  });
});

describe('DeathScreen: causa y jugar otra vez', () => {
  it('muestra quién o qué te mató', async () => {
    const s = new DeathScreen(root, onBack, onAgain, vi.fn().mockResolvedValue({ score, rank: 1 }));
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'creature', creature: 'tiger' } });
    expect(root.querySelector('.death-cause')?.textContent).toBe('Te mató un tigre');
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'thirst' } });
    expect(root.querySelector('.death-cause')?.textContent).toBe('Moriste de sed');
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'creature', creature: 'sheep' } });
    expect(root.querySelector('.death-cause')?.textContent).toBe('Te mató una oveja mala');
  });

  it('Jugar otra vez llama onPlayAgain y no onBack', async () => {
    const s = new DeathScreen(root, onBack, onAgain, vi.fn().mockResolvedValue({ score, rank: 1 }));
    await s.show({ name: 'Ana', days: 1, points: 5, cause: { kind: 'hunger' } });
    (root.querySelector('.again-btn') as HTMLElement).click();
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });
});
