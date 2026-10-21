import { ITEM_META, type GameConfig, type GameEvent, type ItemId, type PlayerState, type WorldState } from '@draycol/core';
import './hud.css';
import { SLOT_KEY_LABELS } from '../game/input';
import { itemIconDataUrl } from './icons';
import { formatClock, formatPoints, ITEM_NAMES, ITEM_NAMES_LOWER } from './names';
import { Minimap } from './minimap';

type BarKey = 'health' | 'hunger' | 'thirst' | 'warmth';
const ICONS: Record<BarKey, string> = {
  health: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2 0 3.6 1.1 4.4 2.3.8-1.2 2.4-2.3 4.4-2.3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  hunger: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1.5-.6-2.4-1-3 2 .8 4 3 4 6.5A6 6 0 0 1 6 14c0-4 4-6 6-12z"/></svg>',
  thirst: '<svg viewBox="0 0 24 24"><path d="M12 2.5s6.5 7.2 6.5 12a6.5 6.5 0 0 1-13 0c0-4.8 6.5-12 6.5-12z"/></svg>',
  warmth: '<svg viewBox="0 0 24 24"><path d="M11 2h2v5.3l3.2-1.9 1 1.7L13 9.6v4.8l4.2 2.5-1 1.7L13 16.7V22h-2v-5.3l-3.2 1.9-1-1.7 4.2-2.5V9.6L6.8 7.1l1-1.7L11 7.3z"/></svg>',
};
/** Cuánto dura el cartel grande del centro (DÍA N / CAE LA NOCHE). */
export const BANNER_SECONDS = 2.5;

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

/** HUD en DOM: barras, slots del inventario, recetas disponibles, día y puntos. Solo toca el DOM cuando cambia algo. */
export class Hud {
  private readonly root: HTMLElement;
  private readonly bars = new Map<BarKey, { el: HTMLElement; fill: HTMLElement; label: HTMLElement; last: number; low: boolean }>();
  private banner: HTMLElement | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly slots: { el: HTMLElement; img: HTMLImageElement; count: HTMLElement; lastItem: ItemId | null; lastCount: number; lastSelected: boolean }[] = [];
  private readonly craftBox: HTMLElement;
  private lastRecipes = '';
  private readonly dayEl: HTMLElement;
  private readonly pointsEl: HTMLElement;
  private readonly phaseIcon: HTMLElement;
  private readonly phaseTime: HTMLElement;
  readonly minimap = new Minimap();
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

    // Arriba derecha: día y puntos, y debajo el minimapa
    const topRight = el('div', 'hud-topright');
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
    topRight.append(top, this.minimap.el);
    this.root.appendChild(topRight);

    // Abajo centro: barras + slots
    const bottom = el('div', 'hud-bottom');
    const barsRow = el('div', 'hud-bars');
    for (const b of BARS) {
      const bar = el('div', `bar bar-${b.key}`);
      bar.dataset.bar = b.key;
      const icon = el('span', 'bar-icon');
      icon.innerHTML = ICONS[b.key];
      const track = el('div', 'bar-track');
      const fill = el('div', 'bar-fill');
      const label = el('span', 'bar-label', `${b.label} 100`);
      track.append(fill, label);
      bar.append(icon, track);
      barsRow.appendChild(bar);
      this.bars.set(b.key, { el: bar, fill, label, last: -1, low: false });
    }
    const slotsRow = el('div', 'hud-slots');
    slotsRow.style.gridTemplateColumns = `repeat(${cfg.player.inventorySlots}, var(--slot-size))`;
    for (let i = 0; i < cfg.player.inventorySlots; i++) {
      const s = el('div', 'slot');
      const idx = el('span', 'slot-index', SLOT_KEY_LABELS[i] ?? String(i + 1));
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
      // hambre, sed y frío parpadean por debajo del umbral de aviso
      const low = b.key !== 'health' && v < this.cfg.vitals.lowThreshold;
      if (low !== entry.low) {
        entry.low = low;
        entry.el.classList.toggle('low', low);
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const slot = p.inventory[i];
      const item = slot?.item ?? null;
      const count = slot?.count ?? 0;
      const selected = p.selectedSlot === i;
      if (s.lastItem !== item) {
        s.lastItem = item;
        if (item) {
          s.img.src = itemIconDataUrl(item);
          s.img.hidden = false;
        } else {
          s.img.hidden = true;
          s.img.removeAttribute('src');
        }
      }
      if (s.lastCount !== count || s.lastItem !== item) {
        s.lastCount = count;
        s.count.textContent = item && count > 1 ? String(count) : '';
        if (item) s.img.title = slotTitle(item, count);
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
        const btn = el('button', 'craft-btn');
        btn.type = 'button';
        btn.title = `Fabricar ${ITEM_NAMES[id]} · ${costText(r.cost, r.consumes)}`;
        btn.setAttribute('aria-label', btn.title);
        const img = el('img', 'craft-icon');
        img.src = itemIconDataUrl(id);
        img.alt = '';
        btn.appendChild(img);
        btn.addEventListener('click', () => this.onCraft(id));
        const info = el('div', 'craft-info');
        info.append(el('div', 'craft-name', ITEM_NAMES[id]), el('div', 'craft-cost', costText(r.cost, r.consumes)));
        card.append(btn, info);
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
    this.minimap.update(p, state);
    const clock = formatClock(state.phaseRemaining);
    if (this.last.clock !== clock) {
      this.last.clock = clock;
      this.phaseTime.textContent = clock;
    }
  }

  /** Eventos del paso: carteles de amanecer y anochecer. */
  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'dayPassed') this.showBanner(`DÍA ${e.day + 1}`);
      else if (e.type === 'nightFell') this.showBanner('CAE LA NOCHE');
    }
  }

  /** Cartel grande centrado que se funde solo; uno a la vez. */
  showBanner(text: string): void {
    this.banner?.remove();
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    const b = el('div', 'hud-banner', text);
    this.root.appendChild(b);
    this.banner = b;
    this.bannerTimer = setTimeout(() => {
      if (this.banner === b) {
        b.remove();
        this.banner = null;
      }
    }, BANNER_SECONDS * 1000);
  }

  destroy(): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.root.remove();
  }
}

/** Tooltip de un slot: el abrigo explica el clic y la cantimplora llena dice cuántos tragos quedan. */
function slotTitle(item: ItemId, count: number): string {
  if (ITEM_META[item].equippable) return `${ITEM_NAMES[item]} · clic para poner o quitar`;
  if (item === 'canteen_full') return `${ITEM_NAMES[item]} · ${count} ${count === 1 ? 'trago' : 'tragos'}`;
  return ITEM_NAMES[item];
}

function costText(cost: Partial<Record<ItemId, number>>, consumes?: ItemId): string {
  const parts = (Object.entries(cost) as [ItemId, number][]).map(([item, n]) => `${n} ${ITEM_NAMES_LOWER[item]}`);
  if (consumes) parts.push(`1 ${ITEM_NAMES_LOWER[consumes]}`);
  return parts.join(' · ');
}
