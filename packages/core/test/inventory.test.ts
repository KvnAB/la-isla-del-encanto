import { describe, expect, it } from 'vitest';
import { addItem, countItem, findSlot, removeItem } from '../src/systems/inventory.js';
import type { Slot } from '../src/types.js';

const empty = (): (Slot | null)[] => Array.from({ length: 8 }, () => null);

describe('inventario', () => {
  it('apila unidades del mismo material en un solo slot', () => {
    const inv = empty();
    expect(addItem(inv, 'wood', 5)).toBe(0);
    expect(addItem(inv, 'wood', 7)).toBe(0);
    expect(inv[0]).toEqual({ item: 'wood', count: 12 });
    expect(inv[1]).toBeNull();
  });

  it('ocho tipos distintos llenan los ocho slots y el noveno no cabe', () => {
    const inv = empty();
    const items = ['wood', 'stone', 'apple', 'wool', 'needle', 'tiger_pelt', 'raw_steak', 'cooked_steak'] as const;
    for (const it of items) expect(addItem(inv, it, 1)).toBe(0);
    expect(inv.every((s) => s !== null)).toBe(true);
    expect(addItem(inv, 'campfire', 3)).toBe(3);
    expect(countItem(inv, 'campfire')).toBe(0);
  });

  it('las herramientas no se apilan: cada una ocupa su slot', () => {
    const inv = empty();
    addItem(inv, 'wood_sword', 1);
    addItem(inv, 'wood_sword', 1);
    expect(inv[0]).toEqual({ item: 'wood_sword', count: 1 });
    expect(inv[1]).toEqual({ item: 'wood_sword', count: 1 });
  });

  it('removeItem con cantidad insuficiente devuelve false y no toca nada', () => {
    const inv = empty();
    addItem(inv, 'wood', 5);
    expect(removeItem(inv, 'wood', 6)).toBe(false);
    expect(countItem(inv, 'wood')).toBe(5);
  });

  it('removeItem deja el slot en null al llegar a cero', () => {
    const inv = empty();
    addItem(inv, 'wood', 5);
    expect(removeItem(inv, 'wood', 5)).toBe(true);
    expect(inv[0]).toBeNull();
  });

  it('findSlot devuelve el índice o -1', () => {
    const inv = empty();
    addItem(inv, 'stone', 1);
    expect(findSlot(inv, 'stone')).toBe(0);
    expect(findSlot(inv, 'wood')).toBe(-1);
  });
});
