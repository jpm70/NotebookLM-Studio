/**
 * Servicio de Audio de Fondo (BGM) y Auto-Ducking Inteligente
 * Genera pistas de música estéreo en tiempo real mediante Web Audio API
 * o reproduce pistas cargadas por el usuario, con ducking suave al hablar.
 *
 * Las notas se programan con antelación sobre el reloj del AudioContext (no con
 * setInterval directo), así el ritmo no se descuadra aunque el navegador frene los
 * temporizadores de la pestaña durante la grabación.
 */

import { getSharedAudioContext } from './sharedAudio';

export type BgmTrackType = 'lofi' | 'synthwave' | 'acoustic' | 'ambient' | 'scifi' | 'custom' | 'none';

/** Cuánto baja la música mientras hablan los locutores (fracción del volumen elegido) */
const DUCK_RATIO = 0.35;
/** Margen de programación por delante del reloj de audio (s) */
const LOOKAHEAD = 1.5;
/**
 * Ganancia de cada pista para que todas suenen parecido (≈ -30 dB RMS con el volumen
 * por defecto del 18 %). Medido con un analizador sobre la salida real.
 */
const TRACK_MAKEUP: Partial<Record<BgmTrackType, number>> = {
  lofi: 2.8,
  synthwave: 2.65,
  acoustic: 4.5,
  ambient: 1.05,
  scifi: 1.35,
  custom: 1,
};

export class AudioBgmService {
  private audioCtx: AudioContext | null = null;
  /** Volumen general elegido por el usuario (y ducking) */
  private gainNode: GainNode | null = null;
  /** Bus de la pista actual: se desconecta entero al parar */
  private trackBus: GainNode | null = null;
  private isPlaying = false;
  private currentTrack: BgmTrackType = 'none';
  private baseVolume = 0.18;
  private duckVolume = 0.18 * DUCK_RATIO;
  private isDucked = false;
  private customAudioEl: HTMLAudioElement | null = null;
  private customMediaSource: MediaElementAudioSourceNode | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private sustainedNodes: AudioScheduledSourceNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;

