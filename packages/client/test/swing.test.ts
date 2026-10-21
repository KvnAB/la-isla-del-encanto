import { describe, expect, it } from 'vitest';
import { swingPose, STRIKE_END } from '../src/render/sprites/swing';

describe('swingPose', () => {
  it('en reposo (swing 0) todo está en su sitio', () => {
    const rest = swingPose(0);
    expect(rest).toEqual({ handAngle: 0, handReach: 0, toolRot: 0, backHandPull: 0, lunge: 0 });
  });

  it('el golpe arranca al empezar el swing (swing 1) y recorre el arco por delante del cuerpo hasta el impacto', () => {
    // swing baja de 1 a 0 en el núcleo; el progreso es 1 - swing
    const start = swingPose(1);
    expect(start).toEqual(swingPose(0)); // t = 0: aún en reposo, no hay salto
    const apex = swingPose(1 - STRIKE_END);
    expect(apex.handAngle).toBeGreaterThan(0.6); // la mano ha cruzado por delante (hacia -y → +y)
    expect(apex.handReach).toBeGreaterThan(0); // y se estira hacia delante
    expect(apex.toolRot).toBeGreaterThan(0.8); // el pico ha girado hacia abajo
    expect(apex.backHandPull).toBeGreaterThan(0); // la otra mano retrocede
    expect(apex.lunge).toBeGreaterThan(0); // el cuerpo se adelanta un poco
  });

  it('la salida es rápida y la vuelta lenta: a mitad del golpe ya ha pasado más de la mitad del arco', () => {
    const half = swingPose(1 - STRIKE_END / 2);
    const apex = swingPose(1 - STRIKE_END);
    expect(half.handAngle).toBeGreaterThan(apex.handAngle * 0.5);
    // en la vuelta, con el mismo tiempo transcurrido desde el impacto, aún queda mucho por recorrer
    const back = swingPose(1 - STRIKE_END - STRIKE_END / 2);
    expect(back.handAngle).toBeGreaterThan(apex.handAngle * 0.4);
    expect(back.handAngle).toBeLessThan(apex.handAngle);
  });

  it('vuelve exactamente al reposo al acabar y nunca se sale del arco', () => {
    expect(swingPose(0.0001).handAngle).toBeCloseTo(0, 2);
    let prev = swingPose(1);
    for (let s = 1; s >= 0; s -= 0.01) {
      const q = swingPose(s);
      expect(q.handAngle).toBeGreaterThanOrEqual(-1e-9);
      expect(q.handAngle).toBeLessThanOrEqual(swingPose(1 - STRIKE_END).handAngle + 1e-9);
      // continuo: sin saltos grandes entre pasos
      expect(Math.abs(q.handAngle - prev.handAngle)).toBeLessThan(0.25);
      prev = q;
    }
  });
});
