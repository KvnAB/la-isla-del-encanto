import type { GameConfig } from '../config.js';
import type { GameEvent, PlayerState, WorldState } from '../types.js';
import { angleDiff, angleTo, dist } from '../vec.js';
import { hitResource } from './resources.js';

export interface HitTarget {
  x: number;
  y: number;
  radius: number;
}

export function inReach(p: PlayerState, t: HitTarget, cfg: GameConfig): boolean {
  return dist(p.x, p.y, t.x, t.y) <= p.radius + t.radius + cfg.player.reach;
}

export function inArc(p: PlayerState, t: HitTarget, cfg: GameConfig): boolean {
  return Math.abs(angleDiff(p.angle, angleTo(p.x, p.y, t.x, t.y))) <= cfg.player.hitArc / 2;
}

export function nearest<T extends HitTarget>(p: PlayerState, list: T[], pred: (t: T) => boolean): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const t of list) {
    if (!pred(t)) continue;
    const d = dist(p.x, p.y, t.x, t.y) - t.radius;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export interface HitHooks {
  /** Devuelve true si recogió algo; si no, el golpe continúa con criaturas y recursos. */
  pickup?: (p: PlayerState, g: WorldState['groundItems'][number]) => boolean;
  creature?: (p: PlayerState, c: WorldState['creatures'][number]) => void;
}

/**
 * Resuelve un golpe: 1) objeto del suelo al alcance → recoger; 2) criatura al alcance y en arco → golpear;
 * 3) recurso al alcance y en arco → recolectar. Aplica cooldown y animación.
 */
export function resolveHit(state: WorldState, p: PlayerState, cfg: GameConfig, events: GameEvent[], hooks: HitHooks = {}): void {
  if (p.hitCooldown > 0) return;
  p.hitCooldown = cfg.player.hitCooldown;
  p.swing = 1;

  const groundTargets = state.groundItems.map((g) => ({ ...g, radius: cfg.groundItemRadius, ref: g }));
  const g = nearest(p, groundTargets, (t) => inReach(p, t, cfg));
  if (g && hooks.pickup && hooks.pickup(p, g.ref)) return;

  // las criaturas domadas no se golpean: el golpe pasa al recurso que haya detrás
  const c = nearest(p, state.creatures, (t) => t.owner === null && inReach(p, t, cfg) && inArc(p, t, cfg));
  if (c && hooks.creature) {
    hooks.creature(p, c);
    return;
  }

  const r = nearest(p, state.resources, (t) => inReach(p, t, cfg) && inArc(p, t, cfg));
  if (r) hitResource(state, p, r, cfg, events);
}
