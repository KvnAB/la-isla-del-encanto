import type { GameConfig } from '../config.js';
import type { GameEvent, WorldState } from '../types.js';

/** Actualiza day / isNight / phaseRemaining a partir de state.time (ya avanzado en dt). */
export function stepDayCycle(state: WorldState, cfg: GameConfig, dt: number, events: GameEvent[]): void {
  const prevDay = state.day;
  const wasNight = state.isNight;
  const t = state.time + dt;
  const inCycle = t % cfg.dayCycleSeconds;
  state.day = Math.floor(t / cfg.dayCycleSeconds) + 1;
  state.isNight = inCycle >= cfg.daySeconds;
  state.phaseRemaining = state.isNight ? cfg.dayCycleSeconds - inCycle : cfg.daySeconds - inCycle;
  if (state.day > prevDay) events.push({ type: 'dayPassed', day: prevDay });
  if (!wasNight && state.isNight) events.push({ type: 'nightFell', day: state.day });
}
