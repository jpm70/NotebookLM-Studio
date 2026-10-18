/**
 * Motor Acústico de Efectos de Sonido (SFX Engine)
 * Utiliza Web Audio API nativo para sintetizar transiciones, énfasis y ambientes
 * con latencia cero, sin depender de descargas externas ni sufrir errores CORS.
 */

import { getSharedAudioContext } from './sharedAudio';
import { SfxCategory, SoundEffectItem } from '../types';

export const SFX_CATALOG: SoundEffectItem[] = [
  // --- TRANSICIONES ---
  {
    id: 'swoosh',
    name: 'Swoosh Espacial',
    category: 'transition',
    icon: '⚡',
    description: 'Transición rápida y limpia tipo barrido de aire. Ideal para cambiar de tema o turno.',
    duration: 0.65,
    suggestedVolume: 0.7,
    color: 'from-amber-500 to-orange-600',
    tag: 'Popular',
  },
  {
    id: 'whoosh-cinematic',
    name: 'Whoosh Cinemático',
    category: 'transition',
    icon: '🌪️',
    description: 'Barrido profundo con graves y cola expansiva. Aporta peso dramático a la introducción.',
    duration: 1.1,
    suggestedVolume: 0.75,
    color: 'from-purple-500 to-indigo-600',
    tag: 'Cinemático',
  },
  {
    id: 'chime-transition',
    name: 'Chime Revelación',
    category: 'transition',
    icon: '✨',
    description: 'Arpegio celestial brillante. Perfecto al presentar una solución o dato sorprendente.',
    duration: 1.4,
    suggestedVolume: 0.65,
    color: 'from-cyan-400 to-blue-600',
    tag: 'Brillante',
  },
  {
    id: 'glitch-digital',
    name: 'Glitch Digital',
    category: 'transition',
    icon: '👾',
    description: 'Microinterrupción electrónica tipo corte de señal o actualización de datos.',
    duration: 0.45,
    suggestedVolume: 0.6,
    color: 'from-fuchsia-500 to-rose-600',
    tag: 'Tech',
  },
  {
    id: 'tape-rewind',
    name: 'Tape Rewind',
    category: 'transition',
    icon: '📼',
    description: 'Rebobinado de cinta analógica para hacer pausas, rectificaciones o vueltas al pasado.',
    duration: 0.8,
    suggestedVolume: 0.7,
    color: 'from-amber-600 to-yellow-600',
    tag: 'Retro',
  },
  {
    id: 'page-turn',
    name: 'Paso de Página',
    category: 'transition',
    icon: '📄',
    description: 'Fricción acústica de página o documento. Excelente para capítulos o citas textuales.',
    duration: 0.5,
    suggestedVolume: 0.65,
    color: 'from-emerald-500 to-teal-600',
    tag: 'Editorial',
  },
  {
    id: 'vinyl-scratch',
    name: 'Vinyl Scratch',
    category: 'transition',
    icon: '💿',
    description: 'Frenazo de aguja en vinilo. Ideal para un giro inesperado o desacuerdo cómico.',
    duration: 0.55,
    suggestedVolume: 0.75,
    color: 'from-rose-500 to-pink-600',
    tag: 'Dinámico',
  },

  // --- ÉNFASIS Y PUNTUACIÓN ---
  {
    id: 'ding-bell',
    name: 'Ding Dorado',
    category: 'emphasis',
    icon: '🔔',
    description: 'Campana cristalina de recepción. Enfatiza una conclusión clave o respuesta correcta.',
    duration: 0.9,
    suggestedVolume: 0.7,
    color: 'from-amber-400 to-amber-600',
    tag: 'Puntual',
  },
  {
    id: 'pop-bubble',
    name: 'Pop Burbuja',
    category: 'emphasis',
    icon: '🫧',
    description: 'Chirp suave ascendente muy agradable. Ideal para ideas rápidas, tips o viñetas.',
    duration: 0.18,
    suggestedVolume: 0.8,
    color: 'from-sky-400 to-blue-500',
    tag: 'Sutil',
  },
  {
    id: 'click-mouse',
    name: 'Clic Táctil',
    category: 'emphasis',
    icon: '🖱️',
    description: 'Pulsación nítida con textura mecánica. Da sensación de acción tecnológica.',
    duration: 0.12,
    suggestedVolume: 0.75,
    color: 'from-slate-400 to-slate-600',
    tag: 'Minimal',
  },
  {
    id: 'camera-shutter',
    name: 'Obturador Cámara',
    category: 'emphasis',
    icon: '📸',
    description: 'Doble clic mecánico de obturador reflex. Para momentos de foto fija o análisis.',
    duration: 0.4,
    suggestedVolume: 0.7,
    color: 'from-indigo-400 to-indigo-600',
    tag: 'Visual',
  },
  {
    id: 'tada-fanfare',
    name: 'Tada / Éxito',
    category: 'emphasis',
    icon: '🎉',
    description: 'Acorde ascendente optimista tipo fanfarria de 4 tonos. Para logros y buenas noticias.',
    duration: 1.2,
    suggestedVolume: 0.65,
    color: 'from-emerald-400 to-teal-600',
    tag: 'Positivo',
  },
  {
    id: 'error-buzzer',
    name: 'Buzzer Suave',
    category: 'emphasis',
    icon: '⚠️',
    description: 'Zumbido disonante con tono retro. Excelente para mitos falsos o advertencias.',
    duration: 0.6,
    suggestedVolume: 0.6,
    color: 'from-rose-500 to-red-600',
    tag: 'Alerta',
  },
  {
    id: 'rimshot-drum',
    name: 'Rimshot / Golpe',
    category: 'emphasis',
    icon: '🥁',
    description: 'Golpe seco de caja y aro de batería. Perfecto tras un chiste o comentario irónico.',
    duration: 0.5,
    suggestedVolume: 0.7,
    color: 'from-orange-500 to-amber-600',
    tag: 'Humor',
  },
  {
    id: 'heartbeat',
    name: 'Latido Sub-grave',
    category: 'emphasis',
    icon: '💓',
    description: 'Doble pulsación grave y cálida. Genera tensión, empatía o pausa reflexiva.',
    duration: 0.95,
    suggestedVolume: 0.8,
    color: 'from-red-500 to-rose-700',
    tag: 'Suspenso',
  },

  // --- AMBIENTE DE TURNO ---
  {
    id: 'rain-window',
    name: 'Lluvia en Ventana',
    category: 'ambient',
    icon: '🌧️',
    description: 'Textura acústica de gotas suaves y lluvia relajante. Genera intimidad y sosiego.',
    duration: 4.0,
    suggestedVolume: 0.35,
    color: 'from-blue-500 to-slate-700',
    tag: 'Calma',
  },
  {
    id: 'cafe-murmur',
    name: 'Café & Murmullo',
    category: 'ambient',
    icon: '☕',
    description: 'Ambiente cálido de cafetería con murmullo lejano de fondo y resonancia acogedora.',
    duration: 4.0,
    suggestedVolume: 0.3,
    color: 'from-amber-600 to-stone-700',
    tag: 'Casual',
  },
  {
    id: 'tech-office',
    name: 'Oficina Tech / Tecleo',
    category: 'ambient',
    icon: '💻',
    description: 'Espacio de trabajo moderno con leves pulsaciones de teclado mecánico de fondo.',
    duration: 4.0,
    suggestedVolume: 0.3,
    color: 'from-teal-600 to-cyan-800',
    tag: 'Productivo',
  },
  {
    id: 'cyberpunk-rumble',
    name: 'Cyberpunk Drone',
    category: 'ambient',
    icon: '🌆',
    description: 'Grave futurista resonante con modulación sutil. Ideal para IA, ciencia o tecnología.',
    duration: 4.5,
    suggestedVolume: 0.35,
    color: 'from-purple-600 to-indigo-900',
    tag: 'Futurista',
  },
  {
    id: 'library-silence',
    name: 'Silencio & Vinilo',
    category: 'ambient',
    icon: '📚',
    description: 'Leve crepitar analógico y aire de sala tranquila. Otorga presencia de estudio profesional.',
    duration: 4.0,
    suggestedVolume: 0.25,
    color: 'from-stone-500 to-amber-900',
    tag: 'Estudio',
  },
];

