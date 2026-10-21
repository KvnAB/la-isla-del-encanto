import type { StartItem } from '@draycol/core';
import type { ScoreEntry } from '../api';
import { itemIconDataUrl } from './icons';
import { formatPoints, ITEM_NAMES } from './names';
import './screens.css';

export interface PlayOptions {
  name: string;
  startItem: StartItem;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function renderScoresTable(target: HTMLElement, scores: ScoreEntry[], highlightId?: number): void {
  target.replaceChildren();
  if (scores.length === 0) {
    target.appendChild(el('p', 'scores-empty', 'Todavía no hay partidas. ¡Sé la primera!'));
    return;
  }
  const table = el('table', 'scores-table');
  const thead = el('thead');
  const hr = el('tr');
  for (const h of ['#', 'Nombre', 'Días', 'Puntos']) hr.appendChild(el('th', undefined, h));
  thead.appendChild(hr);
  const tbody = el('tbody');
  scores.forEach((s, i) => {
    const tr = el('tr');
    if (highlightId !== undefined && s.id === highlightId) tr.classList.add('highlight');
    tr.append(el('td', 'col-rank', String(i + 1)), el('td', 'col-name', s.name), el('td', 'col-days', String(s.days)), el('td', 'col-points', formatPoints(s.points)));
    tbody.appendChild(tr);
  });
  table.append(thead, tbody);
  target.appendChild(table);
}

export class StartScreen {
  private root: HTMLElement | null = null;
  private name = '';
  private startItem: StartItem | null = null;
  private playBtn: HTMLButtonElement | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly onPlay: (opts: PlayOptions) => void,
    private readonly loadScores: () => Promise<ScoreEntry[]>,
  ) {}

  async show(): Promise<void> {
    this.hide();
    const root = el('div', 'start-screen screen');
    this.root = root;

    const layout = el('div', 'screen-layout');

    // Panel principal
    const panel = el('div', 'panel panel-main');
    const heading = el('header', 'panel-heading');
    heading.append(el('div', 'eyebrow', 'Draycol presenta'), el('h1', 'title', 'La Isla del Encanto'), el('p', 'subtitle', 'Recolecta, fabrica, caza y sobrevive a la noche.'));
    panel.appendChild(heading);

    const field = el('label', 'field');
    field.appendChild(el('span', 'field-label', 'Tu nombre'));
    const input = el('input', 'name-input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'Escribe tu nombre';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('input', () => {
      this.name = input.value.trim();
      this.refresh();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.playBtn && !this.playBtn.disabled) this.play();
    });
    field.appendChild(input);
    panel.appendChild(field);

    const choicesBlock = el('div', 'field');
    choicesBlock.appendChild(el('span', 'field-label', 'Equipamiento inicial'));
    const choices = el('div', 'choices');
    const cards: HTMLElement[] = [];
    for (const item of ['wood_pickaxe', 'wood_sword'] as StartItem[]) {
      const card = el('button', 'choice');
      card.type = 'button';
      card.dataset.start = item;
      const img = el('img', 'choice-icon');
      img.src = itemIconDataUrl(item);
      img.alt = '';
      card.append(img, el('span', 'choice-name', ITEM_NAMES[item]), el('span', 'choice-hint', item === 'wood_pickaxe' ? 'Pica piedra y saca más madera' : 'Combate desde el primer minuto'));
      card.addEventListener('click', () => {
        this.startItem = item;
        for (const c of cards) c.classList.toggle('selected', c === card);
        this.refresh();
      });
      cards.push(card);
      choices.appendChild(card);
    }
    choicesBlock.appendChild(choices);
    panel.appendChild(choicesBlock);

    const play = el('button', 'play-btn', 'Jugar');
    play.type = 'button';
    play.disabled = true;
    play.addEventListener('click', () => this.play());
    this.playBtn = play;
    panel.appendChild(play);

    const hint = el('div', 'controls-hint');
    for (const [key, what] of [['WASD', 'moverte'], ['Ratón', 'apuntar'], ['Clic', 'golpear o usar'], ['1–8', 'cambiar objeto'], ['Q', 'tirar']] as const) {
      const item = el('span', 'control');
      item.append(el('kbd', undefined, key), el('span', undefined, what));
      hint.appendChild(item);
    }
    panel.appendChild(hint);

    // Panel de récords
    const side = el('div', 'panel panel-scores');
    side.appendChild(el('h2', 'panel-title', 'Mejores partidas'));
    const box = el('div', 'scores-box');
    box.appendChild(el('p', 'scores-loading', 'Cargando…'));
    side.appendChild(box);

    layout.append(panel, side);
    root.appendChild(layout);
    this.parent.appendChild(root);
    setTimeout(() => input.focus(), 0);

    void this.loadScores().then(
      (scores) => {
        if (this.root !== root) return;
        renderScoresTable(box, scores);
      },
      () => {
        if (this.root !== root) return;
        box.replaceChildren(el('p', 'scores-error', 'No se pudieron cargar los récords'));
      },
    );
  }

  private refresh(): void {
    if (this.playBtn) this.playBtn.disabled = !(this.name.length > 0 && this.startItem !== null);
  }

  private play(): void {
    if (!this.name || !this.startItem) return;
    this.onPlay({ name: this.name, startItem: this.startItem });
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
    this.playBtn = null;
  }
}
