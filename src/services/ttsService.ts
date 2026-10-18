import { DialogueTurn, HostConfig } from '../types';
import { getStoredApiKey } from './apiKeyStorage';
import { sfxEngine } from './sfxEngine';

export interface PlaybackState {
  isPlaying: boolean;
  currentTurnIndex: number;
  progressPercent: number;
}

// Mapa de voces oficiales de Gemini TTS Ultra HD
export const GEMINI_NEURAL_VOICES = [
  { id: 'Puck', name: 'Puck (Masculina - Barítono Cálido)', gender: 'male' },
  { id: 'Charon', name: 'Charon (Masculina - Bajo Profundo Radiofónico)', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir (Masculina - Barítono Firme Documental)', gender: 'male' },
  { id: 'Orpheus', name: 'Orpheus (Masculina - Tenor Narrativo Envolvente)', gender: 'male' },
  { id: 'Kore', name: 'Kore (Femenina - Mezzosoprano Conversacional)', gender: 'female' },
  { id: 'Zephyr', name: 'Zephyr (Femenina - Soprano Brillante Ágil)', gender: 'female' },
  { id: 'Aoede', name: 'Aoede (Femenina - Contralto Rica Elegante)', gender: 'female' },
  { id: 'Leda', name: 'Leda (Femenina - Soprano Suave Intimista)', gender: 'female' },
] as const;

class AudioTTSService {
  private browserVoices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isCancelled = false;
  private audioCache = new Map<string, string>(); // clave -> dataUrl audio/wav
  private keepAliveInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.browserVoices = window.speechSynthesis.getVoices();
      this.isLoaded = this.browserVoices.length > 0;
    }
  }

  public getAvailableBrowserVoices(langPrefix: string = 'es'): SpeechSynthesisVoice[] {
    if (!this.browserVoices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.browserVoices = window.speechSynthesis.getVoices();
    }
    const filtered = this.browserVoices.filter((v) =>
      v.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
    );
    return filtered.length > 0 ? filtered : this.browserVoices;
  }

  public findBestBrowserVoice(gender: 'male' | 'female', language: string = 'es', preferredUri?: string): SpeechSynthesisVoice | null {
    const list = this.getAvailableBrowserVoices(language.substring(0, 2));
    if (!list.length) return null;

    if (preferredUri) {
      const match = list.find(
        (v) => v.voiceURI === preferredUri || v.name.toLowerCase().includes(preferredUri.toLowerCase())
      );
      if (match) return match;
    }

    const maleNames = ['male', 'jorge', 'alvaro', 'álvaro', 'diego', 'david', 'manuel', 'carlos', 'raul', 'raúl', 'enrique', 'pablo', 'miguel', 'antonio', 'pedro', 'guy', 'juan', 'guillermo', 'hector'];
    const femaleNames = ['female', 'monica', 'mónica', 'elvira', 'lucia', 'lucía', 'helena', 'dalia', 'aria', 'laura', 'carmen', 'marta', 'sofia', 'sofía', 'paloma', 'sabina', 'paulina', 'zira', 'rosa'];

    if (gender === 'male') {
      const male = list.find((v) => {
        const lower = v.name.toLowerCase();
        return maleNames.some((keyword) => lower.includes(keyword));
      });
      if (male) return male;
    } else {
      const female = list.find((v) => {
        const lower = v.name.toLowerCase();
        return femaleNames.some((keyword) => lower.includes(keyword));
      });
      if (female) return female;
    }

    // Si hay más de una voz disponible y no coincidió por nombre, retornar la segunda para evitar duplicidad
    if (gender === 'female' && list.length > 1) {
      return list[1];
    }

    return list[0] || null;
  }

  /**
   * Sintetiza audio en alta definición usando Gemini Neural TTS (backend /api/tts-synthesize)
   */
  public async synthesizeWithGemini(
    text: string,
    voiceName: string = 'Puck',
    emotion?: string
  ): Promise<string> {
    const cacheKey = `${voiceName}_${emotion || ''}_${text}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    const clientApiKey = getStoredApiKey() || undefined;

    const response = await fetch('/api/tts-synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName,
        emotion,
        clientApiKey,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || `Error HTTP ${response.status} en síntesis neural Gemini`);
    }

    const data = await response.json();
    if (!data.audioBase64) {
      throw new Error('No se recibió la pista de audio de Gemini');
    }

    const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
    this.audioCache.set(cacheKey, audioUrl);
    return audioUrl;
  }

  public stop() {
    this.isCancelled = true;
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    sfxEngine.stopAll();
  }

  /**
   * Previsualiza una voz del catálogo de forma interactiva con parada inmediata
   */
  public async previewVoice(
    sampleText: string,
    geminiVoiceId: string = 'Puck',
    gender: 'male' | 'female' = 'male',
    pitch: number = 1.0,
    speed: number = 1.0,
    preferredEngine: 'gemini' | 'browser' = 'gemini',
    systemVoiceURI?: string
  ): Promise<void> {
    this.stop();
    this.isCancelled = false;

    if (preferredEngine === 'gemini') {
      try {
        const audioUrl = await this.synthesizeWithGemini(sampleText, geminiVoiceId, 'entusiasta');
        if (this.isCancelled) return;

        return new Promise((resolve) => {
          const audio = new Audio(audioUrl);
          audio.playbackRate = speed;
          this.currentAudioElement = audio;

          audio.onended = () => {
            this.currentAudioElement = null;
            resolve();
          };
          audio.onerror = () => {
            this.currentAudioElement = null;
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      } catch (err) {
        console.warn('Fallo síntesis Gemini para preview, usando fallback del navegador:', err);
      }
    }

    // Fallback con Web Speech API
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      this.currentUtterance = utterance;

      const voice = this.findBestBrowserVoice(gender, 'es', systemVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.pitch = pitch;
      utterance.rate = speed;

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = () => {
        this.currentUtterance = null;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Reproduce un turno usando Audio HTML5 (Gemini Neural TTS)
   */
  public async playTurnGemini(
    turn: DialogueTurn,
    hostA: HostConfig,
    hostB: HostConfig
  ): Promise<void> {
    const isHostA = turn.speaker === 'Host_A';
    const host = isHostA ? hostA : hostB;

    // Asignar voz por defecto si no está especificada
    const defaultVoice = host.voiceGender === 'male' ? 'Puck' : 'Kore';
    const voiceName = host.neuralVoice || defaultVoice;

    const audioUrl = await this.synthesizeWithGemini(turn.text, voiceName, turn.emotion);
    if (this.isCancelled) return;

    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.playbackRate = host.voiceSpeed || 1.0;
      this.currentAudioElement = audio;

      audio.onended = () => {
        this.currentAudioElement = null;
        resolve();
      };

      audio.onerror = (e) => {
        console.warn('Error en reproducción HTML5 audio, saltando:', e);
        this.currentAudioElement = null;
        resolve();
      };

      audio.play().catch((err) => {
        console.warn('No se pudo reproducir audio automáticamente:', err);
        resolve();
      });
    });
  }

  public clearCache(): void {
    this.audioCache.clear();
  }

  public getAudioCache(): Map<string, string> {
    return this.audioCache;
  }

  /**
   * Reproduce un turno usando Web Speech API con protección de garbage collection y watchdog
   */
  public async playTurnBrowser(
    turn: DialogueTurn,
    hostA: HostConfig,
    hostB: HostConfig,
    language: string
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setTimeout(resolve, 2000);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(turn.text);
      this.currentUtterance = utterance; // Mantiene referencia viva para evitar recolección de basura en Chrome

      const isHostA = turn.speaker === 'Host_A';
      const host = isHostA ? hostA : hostB;

      const voice = this.findBestBrowserVoice(host.voiceGender, language, host.systemVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }

      // Diferenciación acústica clara de locutor respetando configuración de tono y velocidad
      const defaultPitch = isHostA
        ? (host.voiceGender === 'female' ? 1.05 : 0.82)
        : (host.voiceGender === 'male' ? 0.88 : 1.22);
      const configuredPitch = typeof host.voicePitch === 'number' ? host.voicePitch : defaultPitch;
      const configuredRate = typeof host.voiceSpeed === 'number' ? host.voiceSpeed : 1.0;

      utterance.pitch = configuredPitch;
      utterance.rate = configuredRate;

      // Modulación por emoción
      if (turn.emotion === 'entusiasta' || turn.emotion === 'sorprendido') {
        utterance.pitch = Math.min(2.0, utterance.pitch + 0.12);
        utterance.rate = Math.min(2.0, utterance.rate + 0.06);
      } else if (turn.emotion === 'analítico' || turn.emotion === 'reflexivo') {
        utterance.pitch = Math.max(0.5, utterance.pitch - 0.05);
        utterance.rate = Math.max(0.5, utterance.rate - 0.04);
      }

      // Watchdog de seguridad (máximo 25 segundos por turno si Chrome silencia onend)
      const estimatedWords = turn.text.split(/\s+/).length;
      const maxMs = Math.max(5000, estimatedWords * 600);
      const watchdog = setTimeout(() => {
        this.currentUtterance = null;
        resolve();
      }, maxMs);

      utterance.onend = () => {
        clearTimeout(watchdog);
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        clearTimeout(watchdog);
        console.warn('SpeechSynthesis error:', e);
        this.currentUtterance = null;
        resolve();
      };

      // Iniciar keep-alive en Chromium
      if (!this.keepAliveInterval) {
        this.keepAliveInterval = setInterval(() => {
          if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 8000);
      }

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Reproduce el podcast completo alternando turnos entre Host A y Host B sin bloqueos
   */
  public async playFullPodcast(
    turns: DialogueTurn[],
    hostA: HostConfig,
    hostB: HostConfig,
    language: string,
    pauseSec: number,
    ttsEngine: 'gemini' | 'browser' = 'gemini',
    onTurnChange: (turnIndex: number) => void,
    onComplete: () => void,
    onError?: (errorMsg: string) => void
  ): Promise<void> {
    this.isCancelled = false;

    // Si se eligió Gemini TTS, verificar si hay conectividad con backend
    let activeEngine = ttsEngine;

    for (let i = 0; i < turns.length; i++) {
      if (this.isCancelled) break;
      onTurnChange(i);

      const turn = turns[i];

      // Reproducir SFX antes del turno (Transición) o como ambiente superpuesto
      if (turn.sfx && !this.isCancelled) {
        if (turn.sfx.position === 'before') {
          try {
            await sfxEngine.play(turn.sfx.effectId, turn.sfx.volume);
            await new Promise((r) => setTimeout(r, 120));
          } catch (e) {
            console.warn('Error al reproducir SFX inicial:', e);
          }
        } else if (turn.sfx.position === 'overlay') {
          sfxEngine.play(turn.sfx.effectId, turn.sfx.volume, 5.0).catch(() => {});
        }
      }

      if (this.isCancelled) break;

      try {
        if (activeEngine === 'gemini') {
          try {
            await this.playTurnGemini(turns[i], hostA, hostB);
          } catch (geminiErr: any) {
            console.warn('Fallo Gemini TTS, recurriendo a voz de navegador:', geminiErr);
            if (onError && i === 0) {
              onError(`Aviso: Usando sintetizador del navegador (${geminiErr.message || 'Gemini TTS no disponible'})`);
            }
            activeEngine = 'browser';
            await this.playTurnBrowser(turns[i], hostA, hostB, language);
          }
        } else {
          await this.playTurnBrowser(turns[i], hostA, hostB, language);
        }
      } catch (err: any) {
        console.error('Error al reproducir turno:', err);
      }

      // Reproducir SFX al final del turno (Énfasis)
      if (turn.sfx && turn.sfx.position === 'after' && !this.isCancelled) {
        try {
          await sfxEngine.play(turn.sfx.effectId, turn.sfx.volume);
        } catch (e) {
          console.warn('Error al reproducir SFX final:', e);
        }
      }

      if (this.isCancelled) break;

      // Pausa orgánica entre locutores
      if (i < turns.length - 1) {
        await new Promise((r) => setTimeout(r, Math.max(250, pauseSec * 1000)));
      }
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (!this.isCancelled) {
      onComplete();
    }
  }
}

export const browserTTS = new AudioTTSService();