class SfxSynthesizer {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];

  private getContext(): AudioContext {
    const ctx = getSharedAudioContext();
    if (this.ctx !== ctx) {
      this.ctx = ctx;
      this.output = null;
    }
    return ctx;
  }

  /** Bus de salida de todos los efectos: va a los altavoces y, al exportar, también al vídeo. */
  public getOutput(): GainNode {
    const ctx = this.getContext();
    if (!this.output) {
      this.output = ctx.createGain();
      this.output.connect(ctx.destination);
    }
    return this.output;
  }

  /**
   * Detiene de inmediato cualquier sonido o ambiente activo
   */
  public stopAll(): void {
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Ignorar
      }
    });
    this.activeNodes = [];
  }

  /**
   * Genera un buffer de ruido blanco de N segundos
   */
  private createNoiseBuffer(durationSec: number): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Reproduce un efecto por ID con volumen normalizado
   */
  public async play(effectId: string, volume: number = 0.7, loopDuration?: number): Promise<void> {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const safeVolume = Math.max(0.01, Math.min(1.0, volume));

    return new Promise<void>((resolve) => {
      let isStopped = false;
      const onEnded = () => {
        if (!isStopped) {
          isStopped = true;
          resolve();
        }
      };

      switch (effectId) {
        // --- SWOOSH ---
        case 'swoosh': {
          const dur = 0.65;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.setValueAtTime(3.0, now);
          filter.frequency.setValueAtTime(300, now);
          filter.frequency.exponentialRampToValueAtTime(3800, now + 0.25);
          filter.frequency.exponentialRampToValueAtTime(400, now + dur);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.9, now + 0.22);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- WHOOSH CINEMATIC ---
        case 'whoosh-cinematic': {
          const dur = 1.1;
          // Capa 1: Sub bass sweep
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + dur);

          const oscGain = ctx.createGain();
          oscGain.gain.setValueAtTime(0.001, now);
          oscGain.gain.linearRampToValueAtTime(safeVolume * 0.8, now + 0.2);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          // Capa 2: Low-pass noise sweep
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(200, now);
          filter.frequency.exponentialRampToValueAtTime(2200, now + 0.35);
          filter.frequency.exponentialRampToValueAtTime(120, now + dur);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.001, now);
          noiseGain.gain.linearRampToValueAtTime(safeVolume * 0.6, now + 0.3);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(oscGain);
          oscGain.connect(this.getOutput());

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.getOutput());

          osc.start(now);
          noise.start(now);
          osc.stop(now + dur);
          noise.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- CHIME TRANSITION ---
        case 'chime-transition': {
          const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
          const dur = 1.4;

          notes.forEach((freq, idx) => {
            const startT = now + idx * 0.08;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startT);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, startT);
            gain.gain.linearRampToValueAtTime(safeVolume * 0.25, startT + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0005, startT + 0.9);

            osc.connect(gain);
            gain.connect(this.getOutput());

            osc.start(startT);
            osc.stop(startT + 0.9);
          });

          const timer = setTimeout(onEnded, dur * 1000);
          this.activeNodes.push({
            stop: () => {
              clearTimeout(timer);
              onEnded();
            },
          });
          break;
        }

        // --- GLITCH DIGITAL ---
        case 'glitch-digital': {
          const dur = 0.45;
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          const steps = [440, 880, 220, 1760, 550, 2200, 330];
          steps.forEach((freq, i) => {
            osc.frequency.setValueAtTime(freq, now + i * 0.055);
          });

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(safeVolume * 0.35, now);
          gain.gain.setValueAtTime(0.001, now + dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(800, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- TAPE REWIND ---
        case 'tape-rewind': {
          const dur = 0.8;
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(2400, now + dur * 0.8);
          osc.frequency.linearRampToValueAtTime(100, now + dur);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.4, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- PAGE TURN ---
        case 'page-turn': {
          const dur = 0.5;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1600, now);
          filter.Q.setValueAtTime(1.2, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.45, now + 0.08);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.1, now + 0.2);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.35, now + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- VINYL SCRATCH ---
        case 'vinyl-scratch': {
          const dur = 0.55;
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(900, now);
          osc.frequency.linearRampToValueAtTime(250, now + 0.18);
          osc.frequency.linearRampToValueAtTime(750, now + 0.35);
          osc.frequency.exponentialRampToValueAtTime(80, now + dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1100, now);
          filter.Q.setValueAtTime(2.0, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.6, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- DING BELL ---
        case 'ding-bell': {
          const dur = 0.95;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(1760, now); // A6
          osc2.frequency.setValueAtTime(3520, now); // A7

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(safeVolume * 0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.getOutput());

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + dur);
          osc2.stop(now + dur);
          osc1.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc1.stop();
                osc2.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- POP BUBBLE ---
        case 'pop-bubble': {
          const dur = 0.16;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(950, now + 0.09);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(safeVolume * 0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- CLICK MOUSE ---
        case 'click-mouse': {
          const dur = 0.09;
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2400, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(safeVolume * 0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- CAMERA SHUTTER ---
        case 'camera-shutter': {
          const dur = 0.38;
          // Clic 1
          const osc1 = ctx.createOscillator();
          osc1.type = 'square';
          osc1.frequency.setValueAtTime(1800, now);
          const g1 = ctx.createGain();
          g1.gain.setValueAtTime(safeVolume * 0.5, now);
          g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          // Clic 2
          const osc2 = ctx.createOscillator();
          osc2.type = 'square';
          osc2.frequency.setValueAtTime(1200, now + 0.12);
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(safeVolume * 0.6, now + 0.12);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          osc1.connect(g1);
          g1.connect(this.getOutput());
          osc2.connect(g2);
          g2.connect(this.getOutput());

          osc1.start(now);
          osc1.stop(now + 0.05);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.25);

          const timer = setTimeout(onEnded, dur * 1000);
          this.activeNodes.push({
            stop: () => {
              clearTimeout(timer);
              onEnded();
            },
          });
          break;
        }

        // --- TADA FANFARE ---
        case 'tada-fanfare': {
          const dur = 1.25;
          const notes = [
            { f: 523.25, t: 0.0, d: 0.18 }, // C5
            { f: 659.25, t: 0.16, d: 0.18 }, // E5
            { f: 783.99, t: 0.32, d: 0.18 }, // G5
            { f: 1046.5, t: 0.48, d: 0.7 }, // C6
          ];

          notes.forEach((n) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now + n.t);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, now + n.t);
            gain.gain.linearRampToValueAtTime(safeVolume * 0.45, now + n.t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

            osc.connect(gain);
            gain.connect(this.getOutput());

            osc.start(now + n.t);
            osc.stop(now + n.t + n.d);
          });

          const timer = setTimeout(onEnded, dur * 1000);
          this.activeNodes.push({
            stop: () => {
              clearTimeout(timer);
              onEnded();
            },
          });
          break;
        }

        // --- ERROR BUZZER ---
        case 'error-buzzer': {
          const dur = 0.55;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(140, now);
          osc2.frequency.setValueAtTime(148, now); // Disonancia pulsante

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(safeVolume * 0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.getOutput());

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + dur);
          osc2.stop(now + dur);
          osc1.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc1.stop();
                osc2.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- RIMSHOT DRUM ---
        case 'rimshot-drum': {
          const dur = 0.45;
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);

          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(0.2);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1200, now);

          const gOsc = ctx.createGain();
          gOsc.gain.setValueAtTime(safeVolume * 0.7, now);
          gOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          const gNoise = ctx.createGain();
          gNoise.gain.setValueAtTime(safeVolume * 0.5, now);
          gNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gOsc);
          gOsc.connect(this.getOutput());

          noise.connect(filter);
          filter.connect(gNoise);
          gNoise.connect(this.getOutput());

          osc.start(now);
          noise.start(now);
          osc.stop(now + 0.2);
          noise.stop(now + 0.12);

          const timer = setTimeout(onEnded, dur * 1000);
          this.activeNodes.push({
            stop: () => {
              clearTimeout(timer);
              onEnded();
            },
          });
          break;
        }

        // --- HEARTBEAT ---
        case 'heartbeat': {
          const dur = 0.95;
          const playThump = (timeOffset: number, freq: number, gainVal: number) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + timeOffset);
            osc.frequency.exponentialRampToValueAtTime(35, now + timeOffset + 0.2);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, now + timeOffset);
            gain.gain.linearRampToValueAtTime(safeVolume * gainVal, now + timeOffset + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.25);

            osc.connect(gain);
            gain.connect(this.getOutput());

            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.25);
          };

          playThump(0.0, 75, 0.75); // Lub
          playThump(0.26, 60, 0.6); // Dub

          const timer = setTimeout(onEnded, dur * 1000);
          this.activeNodes.push({
            stop: () => {
              clearTimeout(timer);
              onEnded();
            },
          });
          break;
        }

        // --- AMBIENTE: LLUVIA ---
        case 'rain-window': {
          const dur = loopDuration || 4.0;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);
          noise.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.35, now + 0.5);
          gain.gain.setValueAtTime(safeVolume * 0.35, now + dur - 0.5);
          gain.gain.linearRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- AMBIENTE: CAFÉ ---
        case 'cafe-murmur': {
          const dur = loopDuration || 4.0;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);
          noise.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(650, now);
          filter.Q.setValueAtTime(0.8, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.32, now + 0.4);
          gain.gain.setValueAtTime(safeVolume * 0.32, now + dur - 0.4);
          gain.gain.linearRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- AMBIENTE: TECH OFFICE ---
        case 'tech-office': {
          const dur = loopDuration || 4.0;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.28, now + 0.3);
          gain.gain.setValueAtTime(safeVolume * 0.28, now + dur - 0.3);
          gain.gain.linearRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          // Añadir teclas sutiles
          const keystrokes = [0.4, 0.7, 1.2, 1.8, 2.5, 3.1];
          keystrokes.forEach((tOffset) => {
            if (tOffset + 0.1 < dur) {
              const osc = ctx.createOscillator();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(1400 + Math.random() * 400, now + tOffset);
              const gKey = ctx.createGain();
              gKey.gain.setValueAtTime(safeVolume * 0.15, now + tOffset);
              gKey.gain.exponentialRampToValueAtTime(0.001, now + tOffset + 0.05);
              osc.connect(gKey);
              gKey.connect(this.getOutput());
              osc.start(now + tOffset);
              osc.stop(now + tOffset + 0.06);
            }
          });

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- AMBIENTE: CYBERPUNK RUMBLE ---
        case 'cyberpunk-rumble': {
          const dur = loopDuration || 4.5;
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(55, now); // A1

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(160, now);
          filter.frequency.linearRampToValueAtTime(320, now + dur * 0.5);
          filter.frequency.linearRampToValueAtTime(150, now + dur);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.35, now + 0.6);
          gain.gain.setValueAtTime(safeVolume * 0.35, now + dur - 0.6);
          gain.gain.linearRampToValueAtTime(0.001, now + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          osc.start(now);
          osc.stop(now + dur);
          osc.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                osc.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }

        // --- AMBIENTE: LIBRARY SILENCE ---
        case 'library-silence':
        default: {
          const dur = loopDuration || 4.0;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(dur);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1100, now);
          filter.Q.setValueAtTime(0.7, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(safeVolume * 0.22, now + 0.4);
          gain.gain.setValueAtTime(safeVolume * 0.22, now + dur - 0.4);
          gain.gain.linearRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getOutput());

          noise.start(now);
          noise.stop(now + dur);
          noise.onended = onEnded;

          this.activeNodes.push({
            stop: () => {
              try {
                noise.stop();
              } catch {}
              onEnded();
            },
          });
          break;
        }
      }
    });
  }

  // Reproduce micro-reacción orgánica de escucha activa (backchanneling)
  public playBackchannel(reactionType: 'nod' | 'affirmation' | 'chuckle' = 'nod', volume = 0.35) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume * 0.45, now);
    master.connect(this.getOutput());

    if (reactionType === 'chuckle') {
      [220, 240, 210].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        g.gain.setValueAtTime(0.01, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.14);
        osc.connect(g);
        g.connect(master);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.15);
      });
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.4, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  }
}

export const sfxEngine = new SfxSynthesizer();

export function getSfxById(id: string): SoundEffectItem | undefined {
  return SFX_CATALOG.find((item) => item.id === id);
}

export function getSfxByCategory(category: SfxCategory): SoundEffectItem[] {
  return SFX_CATALOG.filter((item) => item.category === category);
}
