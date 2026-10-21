import { Graphics } from 'pixi.js';

/**
 * Sombra bajo una entidad. En el estilo plano actual no hay sombras (la referencia no las usa),
 * así que devuelve un gráfico vacío; se conserva la API para poder reactivarlas.
 */
export function makeShadow(_r: number): Graphics {
  return new Graphics();
}
