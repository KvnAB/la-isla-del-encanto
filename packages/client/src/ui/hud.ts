import { countItem, findSlot, ITEM_META, mountable, type CreatureState, type GameConfig, type GameEvent, type ItemId, type PlayerState, type RecipeDef, type WorldState } from '@draycol/core';
import type { CommandBody } from '../game/input';
import './hud.css';
import { SLOT_KEY_LABELS } from '../game/input';
import { itemIconDataUrl } from './icons';
import { formatClock, formatPoints, ITEM_NAMES, ITEM_NAMES_LOWER, PET_STATE } from './names';
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
  private readonly slotsRow: HTMLElement;
  /** Casillas visibles la última vez (el inventario crece al matar pingüinos). */
  private lastSlotCount = -1;
  private readonly craftBox: HTMLElement;
  private lastRecipes = '';
  private readonly dayEl: HTMLElement;
  private readonly pointsEl: HTMLElement;
  private readonly phaseIcon: HTMLElement;
  private readonly phaseTime: HTMLElement;
  /** "E · Montar" / "E · Bajar" encima de las barras. */
  private readonly prompt: HTMLElement;
  private lastPrompt = '';
  /** Fichas de las criaturas domadas, debajo de las casillas. */
  private readonly petsBox: HTMLElement;
  private lastPets = '';
  /** Cuadro para ponerle nombre a la criatura recién domada. */
  private nameForm: HTMLFormElement | null = null;
  /** Libro de recetas: lista de todo lo fabricable y, al elegir una, sus materiales frente a lo que se tiene. */
  private readonly book: HTMLElement;
  private readonly bookDetail: HTMLElement;
  private bookRecipe: ItemId | null = null;
  private lastBookDetail = '';
  private lastInventory: (import('@draycol/core').Slot | null)[] = [];
  readonly minimap = new Minimap();
  private last = { day: -1, points: -1, isNight: false, clock: '' };

  constructor(
    parent: HTMLElement,
    private readonly cfg: GameConfig,
    private readonly onCraft: (id: ItemId) => void,
    private readonly onSelectSlot: (i: number) => void,
    /** Órdenes a las mascotas desde las fichas: llamar, dormir, renombrar. */
    private readonly onPet: (c: CommandBody) => void = () => {},
  ) {
    this.root = el('div', 'hud layer');

    // Arriba izquierda: recetas disponibles y, debajo, el botón del libro de recetas
    this.craftBox = el('div', 'hud-craft');
    this.root.appendChild(this.craftBox);
    const bookBtn = el('button', 'hud-book-btn', 'Recetas (R)');
    bookBtn.type = 'button';
    bookBtn.title = 'Qué se puede fabricar y qué hace falta';
    bookBtn.addEventListener('click', () => this.toggleBook());
    this.root.appendChild(bookBtn);
    this.book = el('div', 'hud-book');
    this.book.hidden = true;
    const list = el('div', 'book-list');
    for (const r of cfg.recipes) {
      const item = el('button', 'book-item', ITEM_NAMES[r.id]);
      item.type = 'button';
      item.dataset.id = r.id;
      item.addEventListener('click', () => {
        this.bookRecipe = r.id;
        for (const b of list.children) b.classList.toggle('selected', (b as HTMLElement).dataset.id === r.id);
        this.renderBookDetail();
      });
      list.appendChild(item);
    }
    this.bookDetail = el('div', 'book-detail', 'Elige algo de la lista para ver qué hace falta.');
    this.book.append(list, this.bookDetail);
    this.root.appendChild(this.book);
    window.addEventListener('keydown', this.onBookKey);

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

    // Abajo centro: aviso de montar, barras + slots
    const bottom = el('div', 'hud-bottom');
    this.prompt = el('div', 'hud-prompt');
    this.prompt.hidden = true;
    bottom.appendChild(this.prompt);
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
    // se crean todas las casillas posibles; las que el jugador aún no tiene van ocultas
    const slotsRow = el('div', 'hud-slots');
    this.slotsRow = slotsRow;
    for (let i = 0; i < cfg.slotReward.maxSlots; i++) {
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
    this.petsBox = el('div', 'hud-pets');
    bottom.append(barsRow, slotsRow, this.petsBox);
    this.root.appendChild(bottom);

    parent.appendChild(this.root);
  }

  update(p: PlayerState, state: WorldState, recipes: ItemId[]): void {
    this.lastInventory = p.inventory;
    if (!this.book.hidden) this.renderBookDetail();
    const promptText = p.mount !== null ? 'E · Bajar' : mountable(state, p, this.cfg) ? 'E · Montar' : '';
    if (promptText !== this.lastPrompt) {
      this.lastPrompt = promptText;
      this.prompt.textContent = promptText;
      this.prompt.hidden = promptText === '';
    }
    if (p.inventory.length !== this.lastSlotCount) {
      this.lastSlotCount = p.inventory.length;
      this.slotsRow.style.gridTemplateColumns = `repeat(${p.inventory.length}, var(--slot-size))`;
      this.slotsRow.classList.toggle('many', p.inventory.length > 14);
      this.slots.forEach((s, i) => (s.el.hidden = i >= p.inventory.length));
    }
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

    this.updatePets(p, state);

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

  /** Una ficha por criatura domada del jugador: nombre (clic: la llama), vida, estado y botón dormir/despertar. Solo se rehace si cambia algo. */
  private updatePets(p: PlayerState, state: WorldState): void {
    const pets = state.creatures.filter((c) => c.owner === p.id);
    const key = pets.map((c) => `${c.id}:${c.name}:${c.mode}:${Math.round(c.hp)}`).join('|');
    if (key === this.lastPets) return;
    this.lastPets = key;
    this.petsBox.replaceChildren(...pets.map((c) => this.petCard(c)));
  }

  private petCard(c: CreatureState): HTMLElement {
    const card = el('div', 'pet-card');
    const name = el('button', 'pet-name', c.name);
    name.type = 'button';
    name.title = 'Llamarlo: viene corriendo hacia ti';
    name.addEventListener('click', () => this.onPet({ type: 'petCall', entityId: c.id }));
    const hp = el('div', 'pet-hp');
    const fill = el('div', 'pet-hp-fill');
    fill.style.width = `${Math.round((100 * c.hp) / this.cfg.taming.hp)}%`;
    hp.appendChild(fill);
    const state = el('div', 'pet-state', PET_STATE[c.mode]);
    const sleeping = c.mode === 'sleep';
    const sleep = el('button', 'pet-sleep', sleeping ? 'Despertar' : 'Dormir');
    sleep.type = 'button';
    sleep.title = sleeping ? 'Se despierta y viene hacia ti' : 'Se queda dormido donde está: nadie le hace daño y se cura rápido';
    sleep.disabled = c.mode === 'ride';
    sleep.addEventListener('click', () => this.onPet(sleeping ? { type: 'petCall', entityId: c.id } : { type: 'petSleep', entityId: c.id }));
    card.append(name, hp, state, sleep);
    return card;
  }

  /** Cuadro con un campo de texto para nombrar la criatura recién domada; Enter guarda, Escape cierra. */
  private askName(entityId: number): void {
    this.closeName();
    const form = el('form', 'hud-name');
    const label = el('label', 'hud-name-label', '¿Cómo se llama tu puma?');
    const input = el('input', 'hud-name-input');
    input.type = 'text';
    input.maxLength = this.cfg.taming.nameMaxLength;
    input.placeholder = 'Nombre';
    input.autocomplete = 'off';
    const ok = el('button', 'hud-name-ok', 'Guardar');
    ok.type = 'submit';
    form.append(label, input, ok);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (name) this.onPet({ type: 'rename', entityId, name });
      this.closeName();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeName();
    });
    this.root.appendChild(form);
    this.nameForm = form;
    input.focus();
  }

  private closeName(): void {
    this.nameForm?.remove();
    this.nameForm = null;
  }

  /** Abre o cierra el libro de recetas (botón, tecla R o Escape para cerrar). El juego sigue mientras está abierto. */
  toggleBook(open = this.book.hidden): void {
    this.book.hidden = !open;
    if (open) this.renderBookDetail();
  }

  private readonly onBookKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !this.book.hidden) this.toggleBook(false);
  };

  /** Materiales de la receta elegida frente al inventario; solo toca el DOM si cambia el texto. */
  private renderBookDetail(): void {
    const r = this.cfg.recipes.find((x) => x.id === this.bookRecipe);
    if (!r) return;
    const inv = this.lastInventory;
    const rows = (Object.entries(r.cost) as [ItemId, number][]).map(([item, n]) => ({ text: `${ITEM_NAMES[item]} ${countItem(inv, item)}/${n}`, ok: countItem(inv, item) >= n }));
    const hasTool = !r.consumes || findSlot(inv, r.consumes) !== -1;
    const consumes = r.consumes ? `Gasta: ${ITEM_NAMES[r.consumes]}${hasTool ? '' : ' (no lo tienes)'}` : '';
    const unique = r.unique && findSlot(inv, r.id) !== -1 ? 'Ya tienes uno (solo puede haber uno)' : '';
    const can = rows.every((x) => x.ok) && hasTool && !unique;
    const key = [r.id, ...rows.map((x) => `${x.text}${x.ok}`), consumes, unique, can].join('|');
    if (key === this.lastBookDetail) return;
    this.lastBookDetail = key;
    this.bookDetail.replaceChildren(el('div', 'book-title', ITEM_NAMES[r.id]));
    for (const x of rows) this.bookDetail.appendChild(el('div', `book-cost ${x.ok ? 'ok' : 'missing'}`, x.text));
    if (consumes) this.bookDetail.appendChild(el('div', `book-consumes ${hasTool ? 'ok' : 'missing'}`, consumes));
    if (unique) this.bookDetail.appendChild(el('div', 'book-consumes missing', unique));
    this.bookDetail.appendChild(el('div', 'book-points', `${r.points} puntos`));
    const btn = el('button', 'book-craft', 'Fabricar');
    btn.type = 'button';
    btn.disabled = !can;
    btn.addEventListener('click', () => this.onCraft(r.id));
    this.bookDetail.appendChild(btn);
  }

  /** Eventos del paso: carteles de amanecer, anochecer y casilla nueva; cuadro del nombre al domar. */
  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'creatureTamed') this.askName(e.entityId);
      if (e.type === 'dayPassed') this.showBanner(`DÍA ${e.day + 1}`);
      else if (e.type === 'nightFell') this.showBanner('CAE LA NOCHE');
      else if (e.type === 'slotUnlocked') this.showBanner(`¡CASILLA NUEVA! ${e.slots} de ${this.cfg.slotReward.maxSlots}`);
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
    this.closeName();
    window.removeEventListener('keydown', this.onBookKey);
    this.root.remove();
  }
}

/** Tooltip de un slot: el abrigo explica el clic, la cantimplora llena dice cuántos tragos quedan y el hueso cómo domar. */
function slotTitle(item: ItemId, count: number): string {
  if (ITEM_META[item].equippable) return `${ITEM_NAMES[item]} · clic para poner o quitar`;
  if (item === 'bone') return `${ITEM_NAMES[item]} · úsalo apuntando a un puma para domarlo`;
  if (item === 'stone_wall') return `${ITEM_NAMES[item]} · clic: anillo de piedras a tu alrededor; los animales no pasan`;
  if (item === 'canteen_full') return `${ITEM_NAMES[item]} · ${count} ${count === 1 ? 'trago' : 'tragos'}`;
  return ITEM_NAMES[item];
}

function costText(cost: Partial<Record<ItemId, number>>, consumes?: ItemId): string {
  const parts = (Object.entries(cost) as [ItemId, number][]).map(([item, n]) => `${n} ${ITEM_NAMES_LOWER[item]}`);
  if (consumes) parts.push(`1 ${ITEM_NAMES_LOWER[consumes]}`);
  return parts.join(' · ');
}
