export const CORE_VERSION = '0.1.0';

export * from './types.js';
export * from './config.js';
export { Rng } from './rng.js';
export * as vec from './vec.js';
export { World } from './world.js';
export { generateIsland, terrainAt, isWalkable, findLandSpot } from './island.js';
export { availableRecipes, craft } from './systems/crafting.js';
export { collisionRadius, resourceAvailable, resourceCapacity, toolClassOf, weaponClassOf } from './systems/resources.js';
export { addItem, removeItem, countItem, findSlot } from './systems/inventory.js';
export { nearCampfire } from './systems/campfire.js';
export { coatWorn } from './systems/vitals.js';
export { inReach, inArc } from './systems/hit.js';
