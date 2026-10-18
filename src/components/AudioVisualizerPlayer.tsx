import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FastForward,
  CheckCircle,
  Radio,
  Sparkles,
  Globe,
  AlertCircle,
  Loader2,
  Headphones,
  Mic,
} from 'lucide-react';
import { DialogueTurn, HostConfig, PodcastScript } from '../types';
import { browserTTS } from '../services/ttsService';

interface AudioVisualizerPlayerProps {
  script: PodcastScript;
  hostA: HostConfig;
  hostB: HostConfig;
  language: string;
  pauseBetweenSpeakers: number;
  ttsEngine?: 'gemini' | 'browser';
}

export const AudioVisualizerPlayer: React.FC<AudioVisualizerPlayerProps> = ({
  script,
  hostA,
  hostB,
  language,
  pauseBetweenSpeakers,
  ttsEngine = 'gemini',
}) => {
  const [activeEngine, setActiveEngine] = useState<'gemini' | 'browser'>(ttsEngine);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(32).fill(6));
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mantener sincronizado si cambia desde configuración superior
  useEffect(() => {
    setActiveEngine(ttsEngine);
  }, [ttsEngine]);

  // Animar barras de onda reactivas mientras reproduce
  useEffect(() => {
    let t = 0;
    const updateWave = () => {
      if (isPlaying) {
        t += 0.15;
        const newBars = waveformBars.map((_, i) => {
          const val = Math.sin(t + i * 0.4) * Math.cos(t * 0.8 + i * 0.2);
          return Math.max(6, Math.abs(val) * 36 + 8);
        });
        setWaveformBars(newBars);
      } else {
        setWaveformBars(new Array(32).fill(6));
      }
      animationFrameRef.current = requestAnimationFrame(updateWave);
    };

    animationFrameRef.current = requestAnimationFrame(updateWave);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const handlePlayPodcast = async () => {
    if (isPlaying) {
      browserTTS.stop();
      setIsPlaying(false);
      setIsSynthesizing(false);
      return;
    }

    setIsPlaying(true);
    setStatusNotice(null);

    await browserTTS.playFullPodcast(
      script.turns,
      hostA,
      hostB,
      language,
      pauseBetweenSpeakers,
      activeEngine,
      (idx) => {
        setCurrentTurnIndex(idx);
      },
      () => {
        setIsPlaying(false);
        setIsSynthesizing(false);
        setCurrentTurnIndex(0);
      },
      (notice) => {
        setStatusNotice(notice);
      }
    );
  };

  const handleTestSpeaker = async (speaker: 'Host_A' | 'Host_B') => {
    browserTTS.stop();
    setIsPlaying(false);

    const isHostA = speaker === 'Host_A';
    const host = isHostA ? hostA : hostB;
    const sampleText = isHostA
      ? `¡Hola! Soy ${hostA.name}. Esta es una prueba de mi voz como anfitrión principal del podcast.`
      : `¡Totalmente de acuerdo! Soy ${hostB.name}, y aquí comprobarás cómo contrasta mi voz y estilo en el debate.`;

    const sampleTurn: DialogueTurn = {
      speaker,
      emotion: 'entusiasta',
      text: sampleText,
      visual_title: `Prueba de Voz: ${host.name}`,
      visual_prompt: 'Podcast studio test',
    };

    setIsPlaying(true);
    setIsSynthesizing(true);
    try {
      if (activeEngine === 'gemini') {
        try {
          await browserTTS.playTurnGemini(sampleTurn, hostA, hostB);
        } catch {
          await browserTTS.playTurnBrowser(sampleTurn, hostA, hostB, language);
        }
      } else {
        await browserTTS.playTurnBrowser(sampleTurn, hostA, hostB, language);
      }
    } finally {
      setIsPlaying(false);
      setIsSynthesizing(false);
    }
  };

  const handleReset = () => {
    browserTTS.stop();
    setIsPlaying(false);
    setIsSynthesizing(false);
    setCurrentTurnIndex(0);
  };

  const currentTurn = script.turns[currentTurnIndex] || script.turns[0];
  const isHostA = currentTurn.speaker === 'Host_A';
  const activeHost = isHostA ? hostA : hostB;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
      {/* Player Top Info & Engine Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Reproductor Audiovisual NotebookLM
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">{script.episode_title}</h3>
        </div>

        {/* Engine Switcher in Player */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                browserTTS.stop();
                setIsPlaying(false);
                setActiveEngine('gemini');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeEngine === 'gemini'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gemini HD
            </button>
            <button
              onClick={() => {
                browserTTS.stop();
                setIsPlaying(false);
                setActiveEngine('browser');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeEngine === 'browser'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Navegador
            </button>
          </div>

          <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            Turno <strong className="text-amber-400">{currentTurnIndex + 1}</strong> de {script.turns.length}
          </span>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Dual Host Stage with Rich Avatars & Dynamic Speaking Status */}
      <div className="grid grid-cols-2 gap-4 py-3 px-1">
        {/* Host A Avatar Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
            isHostA && isPlaying
              ? 'bg-gradient-to-b from-blue-950/60 to-slate-950 border-blue-500 shadow-xl shadow-blue-500/25 scale-[1.02]'
              : isPlaying
              ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          {/* Top speaking / listening status badge */}
          <div className="mb-2">
            {isHostA && isPlaying ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                En Onda • Hablando
              </span>
            ) : isPlaying ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800">
                <Headphones className="w-2.5 h-2.5 text-blue-400" />
                Escuchando
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-900/60 border border-slate-800/60">
                Locutor Principal
              </span>
            )}
          </div>

          {/* Avatar Container with Active Radar/Glow Rings */}
          <div className="relative mb-3 group">
            {isHostA && isPlaying && (
              <div className="absolute -inset-2 rounded-full bg-blue-500/30 blur-md animate-pulse" />
            )}
            
            <div
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                isHostA && isPlaying
                  ? 'border-blue-400 ring-4 ring-blue-500/50 shadow-lg shadow-blue-500/30 bg-blue-950'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              {hostA.avatarUrl ? (
                <img
                  src={hostA.avatarUrl}
                  alt={hostA.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-2xl text-white">
                  {hostA.avatarIcon || (hostA.name[0] || 'A').toUpperCase()}
                </span>
              )}
            </div>

            {/* Corner Icon Badge */}
            <span
              className={`absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full border-2 border-slate-950 flex items-center justify-center text-xs shadow-md transition-all ${
                isHostA && isPlaying
                  ? 'bg-blue-600 text-white animate-bounce'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {hostA.avatarIcon || '🎙️'}
            </span>
          </div>

          <div className="font-bold text-sm text-white">{hostA.name}</div>
          <div className="text-[11px] text-slate-400 mb-2 truncate max-w-full px-2">{hostA.role}</div>

          {/* Voice indicator badge */}
          <div className="flex flex-col items-center gap-0.5 mb-3 w-full">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/80 text-blue-300 font-semibold truncate max-w-[90%]">
              {activeEngine === 'gemini' ? `Voz: ${hostA.voiceName || hostA.neuralVoice || 'Puck'}` : `Nativo: ${hostA.voiceName || hostA.voiceGender}`}
            </span>
            {hostA.voiceRegister && (
              <span className="text-[9px] text-blue-400/90 font-medium truncate max-w-[90%]">
                {hostA.voiceRegister}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleTestSpeaker('Host_A')}
            disabled={isPlaying}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 px-3 py-1.5 rounded-xl border border-blue-800/50 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Volume2 className="w-3.5 h-3.5" /> Probar Voz {hostA.name}
          </button>
        </div>

        {/* Host B Avatar Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
            !isHostA && isPlaying
              ? 'bg-gradient-to-b from-amber-950/60 to-slate-950 border-amber-500 shadow-xl shadow-amber-500/25 scale-[1.02]'
              : isPlaying
              ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          {/* Top speaking / listening status badge */}
          <div className="mb-2">
            {!isHostA && isPlaying ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                En Onda • Hablando
              </span>
            ) : isPlaying ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800">
                <Headphones className="w-2.5 h-2.5 text-amber-400" />
                Escuchando
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-900/60 border border-slate-800/60">
                Co-Anfitrión
              </span>
            )}
          </div>

          {/* Avatar Container with Active Radar/Glow Rings */}
          <div className="relative mb-3 group">
            {!isHostA && isPlaying && (
              <div className="absolute -inset-2 rounded-full bg-amber-500/30 blur-md animate-pulse" />
            )}
            
            <div
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                !isHostA && isPlaying
                  ? 'border-amber-400 ring-4 ring-amber-500/50 shadow-lg shadow-amber-500/30 bg-amber-950'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              {hostB.avatarUrl ? (
                <img
                  src={hostB.avatarUrl}
                  alt={hostB.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-2xl text-white">
                  {hostB.avatarIcon || (hostB.name[0] || 'B').toUpperCase()}
                </span>
              )}
            </div>

            {/* Corner Icon Badge */}
            <span
              className={`absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full border-2 border-slate-950 flex items-center justify-center text-xs shadow-md transition-all ${
                !isHostA && isPlaying
                  ? 'bg-amber-500 text-slate-950 animate-bounce font-bold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {hostB.avatarIcon || '🎧'}
            </span>
          </div>

          <div className="font-bold text-sm text-white">{hostB.name}</div>
          <div className="text-[11px] text-slate-400 mb-2 truncate max-w-full px-2">{hostB.role}</div>

          {/* Voice indicator badge */}
          <div className="flex flex-col items-center gap-0.5 mb-3 w-full">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/80 text-amber-300 font-semibold truncate max-w-[90%]">
              {activeEngine === 'gemini' ? `Voz: ${hostB.voiceName || hostB.neuralVoice || 'Kore'}` : `Nativo: ${hostB.voiceName || hostB.voiceGender}`}
            </span>
            {hostB.voiceRegister && (
              <span className="text-[9px] text-amber-400/90 font-medium truncate max-w-[90%]">
                {hostB.voiceRegister}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleTestSpeaker('Host_B')}
            disabled={isPlaying}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-800/50 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Volume2 className="w-3.5 h-3.5" /> Probar Voz {hostB.name}
          </button>
        </div>
      </div>

      {/* Waveform Visualizer */}
      <div className="h-16 flex items-center justify-center gap-1.5 px-4 bg-slate-950/90 rounded-2xl border border-slate-800">
        {waveformBars.map((height, i) => (
          <div
            key={i}
            style={{ height: `${height}px` }}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              i % 2 === 0 ? 'bg-amber-400' : 'bg-blue-400'
            }`}
          />
        ))}
      </div>

      {/* Current Turn Subtitle Box */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" />
            {activeHost.name} ({currentTurn.speaker}) • [{currentTurn.emotion}]
          </span>
          <span className="text-xs text-slate-400 font-medium">"{currentTurn.visual_title}"</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed font-sans italic">"{currentTurn.text}"</p>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={handleReset}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Reiniciar reproducción"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handlePlayPodcast}
          className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-slate-950" />
              Pausar Podcast
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-slate-950" />
              {activeEngine === 'gemini' ? 'Reproducir con Voces HD (Gemini)' : 'Reproducir Conversación Completa'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
