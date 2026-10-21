/**
 * Contornos suaves de regiones de celdas: convierte un conjunto de celdas en polígonos cerrados
 * (bordes exteriores e interiores) y los suaviza con el algoritmo de Chaikin.
 */

export type Loop = number[]; // [x0, y0, x1, y1, ...]

/** Traza los contornos de las celdas donde `inside(c, r)` es true. Devuelve bucles en píxeles. */
export function traceContours(cols: number, rows: number, cellSize: number, inside: (c: number, r: number) => boolean): Loop[] {
  const isIn = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && inside(c, r);
  // Aristas orientadas con el interior a la izquierda: clave "x,y" → siguiente punto
  const next = new Map<string, [number, number][]>();
  const add = (ax: number, ay: number, bx: number, by: number) => {
    const k = `${ax},${ay}`;
    const list = next.get(k) ?? [];
    list.push([bx, by]);
    next.set(k, list);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isIn(c, r)) continue;
      const x0 = c;
      const y0 = r;
      const x1 = c + 1;
      const y1 = r + 1;
      if (!isIn(c, r - 1)) add(x0, y0, x1, y0); // arriba: izquierda → derecha
      if (!isIn(c + 1, r)) add(x1, y0, x1, y1); // derecha: arriba → abajo
      if (!isIn(c, r + 1)) add(x1, y1, x0, y1); // abajo: derecha → izquierda
      if (!isIn(c - 1, r)) add(x0, y1, x0, y0); // izquierda: abajo → arriba
    }
  }
  const loops: Loop[] = [];
  const used = new Set<string>();
  for (const [startKey, targets] of next) {
    for (let t = 0; t < targets.length; t++) {
      const edgeKey = `${startKey}>${targets[t][0]},${targets[t][1]}`;
      if (used.has(edgeKey)) continue;
      const [sx, sy] = startKey.split(',').map(Number);
      const loop: Loop = [];
      let cx = sx;
      let cy = sy;
      let guard = 0;
      while (guard++ < 200000) {
        loop.push(cx * cellSize, cy * cellSize);
        const outs = next.get(`${cx},${cy}`);
        if (!outs) break;
        let chosen: [number, number] | null = null;
        for (const o of outs) {
          const k = `${cx},${cy}>${o[0]},${o[1]}`;
          if (!used.has(k)) {
            chosen = o;
            used.add(k);
            break;
          }
        }
        if (!chosen) break;
        cx = chosen[0];
        cy = chosen[1];
        if (cx === sx && cy === sy) break;
      }
      if (loop.length >= 8) loops.push(loop);
    }
  }
  return loops;
}

/** Suavizado de Chaikin (bucle cerrado). */
export function smoothLoop(loop: Loop, iterations = 2): Loop {
  let pts = loop;
  for (let it = 0; it < iterations; it++) {
    const out: number[] = [];
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2];
      const ay = pts[i * 2 + 1];
      const bx = pts[((i + 1) % n) * 2];
      const by = pts[((i + 1) % n) * 2 + 1];
      out.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25, ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
    pts = out;
  }
  return pts;
}

/** Área con signo (positiva si el bucle gira en sentido horario en coordenadas de pantalla). */
export function loopArea(loop: Loop): number {
  let a = 0;
  const n = loop.length / 2;
  for (let i = 0; i < n; i++) {
    const x1 = loop[i * 2];
    const y1 = loop[i * 2 + 1];
    const x2 = loop[((i + 1) % n) * 2];
    const y2 = loop[((i + 1) % n) * 2 + 1];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Desplaza cada vértice hacia el interior (según la orientación del bucle) una distancia `d`. */
export function insetLoop(loop: Loop, d: number): Loop {
  const n = loop.length / 2;
  const sign = loopArea(loop) > 0 ? 1 : -1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const px = loop[((i - 1 + n) % n) * 2];
    const py = loop[((i - 1 + n) % n) * 2 + 1];
    const x = loop[i * 2];
    const y = loop[i * 2 + 1];
    const nx = loop[((i + 1) % n) * 2];
    const ny = loop[((i + 1) % n) * 2 + 1];
    // normales de las dos aristas adyacentes (hacia la izquierda de la dirección de avance)
    let ax = x - px;
    let ay = y - py;
    let bx = nx - x;
    let by = ny - y;
    const al = Math.hypot(ax, ay) || 1;
    const bl = Math.hypot(bx, by) || 1;
    ax /= al;
    ay /= al;
    bx /= bl;
    by /= bl;
    const n1x = -ay * sign;
    const n1y = ax * sign;
    const n2x = -by * sign;
    const n2y = bx * sign;
    let mx = n1x + n2x;
    let my = n1y + n2y;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-6) {
      mx = n1x;
      my = n1y;
    } else {
      mx /= ml;
      my /= ml;
    }
    // compensar el ángulo para mantener la distancia (acotado para esquinas muy cerradas)
    const cosHalf = Math.max(0.5, mx * n1x + my * n1y);
    const k = d / cosHalf;
    out.push(x + mx * k, y + my * k);
  }
  return out;
}
