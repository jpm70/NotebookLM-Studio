/**
 * Servicio de Audio de Fondo (BGM) y Auto-Ducking Inteligente
 * Genera pistas de música estéreo en tiempo real mediante Web Audio API
 * o reproduce pistas cargadas por el usuario, con ducking suave al hablar.
 */

import { getSharedAudioContext } from './sharedAudio';

export type BgmTrackType = 'lofi' | 'synthwave' | 'acoustic' | 'ambient' | 'scifi' | 'custom' | 'none';

export class AudioBgmService {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentTrack: BgmTrackType = 'none';
  private baseVolume = 0.18;
  private duckVolume = 0.04;
  private isDucked = false;
  private customAudioEl: HTMLAudioElement | null = null;
  private customMediaSource: MediaElementAudioSourceNode | null = null;
  private intervalId: any = null;
  private oscillatorNodes: OscillatorNode[] = [];

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = getSharedAudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.baseVolume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
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

  public start(track: BgmTrackType, volume = 0.18, customDataUrl?: string) {
    this.stop();
    if (track === 'none') return;

    this.initContext();
    if (!this.audioCtx || !this.gainNode) return;

    this.baseVolume = Math.max(0.02, Math.min(volume, 0.5));
    this.duckVolume = this.baseVolume * 0.22;
    this.currentTrack = track;
    this.isPlaying = true;
    this.isDucked = false;

    this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
    this.gainNode.gain.setValueAtTime(this.baseVolume, this.audioCtx.currentTime);

    if (track === 'custom' && customDataUrl) {
      this.playCustomTrack(customDataUrl);
      return;
    }

    // Generar pista sintética rica y libre de derechos con Web Audio
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
      case 'ambient':
      case 'scifi':
      default:
        this.playAmbientTrack();
        break;
    }
  }

  private playCustomTrack(dataUrl: string) {
    if (!this.audioCtx || !this.gainNode) return;
    try {
      this.customAudioEl = new Audio(dataUrl);
      this.customAudioEl.loop = true;
      this.customAudioEl.crossOrigin = 'anonymous';
      this.customMediaSource = this.audioCtx.createMediaElementSource(this.customAudioEl);
      this.customMediaSource.connect(this.gainNode);
      this.customAudioEl.play().catch(() => {});
    } catch (e) {
      console.warn('Error reproduciendo pista personalizada BGM:', e);
    }
  }

  private playLofiTrack() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;
    const chords = [
      [220, 261.63, 329.63, 392],    // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [130.81, 164.81, 196, 246.94], // Cmaj7
      [146.83, 174.61, 220, 261.63], // Dm7
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.isPlaying || !this.gainNode) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        const now = ctx.currentTime;
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.06 / (idx + 1), now + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.gainNode!);

        osc.start(now);
        osc.stop(now + 4);
      });
    };

    playChord();
    this.intervalId = setInterval(playChord, 3800);
  }

  private playSynthwaveTrack() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;
    const bassline = [110, 110, 130.81, 146.83, 98, 98, 110, 123.47];
    let step = 0;

    const tick = () => {
      if (!this.isPlaying || !this.gainNode) return;
      const freq = bassline[step % bassline.length];
      step++;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      const now = ctx.currentTime;
      noteGain.gain.setValueAtTime(0.04, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.gainNode!);

      osc.start(now);
      osc.stop(now + 0.4);
    };

    tick();
    this.intervalId = setInterval(tick, 450);
  }

  private playAcousticTrack() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;
    const notes = [261.63, 329.63, 392, 523.25, 440, 349.23, 293.66, 392];
    let noteIdx = 0;

    const playNote = () => {
      if (!this.isPlaying || !this.gainNode) return;
      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.035, now + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode!);

      osc.start(now);
      osc.stop(now + 1.3);
    };

    playNote();
    this.intervalId = setInterval(playNote, 600);
  }

  private playAmbientTrack() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;
    const droneFreqs = [130.81, 196, 293.66, 392];

    droneFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280 + idx * 40, ctx.currentTime);

      noteGain.gain.setValueAtTime(0.02 / (idx + 1), ctx.currentTime);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.gainNode!);

      osc.start();
      this.oscillatorNodes.push(osc);
    });
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
    this.duckVolume = this.baseVolume * 0.22;
    if (this.audioCtx && this.gainNode && this.isPlaying) {
      const target = this.isDucked ? this.duckVolume : this.baseVolume;
      this.gainNode.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.1);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isDucked = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.oscillatorNodes.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.oscillatorNodes = [];

    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl = null;
      } catch {}
    }

    if (this.customMediaSource) {
      try {
        this.customMediaSource.disconnect();
        this.customMediaSource = null;
      } catch {}
    }
  }
}

export const bgmService = new AudioBgmService();
