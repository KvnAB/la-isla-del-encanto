import type { EntityId, WorldState } from './types.js';

export function nextId(state: WorldState): EntityId {
  return state.nextEntityId++;
}
