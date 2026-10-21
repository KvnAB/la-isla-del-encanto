import type { DeathCause } from '@draycol/core';
import type { ScoreEntry } from '../api';
import { causeText, formatPoints } from './names';
import './screens.css';

export interface GameResult {
  name: string;
  days: number;
  points: number;
  cause: DeathCause;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class DeathScreen {
  private root: HTMLElement | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly onBack: () => void,
    private readonly onPlayAgain: () => void,
    private readonly submit: (s: Pick<GameResult, 'name' | 'days' | 'points'>) => Promise<{ score: ScoreEntry; rank: number }>,
  ) {}

  async show(result: GameResult): Promise<void> {
    this.hide();
    const root = el('div', 'death-screen screen');
    this.root = root;

    const layout = el('div', 'screen-layout');
    const panel = el('div', 'panel panel-death');
    panel.appendChild(el('h1', 'death-title', 'Has muerto'));
    panel.appendChild(el('p', 'death-name', result.name));
    panel.appendChild(el('p', 'death-cause', causeText(result.cause)));

    const stats = el('div', 'death-stats');
    const days = el('div', 'stat stat-days');
    days.append(el('div', 'stat-value', String(result.days)), el('div', 'stat-label', result.days === 1 ? 'Día sobrevivido' : 'Días sobrevividos'));
    const points = el('div', 'stat stat-points');
    points.append(el('div', 'stat-value', formatPoints(result.points)), el('div', 'stat-label', 'Puntos'));
    stats.append(days, points);
    panel.appendChild(stats);

    const rank = el('p', 'death-rank', 'Guardando récord…');
    panel.appendChild(rank);

    const again = el('button', 'play-btn again-btn', 'Jugar otra vez');
    again.type = 'button';
    again.addEventListener('click', () => this.onPlayAgain());
    const back = el('button', 'play-btn back-btn secondary', 'Volver al inicio');
    back.type = 'button';
    back.addEventListener('click', () => this.onBack());
    const actions = el('div', 'death-actions');
    actions.append(again, back);
    panel.appendChild(actions);

    layout.appendChild(panel);
    root.appendChild(layout);
    this.parent.appendChild(root);
    setTimeout(() => again.focus(), 0);

    void this.submit({ name: result.name, days: result.days, points: result.points }).then(
      (res) => {
        if (this.root !== root) return;
        rank.textContent = `Puesto #${res.rank} en la tabla global`;
        rank.classList.add('ok');
      },
      () => {
        if (this.root !== root) return;
        rank.textContent = 'No se pudo guardar el récord';
        rank.classList.add('error');
      },
    );
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
  }
}
