/** Efectos de pantalla: destello rojo al recibir daño y sacudida leve al golpear. */
export class Fx {
  private readonly flash: HTMLDivElement;
  private flashT = 0;
  private shakeT = 0;
  shakeX = 0;
  shakeY = 0;

  constructor(parent: HTMLElement) {
    this.flash = document.createElement('div');
    this.flash.className = 'damage-flash';
    parent.appendChild(this.flash);
  }

  damageFlash(): void {
    this.flashT = 0.15;
  }

  hitShake(): void {
    this.shakeT = 0.1;
  }

  update(dt: number): void {
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.flash.style.opacity = String(Math.min(1, this.flashT / 0.15));
    } else if (this.flash.style.opacity !== '0') {
      this.flash.style.opacity = '0';
    }
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const k = this.shakeT / 0.1;
      this.shakeX = (Math.random() * 2 - 1) * 3 * k;
      this.shakeY = (Math.random() * 2 - 1) * 3 * k;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  destroy(): void {
    this.flash.remove();
  }
}