  private initContext() {
    const ctx = getSharedAudioContext();
    if (this.audioCtx !== ctx || !this.gainNode) {
      this.audioCtx = ctx;
      this.noiseBuffer = null;
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.baseVolume, ctx.currentTime);
      this.gainNode.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public getGainNode(): GainNode | null {
    this.initContext();
    return this.gainNode;
  }

  public getAudioContext(): AudioContext | null {
    this.initContext();
    return this.audioCtx;
  }

  public getCurrentTrack(): BgmTrackType {
    return this.isPlaying ? this.currentTrack : 'none';
  }

  public start(track: BgmTrackType, volume = 0.18, customDataUrl?: string) {
    this.stop();
    if (track === 'none') return;

    this.initContext();
    const ctx = this.audioCtx;
    if (!ctx || !this.gainNode) return;

    this.baseVolume = Math.max(0.02, Math.min(volume, 0.5));
    this.duckVolume = this.baseVolume * DUCK_RATIO;
    this.currentTrack = track;
    this.isPlaying = true;
    this.isDucked = false;

    this.gainNode.gain.cancelScheduledValues(ctx.currentTime);
    this.gainNode.gain.setValueAtTime(this.baseVolume, ctx.currentTime);

    this.trackBus = ctx.createGain();
    const makeup = track === 'custom' && !customDataUrl ? TRACK_MAKEUP.lofi! : TRACK_MAKEUP[track] ?? 1;
    this.trackBus.gain.setValueAtTime(makeup, ctx.currentTime);
    // Limitador suave: con el volumen al máximo la música no satura la mezcla
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-8, ctx.currentTime);
    limiter.knee.setValueAtTime(6, ctx.currentTime);
    limiter.ratio.setValueAtTime(8, ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    limiter.release.setValueAtTime(0.25, ctx.currentTime);
    this.trackBus.connect(limiter);
    limiter.connect(this.gainNode);

    if (track === 'custom') {
      if (customDataUrl) {
        this.playCustomTrack(customDataUrl);
      } else {
        // Sin archivo subido: mejor una pista sintética que silencio
        this.currentTrack = 'lofi';
        this.playLofiTrack();
      }
      return;
    }

    switch (track) {
      case 'lofi':
        this.playLofiTrack();
        break;
      case 'synthwave':
        this.playSynthwaveTrack();
        break;
      case 'acoustic':
        this.playAcousticTrack();
        break;
      case 'scifi':
        this.playAmbientTrack(true);
        break;
      case 'ambient':
      default:
        this.playAmbientTrack(false);
        break;
    }
  }

  // ------------------------------------------------------------------ utilidades

  /**
   * Programa pasos de duración fija por delante del reloj de audio.
   * `step(time, index)` debe crear los nodos de ese paso empezando en `time`.
   */
  private runSequencer(stepDur: number, step: (time: number, index: number) => void) {
    const ctx = this.audioCtx!;
    let nextTime = ctx.currentTime + 0.08;
    let index = 0;
    const pump = () => {
      if (!this.isPlaying) return;
      // Si el reloj nos adelantó (pestaña congelada), no amontonar notas atrasadas
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
      while (nextTime < ctx.currentTime + LOOKAHEAD) {
        step(nextTime, index);
        index++;
        nextTime += stepDur;
      }
    };
    pump();
    this.schedulerId = setInterval(pump, 200);
  }

  private getNoise(): AudioBuffer {
    const ctx = this.audioCtx!;
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 1);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  /** Nota con envolvente ataque/caída, filtrada y opcionalmente panoramizada */
  private note(opts: {
    time: number;
    freq: number;
    dur: number;
    peak: number;
    type?: OscillatorType;
    attack?: number;
    cutoff?: number;
    pan?: number;
    detune?: number;
  }) {
    const ctx = this.audioCtx!;
    const { time, freq, dur, peak, type = 'sine', attack = 0.02, cutoff = 2400, pan = 0, detune = 0 } = opts;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (detune) osc.detune.setValueAtTime(detune, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(peak, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(env);
    if (pan && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, time);
      env.connect(panner);
      panner.connect(this.trackBus!);
    } else {
      env.connect(this.trackBus!);
    }
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private kick(time: number, peak = 0.55) {
    const ctx = this.audioCtx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.22);
    const env = ctx.createGain();
    env.gain.setValueAtTime(peak, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    osc.connect(env);
    env.connect(this.trackBus!);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  private hat(time: number, peak = 0.08, dur = 0.05, cutoff = 7000) {
    const ctx = this.audioCtx!;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(cutoff, time);
    const env = ctx.createGain();
    env.gain.setValueAtTime(peak, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.trackBus!);
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  // ------------------------------------------------------------------ pistas

  private playCustomTrack(dataUrl: string) {
    if (!this.audioCtx || !this.trackBus) return;
    try {
      this.customAudioEl = new Audio(dataUrl);
      this.customAudioEl.loop = true;
      this.customMediaSource = this.audioCtx.createMediaElementSource(this.customAudioEl);
      this.customMediaSource.connect(this.trackBus);
      this.customAudioEl.play().catch((e) => console.warn('No se pudo reproducir la música propia:', e));
    } catch (e) {
      console.warn('Error reproduciendo pista personalizada BGM:', e);
    }
  }

  /** Lo-Fi: acordes de piano eléctrico suaves + bombo y charles perezosos (~75 BPM) */
  private playLofiTrack() {
    const chords = [
      [220, 261.63, 329.63, 392], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [130.81, 164.81, 196, 246.94], // Cmaj7
      [146.83, 174.61, 220, 261.63], // Dm7
    ];
    const beat = 0.8; // negra
    this.runSequencer(beat / 2, (t, i) => {
      const eighth = i % 8; // 8 corcheas por compás, un acorde por compás
      const bar = Math.floor(i / 8);
      if (eighth === 0) {
        const chord = chords[bar % chords.length];
        chord.forEach((f, k) =>
          this.note({ time: t + k * 0.012, freq: f, dur: 3.2, peak: 0.13 / (1 + k * 0.35), type: k === 0 ? 'triangle' : 'sine', attack: 0.04, cutoff: 1400, pan: (k - 1.5) * 0.25 })
        );
        this.note({ time: t, freq: chord[0] / 2, dur: 1.4, peak: 0.22, type: 'sine', cutoff: 400 });
      }
      if (eighth === 0 || eighth === 5) this.kick(t, 0.42);
      if (eighth === 2 || eighth === 6) this.hat(t, 0.12, 0.12, 2500); // caja suave
      if (i % 2 === 1) this.hat(t + 0.04, 0.05);
    });
  }

  /** Synthwave: bajo en corcheas con sierra filtrada, pad y bombo a negras (~110 BPM) */
  private playSynthwaveTrack() {
    const roots = [110, 87.31, 130.81, 98]; // A, F, C, G
    const stepDur = 0.27; // corchea
    this.runSequencer(stepDur, (t, i) => {
      const bar = Math.floor(i / 8);
      const root = roots[bar % roots.length];
      const oct = i % 2 === 1 ? 2 : 1;
      this.note({ time: t, freq: root * oct, dur: stepDur * 0.95, peak: 0.2, type: 'sawtooth', attack: 0.005, cutoff: 700 });
      if (i % 8 === 0) {
        [root * 2, root * 2.52, root * 3].forEach((f, k) =>
          this.note({ time: t, freq: f, dur: stepDur * 8, peak: 0.06, type: 'sawtooth', attack: 0.6, cutoff: 1200, pan: (k - 1) * 0.5, detune: k * 6 })
        );
      }
      if (i % 2 === 0) this.kick(t, 0.5);
      if (i % 4 === 2) this.hat(t, 0.14, 0.14, 2000);
      this.hat(t + stepDur / 2, 0.035);
    });
  }

  /** Acústico: arpegio tipo guitarra punteada (~90 BPM) */
  private playAcousticTrack() {
    const progression = [
      [130.81, 196, 261.63, 329.63, 392, 329.63, 261.63, 196], // C
      [110, 164.81, 220, 261.63, 329.63, 261.63, 220, 164.81], // Am
      [87.31, 174.61, 220, 261.63, 349.23, 261.63, 220, 174.61], // F
      [98, 146.83, 196, 246.94, 293.66, 246.94, 196, 146.83], // G
    ];
    const stepDur = 0.33;
    this.runSequencer(stepDur, (t, i) => {
      const bar = Math.floor(i / 8);
      const f = progression[bar % progression.length][i % 8];
      this.note({ time: t, freq: f, dur: 1.6, peak: i % 8 === 0 ? 0.24 : 0.15, type: 'triangle', attack: 0.004, cutoff: 2600, pan: ((i % 8) - 3.5) * 0.08 });
    });
  }

  /** Ambiente: colchón sostenido que respira; en "scifi" con destellos de arpegio */
  private playAmbientTrack(scifi: boolean) {
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;
    const freqs = scifi ? [110, 164.81, 220, 277.18] : [130.81, 196, 293.66, 392];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = scifi && idx === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx - 1.5) * 5, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(scifi ? 900 : 1200, now);

      // Respiración lenta del volumen de cada voz
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.16 / (idx + 1), now + 2.5);
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.07 + idx * 0.03, now);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(0.05 / (idx + 1), now);
      lfo.connect(lfoDepth);
      lfoDepth.connect(env.gain);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.trackBus!);
      osc.start(now);
      lfo.start(now);
      this.sustainedNodes.push(osc, lfo);
    });

