/**
 * Pose del golpe del jugador a partir de `swing` (el núcleo lo pone a 1 al golpear y lo baja a 0 en `hitCooldown`).
 * Fase de ataque corta y rápida (salida con ease-out) hasta el impacto, y vuelta más lenta (smoothstep) al reposo.
 * Todos los valores son 0 en reposo; las distancias son fracciones del radio del jugador.
 */

/** Fracción del swing que dura el ataque hasta el impacto; el resto es la vuelta. */
export const STRIKE_END = 0.35;

export interface SwingPose {
  /** Giro de la mano delantera alrededor del cuerpo (rad), positivo = barre por delante de arriba hacia abajo. */
  handAngle: number;
  /** Estirón de la mano hacia fuera del cuerpo (× radio). */
  handReach: number;
  /** Giro extra de la herramienta (rad), en el mismo sentido que la mano. */
  toolRot: number;
  /** Cuánto retrocede la mano trasera (× radio). */
  backHandPull: number;
  /** Cuánto se adelanta el cuerpo en la dirección de la mirada (× radio). */
  lunge: number;
}

const AMPLITUDE: SwingPose = { handAngle: 1.1, handReach: 0.35, toolRot: 1.3, backHandPull: 0.3, lunge: 0.18 };

/** 0 → 1 → 0: cuánto del arco se ha recorrido en cada instante. */
export function swingEnvelope(swing: number): number {
  const t = Math.min(1, Math.max(0, 1 - swing));
  if (t <= 0 || t >= 1) return 0;
  if (t < STRIKE_END) {
    const k = t / STRIKE_END;
    return 1 - (1 - k) * (1 - k); // ease-out: arranca rápido, frena al impacto
  }
  const k = (t - STRIKE_END) / (1 - STRIKE_END);
  return 1 - (3 * k * k - 2 * k * k * k); // smoothstep invertido: vuelve suave
}

export function swingPose(swing: number): SwingPose {
  const e = swingEnvelope(swing);
  return {
    handAngle: AMPLITUDE.handAngle * e,
    handReach: AMPLITUDE.handReach * e,
    toolRot: AMPLITUDE.toolRot * e,
    backHandPull: AMPLITUDE.backHandPull * e,
    lunge: AMPLITUDE.lunge * e,
  };
}
