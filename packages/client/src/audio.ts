import type { GameEvent } from '@draycol/core';

/**
 * Sonidos sintetizados con Web Audio (sin archivos): golpe a recurso, golpe a criatura, daño recibido,
 * recoger, comer, fabricar, colocar fogata, cocinar, muerte y nuevo día.
 * El contexto se arranca con el primer gesto del usuario (requisito del navegador).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private lastPlay = new Map<string, number>();
  private heartbeatT = 0;

  constructor() {
    try {
      this._muted = localStorage.getItem('isla.muted') === '1';
    } catch {
      this._muted = false;
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(m: boolean): void {
    this._muted = m;
    try {
      localStorage.setItem('isla.muted', m ? '1' : '0');
    } catch {
      /* sin almacenamiento */
    }
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** Llamar desde un gesto del usuario (pointerdown / keydown). */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Llamar cada paso: con la vida baja suena un latido cada segundo. */
  tick(dt: number, health: number, lowHealth: number): void {
    if (health >= lowHealth || health <= 0) {
      this.heartbeatT = 0;
      return;
    }
    this.heartbeatT -= dt;
    if (this.heartbeatT <= 0) {
      this.heartbeatT = 1;
      this.play('heart', () => this.heartbeat());
    }
  }

  onEvents(events: GameEvent[], localPlayerId: number): void {
    for (const e of events) {
      switch (e.type) {
        case 'resourceHit':
          if (e.playerId === localPlayerId) this.play('hit', () => this.knock(e.item === 'gold' ? 1300 : e.item === 'stone' ? 900 : 420));
          break;
        case 'creatureHit':
          if (e.playerId === localPlayerId) this.play('thud', () => this.thud(140, 0.12));
          break;
        case 'playerDamaged':
          if (e.playerId === localPlayerId) this.play('hurt', () => this.hurt());
          break;
        case 'itemPicked':
          if (e.playerId === localPlayerId) this.play('pick', () => this.blip([660, 990], 0.06));
          break;
        case 'ate':
          if (e.playerId === localPlayerId) this.play('eat', () => this.crunch());
          break;
        case 'coatToggled':
          if (e.playerId === localPlayerId) this.play('coat', () => this.rustle());
          break;
        case 'drank':
          if (e.playerId === localPlayerId) this.play('drink', () => this.gulp());
          break;
        case 'canteenFilled':
          if (e.playerId === localPlayerId) this.play('fill', () => this.splash());
          break;
        case 'fishingStarted':
          if (e.playerId === localPlayerId) this.play('cast', () => this.splash(0.5));
          break;
        case 'fished':
          if (e.playerId === localPlayerId) this.play('fish', () => this.blip([440, 660, 880], 0.07));
          break;
        case 'crafted':
          if (e.playerId === localPlayerId) this.play('craft', () => this.blip([523, 659, 784], 0.08));
          break;
        case 'campfirePlaced':
          if (e.playerId === localPlayerId) this.play('fire', () => this.crackle());
          break;
        case 'cooked':
          if (e.playerId === localPlayerId) this.play('cook', () => this.blip([784, 988], 0.07));
          break;
        case 'creatureDied':
          if (e.playerId === localPlayerId) this.play('kill', () => this.thud(90, 0.25));
          break;
        case 'petHit':
          if (e.playerId === localPlayerId) this.play('thud', () => this.thud(160, 0.1));
          break;
        case 'creatureTamed':
          if (e.playerId === localPlayerId) this.play('tame', () => this.blip([523, 659, 784, 1047], 0.09));
          break;
        case 'slotProgress':
          if (e.playerId === localPlayerId) this.play('slotstep', () => this.blip([659, 784], 0.07));
          break;
        case 'slotUnlocked':
          if (e.playerId === localPlayerId) this.play('slot', () => this.blip([523, 659, 784, 1047, 1319], 0.08));
          break;
        case 'petDied':
          if (e.playerId === localPlayerId) this.play('petdie', () => this.thud(60, 0.5));
          break;
        case 'dayPassed':
          this.play('day', () => this.blip([523, 659, 784, 1047], 0.12));
          break;
        case 'nightFell':
          this.play('night', () => this.drone());
          break;
        case 'vitalLow':
          if (e.playerId === localPlayerId) this.play('warn', () => this.warn());
          break;
        case 'playerDied':
          if (e.playerId === localPlayerId) this.play('die', () => this.fall());
          break;
        default:
          break;
      }
    }
  }

  private play(key: string, fn: () => void): void {
    if (!this.ctx || this._muted) return;
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(key) ?? -1;
    if (now - last < 0.04) return;
    this.lastPlay.set(key, now);
    fn();
  }

  private noise(duration: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private env(gain: GainNode, peak: number, attack: number, decay: number): void {
    const t = this.ctx!.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Golpe seco a madera/piedra: ruido filtrado con un pulso tonal. */
  private knock(freq: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noise(0.09);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    this.env(g, 0.6, 0.003, 0.08);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.1);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 0.5, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.25, t + 0.08);
    const og = ctx.createGain();
    this.env(og, 0.25, 0.002, 0.07);
    o.connect(og).connect(this.master!);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Trago: dos glups graves. */
  private gulp(): void {
    const ctx = this.ctx!;
    for (const delay of [0, 0.14]) {
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(320, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  /** Chapoteo: ruido filtrado corto con el filtro subiendo. */
  private splash(level = 0.35): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noise(0.22);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
    f.Q.value = 0.7;
    const g = ctx.createGain();
    this.env(g, level, 0.01, 0.2);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.23);
  }

  /** Aviso de barra baja: dos notas descendentes. */
  private warn(): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    [660, 440].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      const t = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.16);
    });
  }

  /** Cae la noche: tono grave largo que se apaga. */
  private drone(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 1.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = ctx.createGain();
    this.env(g, 0.35, 0.05, 1.4);
    o.connect(f).connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 1.5);
  }

  /** Latido: dos golpes graves, el segundo más flojo. */
  private heartbeat(): void {
    const ctx = this.ctx!;
    for (const [delay, peak] of [[0, 0.5], [0.16, 0.32]] as const) {
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.16);
    }
  }

  /** Impacto blando (criatura). */
  private thud(freq: number, decay: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + decay);
    const g = ctx.createGain();
    this.env(g, 0.7, 0.004, decay);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + decay + 0.02);
    const n = this.noise(0.06);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const ng = ctx.createGain();
    this.env(ng, 0.3, 0.002, 0.05);
    n.connect(f).connect(ng).connect(this.master!);
    n.start(t);
    n.stop(t + 0.07);
  }

  /** Daño recibido: golpe grave con rasgado. */
  private hurt(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    this.env(g, 0.55, 0.004, 0.18);
    o.connect(f).connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.22);
  }

  /** Tonos cortos en secuencia (recoger, fabricar, cocinar, día). */
  private blip(freqs: number[], step: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const g = ctx.createGain();
      const t = t0 + i * step;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.95);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + step);
    });
  }

  /** Roce de tela al ponerse o quitarse el abrigo. */
  private rustle(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noise(0.18);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.15);
    f.Q.value = 0.9;
    const g = ctx.createGain();
    this.env(g, 0.28, 0.02, 0.15);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.19);
  }

  private crunch(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const n = this.noise(0.05);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1800;
      const g = ctx.createGain();
      const tt = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(0.35, tt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      n.connect(f).connect(g).connect(this.master!);
      n.start(tt);
      n.stop(tt + 0.06);
    }
  }

  private crackle(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const n = this.noise(0.35);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    this.env(g, 0.3, 0.02, 0.3);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
    n.stop(t + 0.36);
    this.thud(110, 0.15);
  }

  private fall(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.7);
    const g = ctx.createGain();
    this.env(g, 0.5, 0.01, 0.7);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.75);
  }
}
