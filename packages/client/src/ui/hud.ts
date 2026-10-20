import type { GameConfig, ItemId, PlayerState, WorldState } from '@draycol/core';
import './hud.css';
import { itemIconDataUrl } from './icons';
import { formatClock, formatPoints, ITEM_NAMES, ITEM_NAMES_LOWER } from './names';

type BarKey = 'health' | 'hunger' | 'thirst' | 'warmth';
const BARS: { key: BarKey; label: string }[] = [
  { key: 'health', label: 'VIDA' },
  { key: 'hunger', label: 'HAMBRE' },
  { key: 'thirst', label: 'SED' },
  { key: 'warmth', label: 'FRÍO' },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** HUD en DOM: barras, 8 slots, recetas disponibles, día y puntos. Solo toca el DOM cuando cambia algo. */
export class Hud {
  private readonly root: HTMLElement;
  private readonly bars = new Map<BarKey, { fill: HTMLElement; label: HTMLElement; last: number }>();
  private readonly slots: { el: HTMLElement; img: HTMLImageElement; count: HTMLElement; lastItem: ItemId | null; lastCount: number; lastSelected: boolean }[] = [];
  private readonly craftBox: HTMLElement;
  private lastRecipes = '';
  private readonly dayEl: HTMLElement;
  private readonly pointsEl: HTMLElement;
  private readonly phaseIcon: HTMLElement;
  private readonly phaseTime: HTMLElement;
  private last = { day: -1, points: -1, isNight: false, clock: '' };

  constructor(
    parent: HTMLElement,
    private readonly cfg: GameConfig,
    private readonly onCraft: (id: ItemId) => void,
    private readonly onSelectSlot: (i: number) => void,
  ) {
    this.root = el('div', 'hud layer');

    // Arriba izquierda: recetas
    this.craftBox = el('div', 'hud-craft');
    this.root.appendChild(this.craftBox);

    // Arriba derecha: día y puntos
    const top = el('div', 'hud-top');
    const phase = el('div', 'hud-phase');
    this.phaseIcon = el('span', 'hud-phase-icon', '☀');
    this.phaseTime = el('span', 'hud-phase-time', '4:00');
    phase.append(this.phaseIcon, this.phaseTime);
    const dayBox = el('div', 'hud-daybox');
    this.dayEl = el('div', 'hud-day', 'DÍA 1');
    this.pointsEl = el('div', 'hud-points', '0 pts');
    dayBox.append(this.dayEl, this.pointsEl);
    top.append(phase, dayBox);
    this.root.appendChild(top);

    // Abajo centro: barras + slots
    const bottom = el('div', 'hud-bottom');
    const barsRow = el('div', 'hud-bars');
    for (const b of BARS) {
      const bar = el('div', `bar bar-${b.key}`);
      bar.dataset.bar = b.key;
      const fill = el('div', 'bar-fill');
      const label = el('span', 'bar-label', `${b.label} 100`);
      bar.append(fill, label);
      barsRow.appendChild(bar);
      this.bars.set(b.key, { fill, label, last: -1 });
    }
    const slotsRow = el('div', 'hud-slots');
    for (let i = 0; i < 8; i++) {
      const s = el('div', 'slot');
      const idx = el('span', 'slot-index', String(i + 1));
      const img = el('img', 'slot-icon');
      img.alt = '';
      img.draggable = false;
      img.hidden = true;
      const count = el('span', 'slot-count', '');
      s.append(idx, img, count);
      s.addEventListener('click', () => this.onSelectSlot(i));
      slotsRow.appendChild(s);
      this.slots.push({ el: s, img, count, lastItem: null, lastCount: -1, lastSelected: false });
    }
    bottom.append(barsRow, slotsRow);
    this.root.appendChild(bottom);

    parent.appendChild(this.root);
  }

  update(p: PlayerState, state: WorldState, recipes: ItemId[]): void {
    for (const b of BARS) {
      const v = Math.round(p[b.key]);
      const entry = this.bars.get(b.key)!;
      if (entry.last !== v) {
        entry.last = v;
        entry.fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
        entry.label.textContent = `${b.label} ${v}`;
      }
    }

    for (let i = 0; i < 8; i++) {
      const s = this.slots[i];
      const slot = p.inventory[i];
      const item = slot?.item ?? null;
      const count = slot?.count ?? 0;
      const selected = p.selectedSlot === i;
      if (s.lastItem !== item) {
        s.lastItem = item;
        if (item) {
          s.img.src = itemIconDataUrl(item);
          s.img.title = ITEM_NAMES[item];
          s.img.hidden = false;
        } else {
          s.img.hidden = true;
          s.img.removeAttribute('src');
        }
      }
      if (s.lastCount !== count) {
        s.lastCount = count;
        s.count.textContent = item && count > 1 ? String(count) : '';
      }
      if (s.lastSelected !== selected) {
        s.lastSelected = selected;
        s.el.classList.toggle('selected', selected);
      }
    }

    const key = recipes.join(',');
    if (key !== this.lastRecipes) {
      this.lastRecipes = key;
      this.craftBox.replaceChildren();
      for (const id of recipes) {
        const r = this.cfg.recipes.find((x) => x.id === id);
        if (!r) continue;
        const card = el('div', 'craft-card');
        const img = el('img', 'craft-icon');
        img.src = itemIconDataUrl(id);
        img.alt = '';
        const info = el('div', 'craft-info');
        info.append(el('div', 'craft-name', ITEM_NAMES[id]), el('div', 'craft-cost', costText(r.cost, r.consumes)));
        const btn = el('button', 'craft-btn', 'Fabricar');
        btn.type = 'button';
        btn.addEventListener('click', () => this.onCraft(id));
        card.append(img, info, btn);
        this.craftBox.appendChild(card);
      }
    }

    if (this.last.day !== state.day) {
      this.last.day = state.day;
      this.dayEl.textContent = `DÍA ${state.day}`;
    }
    if (this.last.points !== p.points) {
      this.last.points = p.points;
      this.pointsEl.textContent = `${formatPoints(p.points)} pts`;
    }
    if (this.last.isNight !== state.isNight || this.last.day === -1) {
      this.last.isNight = state.isNight;
      this.phaseIcon.textContent = state.isNight ? '☾' : '☀';
      this.phaseIcon.classList.toggle('night', state.isNight);
    }
    const clock = formatClock(state.phaseRemaining);
    if (this.last.clock !== clock) {
      this.last.clock = clock;
      this.phaseTime.textContent = clock;
    }
  }

  destroy(): void {
    this.root.remove();
  }
}

function costText(cost: Partial<Record<ItemId, number>>, consumes?: ItemId): string {
  const parts = (Object.entries(cost) as [ItemId, number][]).map(([item, n]) => `${n} ${ITEM_NAMES_LOWER[item]}`);
  if (consumes) parts.push(`1 ${ITEM_NAMES_LOWER[consumes]}`);
  return parts.join(' · ');
}
