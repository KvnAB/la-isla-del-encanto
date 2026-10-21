import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ITEM_META, type CreatureKind, type ItemId } from '@draycol/core';
import { CREATURE_NAMES, ITEM_NAMES } from '../src/ui/names';

describe('nombres en español', () => {
  it('todos los objetos tienen nombre', () => {
    for (const id of Object.keys(ITEM_META) as ItemId[]) expect(ITEM_NAMES[id], id).toMatch(/\S/);
  });

  it('todas las criaturas tienen nombre', () => {
    for (const kind of Object.keys(DEFAULT_CONFIG.creatures.defs) as CreatureKind[]) expect(CREATURE_NAMES[kind], kind).toMatch(/\S/);
  });
});
