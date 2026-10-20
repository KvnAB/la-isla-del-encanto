export function len(x: number, y: number): number {
  return Math.hypot(x, y);
}

/** Normaliza; (0,0) se queda en (0,0). */
export function norm(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y);
  return l > 0 ? [x / l, y / l] : [0, 0];
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function angleTo(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/** Diferencia angular con signo en (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d <= -Math.PI) d += Math.PI * 2;
  while (d > Math.PI) d -= Math.PI * 2;
  return d;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
