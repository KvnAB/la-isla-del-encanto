import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META, type CreatureKind, type ItemId } from '@draycol/core';
import { causeText, CREATURE_NAMES, ITEM_NAMES, PET_STATE } from '../src/ui/names';

describe('nombres en español', () => {
  it('todos los objetos tienen nombre', () => {
    for (const id of Object.keys(ITEM_META) as ItemId[]) expect(ITEM_NAMES[id], id).toMatch(/\S/);
  });

  it('todas las criaturas tienen nombre', () => {
    for (const kind of Object.keys(DEFAULT_CONFIG.creatures.defs) as CreatureKind[]) expect(CREATURE_NAMES[kind], kind).toMatch(/\S/);
  });
});

describe('puma y esqueleto', () => {
  it('la pantalla de muerte nombra al puma y al esqueleto', () => {
    expect(causeText({ kind: 'creature', creature: 'puma' })).toBe('Te mató un puma');
    expect(causeText({ kind: 'creature', creature: 'skeleton' })).toBe('Te mató un esqueleto');
  });
});

describe('estados de mascota', () => {
  it('cada modo de criatura domada tiene texto', () => {
    expect(PET_STATE.follow).toBe('Te sigue');
    expect(PET_STATE.sleep).toBe('Durmiendo');
    expect(PET_STATE.hunt).toBe('Cazando');
    expect(PET_STATE.come).toBe('Viene');
    expect(PET_STATE.ride).toBe('Montado');
  });
});