    if (scifi) {
      const arp = [440, 554.37, 659.25, 880, 659.25, 554.37];
      this.runSequencer(0.25, (t, i) => {
        if (i % 16 < 6) this.note({ time: t, freq: arp[i % 6], dur: 0.5, peak: 0.07, type: 'square', attack: 0.005, cutoff: 1800, pan: Math.sin(i) * 0.6 });
      });
    } else {
      // Campanillas lejanas de vez en cuando
      const bells = [523.25, 659.25, 783.99, 587.33];
      this.runSequencer(2.4, (t, i) => {
        if (i % 2 === 0) this.note({ time: t, freq: bells[(i / 2) % bells.length], dur: 3.5, peak: 0.06, type: 'sine', attack: 0.01, cutoff: 3000, pan: i % 4 === 0 ? -0.4 : 0.4 });
      });
    }
  }

  /**
   * Auto-Ducking: Baja suavemente el volumen de fondo cuando los locutores están hablando,
   * y lo restaura cuando hay pausas o música de intro/outro.
   */
  public duckAudio(ducked: boolean) {
    if (!this.audioCtx || !this.gainNode || !this.isPlaying) return;
    if (this.isDucked === ducked) return;

    this.isDucked = ducked;
    const targetVolume = ducked ? this.duckVolume : this.baseVolume;
    const now = this.audioCtx.currentTime;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setTargetAtTime(targetVolume, now, 0.2); // Transición suave de 200ms
  }

  public setVolume(volume: number) {
    this.baseVolume = Math.max(0.02, Math.min(volume, 0.5));
    this.duckVolume = this.baseVolume * DUCK_RATIO;
    if (this.audioCtx && this.gainNode && this.isPlaying) {
      const target = this.isDucked ? this.duckVolume : this.baseVolume;
      this.gainNode.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.1);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isDucked = false;

    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    this.sustainedNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    });
    this.sustainedNodes = [];

    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      } catch {}
      this.customAudioEl = null;
    }

    if (this.customMediaSource) {
      try {
        this.customMediaSource.disconnect();
      } catch {}
      this.customMediaSource = null;
    }

    // Corta en seco las notas ya programadas por delante del reloj
    if (this.trackBus) {
      try {
        this.trackBus.disconnect();
      } catch {}
      this.trackBus = null;
    }
  }
}

export const bgmService = new AudioBgmService();
