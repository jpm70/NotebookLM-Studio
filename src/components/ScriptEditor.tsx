import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Smile,
  Image as ImageIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Gauge,
  Zap,
  Eye,
  Edit3,
  Mic,
  Sliders,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Music,
  Headphones,
  Layers,
  X,
  Table,
  Terminal,
} from 'lucide-react';
import { DialogueTurn, HostConfig, PodcastScript, SfxPosition, StudioSettings } from '../types';
import { generateSubtitlesFromScript, triggerSrtDownload } from '../services/subtitleService';
import { SfxManager } from './SfxManager';
import { RenderPreviewModal } from './RenderPreviewModal';
import { sfxEngine, getSfxById } from '../services/sfxEngine';
import { EmotionalRhythmTracker, getEmotionMeta, EMOTION_METAS } from './EmotionalRhythmTracker';

interface ScriptEditorProps {
  script: PodcastScript;
  setScript: React.Dispatch<React.SetStateAction<PodcastScript | null>>;
  hostA: HostConfig;
  hostB: HostConfig;
  settings?: StudioSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StudioSettings>>;
}

const EMOTIONS = ['curioso', 'entusiasta', 'analítico', 'sorprendido', 'reflexivo', 'divertido'];

// Ritmos de habla configurables (Palabras Por Minuto)
const SPEECH_RATES = [
  { rate: 125, label: 'Pausado', desc: '125 ppm' },
  { rate: 140, label: 'Estándar', desc: '140 ppm (Podcast)' },
  { rate: 165, label: 'Dinámico', desc: '165 ppm (Rápido)' },
];

/**
 * Conteo exacto de palabras filtrando espacios en blanco
 */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estima la duración de un turno en segundos basándose en palabras por minuto
 * y pausa de respiración/transición natural entre anfitriones (0.5s)
 */
export function estimateTurnDurationSec(text: string, wpm: number = 140): number {
  const words = countWords(text);
  if (words === 0) return 0;
  const speechSec = (words / (wpm / 60));
  const pauseMargin = 0.55;
  return Math.max(1.4, Math.round((speechSec + pauseMargin) * 10) / 10);
}

/**
 * Formatea segundos en formato legible: "X min Y seg" o "X seg"
 */
export function formatAudioDuration(totalSec: number): string {
  const rounded = Math.round(totalSec);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins === 0) return `${secs} seg`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} seg`;
}

/**
 * Formatea a digital MM:SS
 */
export function formatDigitalTime(totalSec: number): string {
  const rounded = Math.round(totalSec);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  setScript,
  hostA,
  hostB,
  settings,
  setSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const [wpm, setWpm] = useState<number>(140);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0);
  const [isQuickReadMode, setIsQuickReadMode] = useState<boolean>(false);
  const [isPlayingTeleprompter, setIsPlayingTeleprompter] = useState<boolean>(false);
  const [teleprompterProgress, setTeleprompterProgress] = useState<number>(0); // 0.0 a 1.0 en turno actual
  const [showSfxSection, setShowSfxSection] = useState<boolean>(false);
  const [sfxModalTurnIndex, setSfxModalTurnIndex] = useState<number | null>(null);
  const [playingTurnSfxIndex, setPlayingTurnSfxIndex] = useState<number | null>(null);
  const [isRenderPreviewOpen, setIsRenderPreviewOpen] = useState<boolean>(false);
  const [renderPreviewTurnIndex, setRenderPreviewTurnIndex] = useState<number>(0);
  const [highlightedEmotion, setHighlightedEmotion] = useState<string | null>(null);

  // Referencias para auto-scroll y animaciones
  const turnElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const teleprompterTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Asegurar que activeTurnIndex esté en rango si cambia la cantidad de turnos
  useEffect(() => {
    if (script && script.turns.length > 0) {
      if (activeTurnIndex >= script.turns.length) {
        setActiveTurnIndex(script.turns.length - 1);
      }
    }
  }, [script?.turns?.length]);

  // Cálculos de estadísticas globales en tiempo real
  const stats = useMemo(() => {
    if (!script || !script.turns) {
      return {
        totalWords: 0,
        totalDurationSec: 0,
        hostAWords: 0,
        hostBWords: 0,
        hostADurationSec: 0,
        hostBDurationSec: 0,
        hostAPercent: 50,
        hostBPercent: 50,
        avgWordsPerTurn: 0,
      };
    }

    let totalWords = 0;
    let totalDurationSec = 0;
    let hostAWords = 0;
    let hostBWords = 0;
    let hostADurationSec = 0;
    let hostBDurationSec = 0;

    script.turns.forEach((turn) => {
      const words = countWords(turn.text);
      const duration = estimateTurnDurationSec(turn.text, wpm);
      totalWords += words;
      totalDurationSec += duration;

      if (turn.speaker === 'Host_A') {
        hostAWords += words;
        hostADurationSec += duration;
      } else {
        hostBWords += words;
        hostBDurationSec += duration;
      }
    });

    const hostAPercent = totalWords > 0 ? Math.round((hostAWords / totalWords) * 100) : 50;
    const hostBPercent = 100 - hostAPercent;
    const avgWordsPerTurn = script.turns.length > 0 ? Math.round(totalWords / script.turns.length) : 0;

    return {
      totalWords,
      totalDurationSec,
      hostAWords,
      hostBWords,
      hostADurationSec,
      hostBDurationSec,
      hostAPercent,
      hostBPercent,
      avgWordsPerTurn,
    };
  }, [script, wpm]);

  // Cantidad de turnos con efectos de sonido asignados
  const sfxCount = useMemo(() => {
    return script?.turns?.filter((t) => !!t.sfx).length || 0;
  }, [script?.turns]);

  // Manejo del teleprompter en modo Lectura Rápida
  useEffect(() => {
    if (!isQuickReadMode || !isPlayingTeleprompter || !script || script.turns.length === 0) {
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
        teleprompterTimerRef.current = null;
      }
      return;
    }

    const currentTurn = script.turns[activeTurnIndex];
    const durationSec = estimateTurnDurationSec(currentTurn ? currentTurn.text : '', wpm);
    const tickIntervalMs = 80;
    let elapsedMs = 0;
    const totalMs = durationSec * 1000;

    setTeleprompterProgress(0);

    teleprompterTimerRef.current = setInterval(() => {
      elapsedMs += tickIntervalMs;
      const progress = Math.min(1, elapsedMs / totalMs);
      setTeleprompterProgress(progress);

      if (elapsedMs >= totalMs) {
        // Turno completado, pasar al siguiente
        setTeleprompterProgress(0);
        setActiveTurnIndex((prev) => {
          if (prev < script.turns.length - 1) {
            return prev + 1;
          } else {
            // Fin del guion
            setIsPlayingTeleprompter(false);
            return prev;
          }
        });
      }
    }, tickIntervalMs);

    return () => {
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
      }
    };
  }, [isQuickReadMode, isPlayingTeleprompter, activeTurnIndex, script?.turns, wpm]);

  // Atajos de teclado en modo Lectura Rápida
  useEffect(() => {
    if (!isQuickReadMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está editando un textarea o input
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlayingTeleprompter((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (script && activeTurnIndex < script.turns.length - 1) {
          setActiveTurnIndex((prev) => prev + 1);
          setTeleprompterProgress(0);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeTurnIndex > 0) {
          setActiveTurnIndex((prev) => prev - 1);
          setTeleprompterProgress(0);
        }
      } else if (e.key === 'Escape') {
        setIsQuickReadMode(false);
        setIsPlayingTeleprompter(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickReadMode, activeTurnIndex, script?.turns?.length]);

  const updateTurn = (index: number, updatedFields: Partial<DialogueTurn>) => {
    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = [...prev.turns];
      newTurns[index] = { ...newTurns[index], ...updatedFields };
      return { ...prev, turns: newTurns };
    });
  };

  const removeTurn = (index: number) => {
    setScript((prev) => {
      if (!prev || prev.turns.length <= 2) return prev;
      const newTurns = prev.turns.filter((_, i) => i !== index);
      return { ...prev, turns: newTurns };
    });
    if (activeTurnIndex >= index && activeTurnIndex > 0) {
      setActiveTurnIndex((prev) => prev - 1);
    }
  };

  const addTurn = (afterIndex: number) => {
    setScript((prev) => {
      if (!prev) return prev;
      const current = prev.turns[afterIndex];
      const nextSpeaker = current.speaker === 'Host_A' ? 'Host_B' : 'Host_A';
      const newTurn: DialogueTurn = {
        speaker: nextSpeaker,
        emotion: 'curioso',
        text: '¡Totalmente de acuerdo! Y eso me lleva a preguntarme cómo se resolverá este desafío a largo plazo...',
        visual_title: 'Perspectivas de futuro',
        visual_prompt: 'Futuristic concept illustration with neon atmospheric lighting',
      };
      const newTurns = [...prev.turns];
      newTurns.splice(afterIndex + 1, 0, newTurn);
      return { ...prev, turns: newTurns };
    });
    setActiveTurnIndex(afterIndex + 1);
  };

  const copyScriptText = () => {
    let text = `# ${script.episode_title}\n\n${script.episode_summary}\n\n`;
    script.turns.forEach((t, i) => {
      const name = t.speaker === 'Host_A' ? hostA.name : hostB.name;
      text += `[Turno ${i + 1}] ${name} (${t.speaker}) [${t.emotion}]:\n"${t.text}"\n(Visual: ${t.visual_title})\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(script, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `script_${script.episode_title.replace(/\s+/g, '_')}.json`);
    dlAnchorElem.click();
  };

  const scrollToTurn = (index: number) => {
    setActiveTurnIndex(index);
    const element = turnElementsRef.current[index];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const activeTurn = script.turns[activeTurnIndex] || script.turns[0];
  const activeTurnWords = activeTurn ? countWords(activeTurn.text) : 0;
  const activeTurnDuration = activeTurn ? estimateTurnDurationSec(activeTurn.text, wpm) : 0;
  const isHostAActive = activeTurn?.speaker === 'Host_A';
  const activeSpeakerName = isHostAActive ? hostA.name : hostB.name;

  return (
    <div className="space-y-6">
      {/* Episode Metadata Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
              Episodio de YouTube Generado
            </span>
            <input
              type="text"
              value={script.episode_title}
              onChange={(e) => setScript((prev) => (prev ? { ...prev, episode_title: e.target.value } : prev))}
              className="w-full text-lg md:text-xl font-extrabold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón Modo Lectura Rápida */}
            <button
              onClick={() => {
                setIsQuickReadMode(!isQuickReadMode);
                setIsPlayingTeleprompter(false);
                setTeleprompterProgress(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                isQuickReadMode
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-400/20'
                  : 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {isQuickReadMode ? <Edit3 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
              {isQuickReadMode ? 'Volver al Editor' : 'Modo Lectura Rápida'}
            </button>

            {/* Botón Sección Efectos de Sonido (SFX) */}
            <button
              type="button"
              onClick={() => setShowSfxSection(!showSfxSection)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                showSfxSection
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-indigo-600/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Efectos de Sonido (SFX)</span>
              {sfxCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-400 text-slate-950 text-[10px] font-black">
                  {sfxCount}
                </span>
              )}
            </button>

            {/* Botón Vista Previa de Renderizado */}
            <button
              type="button"
              onClick={() => {
                setRenderPreviewTurnIndex(activeTurnIndex);
                setIsRenderPreviewOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-500/50 hover:border-purple-400"
              title="Ver cómo se combinan las imágenes generadas con los títulos en los turnos del guion"
            >
              <Eye className="w-3.5 h-3.5 text-purple-300" />
              <span>Vista Previa de Renderizado</span>
            </button>

            <button
              onClick={copyScriptText}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar Texto'}
            </button>
            <button
              onClick={downloadJson}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={() => {
                const subs = generateSubtitlesFromScript(script.turns, hostA, hostB, 0, 0.3);
                triggerSrtDownload(subs, script.episode_title);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              SRT
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Resumen del episodio:</label>
          <textarea
            value={script.episode_summary}
            onChange={(e) => setScript((prev) => (prev ? { ...prev, episode_summary: e.target.value } : prev))}
            rows={2}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      {/* DASHBOARD: Conteo de Palabras, Tiempo Total Estimado de Audio y Balance */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Métricas Principales */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            {/* Tiempo Estimado Total */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Tiempo Total de Audio</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {formatAudioDuration(stats.totalDurationSec)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({formatDigitalTime(stats.totalDurationSec)})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                A {wpm} ppm con pausas naturales
              </p>
            </div>

            {/* Total de Palabras */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Palabras Totales</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalWords.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">palabras</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ~{stats.avgWordsPerTurn} palabras por turno ({script.turns.length} turnos)
              </p>
            </div>

            {/* Turno en Foco / Editándose */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Turno en Edición
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  #{activeTurnIndex + 1} de {script.turns.length}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-white truncate">
                  {activeSpeakerName}
                </span>
                <span className="text-xs text-amber-300 font-mono">
                  ~{activeTurnDuration}s
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {activeTurnWords} palabras en este turno
              </p>
            </div>
          </div>

          {/* Selector de Cadencia de Lectura (WPM) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 shrink-0 flex flex-col justify-between">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Ritmo de Locución:
            </label>
            <div className="flex items-center gap-1">
              {SPEECH_RATES.map((rateItem) => (
                <button
                  key={rateItem.rate}
                  onClick={() => setWpm(rateItem.rate)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    wpm === rateItem.rate
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                  title={`${rateItem.label} (${rateItem.desc})`}
                >
                  {rateItem.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {wpm} palabras / minuto
            </span>
          </div>
        </div>

        {/* Barra de Equilibrio de Conversación (Host A vs Host B) */}
        <div className="pt-2 border-t border-slate-800/70">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              {hostA.name}: {stats.hostAWords} palabras (~{formatAudioDuration(stats.hostADurationSec)}) · {stats.hostAPercent}%
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              {stats.hostBPercent}% · {stats.hostBWords} palabras (~{formatAudioDuration(stats.hostBDurationSec)})
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {hostB.name}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${stats.hostAPercent}%` }}
              title={`${hostA.name}: ${stats.hostAPercent}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${stats.hostBPercent}%` }}
              title={`${hostB.name}: ${stats.hostBPercent}%`}
            />
          </div>
        </div>
      </div>

      {/* RITMO EMOCIONAL DEL EPISODIO: Visualización de sentimiento por turno con timeline interactiva */}
      <EmotionalRhythmTracker
        turns={script.turns}
        activeTurnIndex={activeTurnIndex}
        onSelectTurn={(idx) => {
          setActiveTurnIndex(idx);
          turnElementsRef.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        hostA={hostA}
        hostB={hostB}
        highlightedEmotion={highlightedEmotion}
        setHighlightedEmotion={setHighlightedEmotion}
      />

      {/* SECCIÓN EXPANDIBLE DE EFECTOS DE SONIDO (SFX) */}
      {showSfxSection && (
        <div className="mb-6">
          <SfxManager
            script={script}
            setScript={setScript}
            activeTurnIndex={activeTurnIndex}
            setActiveTurnIndex={setActiveTurnIndex}
            onCloseModal={() => setShowSfxSection(false)}
          />
        </div>
      )}

      {/* VISTA 1: MODO LECTURA RÁPIDA / TELEPROMPTER */}
      {isQuickReadMode ? (
        <div className="p-6 rounded-2xl bg-slate-900/95 border-2 border-amber-500/60 shadow-2xl space-y-6">
          {/* Teleprompter Top Controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                TURNO {activeTurnIndex + 1} DE {script.turns.length}
              </span>
              <span className="text-xs text-slate-400">
                Progreso:{' '}
                <strong className="text-white font-mono">
                  {Math.round(((activeTurnIndex + 1) / script.turns.length) * 100)}%
                </strong>
              </span>
            </div>

            {/* Reproductor de Lectura / Teleprompter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeTurnIndex > 0) {
                    setActiveTurnIndex((prev) => prev - 1);
                    setTeleprompterProgress(0);
                  }
                }}
                disabled={activeTurnIndex === 0}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-all"
                title="Turno anterior (Flecha Izq)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlayingTeleprompter(!isPlayingTeleprompter)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                  isPlayingTeleprompter
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
                title="Reproducir avance automático (Espacio)"
              >
                {isPlayingTeleprompter ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pausar Lectura
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Lectura Auto
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTurnIndex < script.turns.length - 1) {
                    setActiveTurnIndex((prev) => prev + 1);
                    setTeleprompterProgress(0);
                  }
                }}
                disabled={activeTurnIndex >= script.turns.length - 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-all"
                title="Siguiente turno (Flecha Der)"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTurnIndex(0);
                  setTeleprompterProgress(0);
                  setIsPlayingTeleprompter(false);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                title="Reiniciar al primer turno"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de progreso de lectura del turno activo */}
          {isPlayingTeleprompter && (
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-100 ease-linear"
                style={{ width: `${Math.round(teleprompterProgress * 100)}%` }}
              />
            </div>
          )}

          {/* Tarjeta Gigante de Lectura Rápida para el Turno Activo */}
          <div
            className={`p-6 md:p-8 rounded-2xl border-2 transition-all relative ${
              isHostAActive
                ? 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border-blue-500 shadow-xl shadow-blue-500/10'
                : 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500 shadow-xl shadow-amber-500/10'
            }`}
          >
            {/* Header del Locutor Activo */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${
                    isHostAActive ? 'bg-blue-600' : 'bg-amber-600'
                  }`}
                >
                  {isHostAActive ? 'A' : 'B'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg md:text-xl font-black text-white">
                      {activeSpeakerName}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 border shadow-sm ${getEmotionMeta(activeTurn.emotion).badgeClass}`}
                      style={{ borderColor: getEmotionMeta(activeTurn.emotion).hex }}
                      title={`Sentimiento detectado: ${getEmotionMeta(activeTurn.emotion).label} - ${getEmotionMeta(activeTurn.emotion).description}`}
                    >
                      <span>{getEmotionMeta(activeTurn.emotion).icon}</span>
                      <span>{getEmotionMeta(activeTurn.emotion).label}</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Locutor de {activeTurn.speaker === 'Host_A' ? 'Apertura' : 'Réplica'}
                  </span>
                </div>
              </div>

              {/* Indicadores en tiempo real del turno */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-amber-300 font-mono font-semibold">
                  {activeTurnWords} palabras
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-emerald-300 font-mono font-semibold">
                  ~{activeTurnDuration} seg de habla
                </span>
              </div>
            </div>

            {/* SFX activo en modo Lectura Rápida */}
            {activeTurn.sfx && (
              <div className="mb-4 p-3.5 rounded-xl bg-purple-950/70 border border-purple-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{activeTurn.sfx.icon || '🎵'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-200 text-sm">
                        Efecto de Sonido: {activeTurn.sfx.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50">
                        {activeTurn.sfx.position === 'before'
                          ? '⚡ Al inicio (Intro)'
                          : activeTurn.sfx.position === 'overlay'
                          ? '🌊 Superpuesto (Fondo)'
                          : '🏁 Al final (Cierre)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      {activeTurn.sfx.description || 'Efecto acústico asociado a este turno.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => sfxEngine.play(activeTurn.sfx!.effectId, activeTurn.sfx!.volume)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Probar sonido</span>
                </button>
              </div>
            )}

            {/* Texto de Lectura en Grande y Editable en Tiempo Real */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Texto del diálogo (puedes editarlo en vivo si encuentras un error al leer):
              </label>
              <textarea
                value={activeTurn.text}
                onChange={(e) => updateTurn(activeTurnIndex, { text: e.target.value })}
                rows={4}
                className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-amber-400/80 focus:border-amber-400 rounded-xl p-4 text-base md:text-xl font-medium text-slate-100 placeholder-slate-600 leading-relaxed resize-none focus:outline-none transition-colors"
                placeholder="Diálogo del turno..."
              />
            </div>

            {/* Datos visuales asociados */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-amber-400 uppercase shrink-0">Diapositiva:</span>
                <span className="text-slate-200 font-medium truncate">{activeTurn.visual_title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-400 text-[11px] font-mono truncate max-w-xs hidden sm:inline">
                  Prompt: {activeTurn.visual_prompt}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRenderPreviewTurnIndex(activeTurnIndex);
                    setIsRenderPreviewOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900/70 text-purple-200 border border-purple-500/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  title="Ver cómo se combina la imagen con el título en este turno"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ver render</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tira inferior de navegación rápida entre turnos */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Navegar a cualquier turno del episodio:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              {script.turns.map((t, idx) => {
                const isSelected = idx === activeTurnIndex;
                const isA = t.speaker === 'Host_A';
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTurnIndex(idx);
                      setTeleprompterProgress(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-105 shadow-md'
                        : isA
                        ? 'bg-blue-950/40 text-blue-300 border border-blue-900/50 hover:bg-blue-900/40'
                        : 'bg-amber-950/40 text-amber-300 border border-amber-900/50 hover:bg-amber-900/40'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: getEmotionMeta(t.emotion).hex }}
                      title={`Sentimiento: ${getEmotionMeta(t.emotion).label}`}
                    />
                    <span>#{idx + 1}</span>
                    {t.sfx && (
                      <span className="text-[10px]" title={`Efecto de sonido: ${t.sfx.name}`}>
                        {t.sfx.icon || '🎵'}
                      </span>
                    )}
                    <span className="text-[10px] opacity-75 font-sans">
                      {isA ? hostA.name.slice(0, 4) : hostB.name.slice(0, 4)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            Consejo: Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Espacio</kbd> para reproducir/pausar la lectura automática, o las flechas <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">→</kbd> para saltar entre turnos.
          </div>
        </div>
      ) : (
        /* VISTA 2: LISTA DE EDICIÓN ESTÁNDAR CON RESALTADO EN TIEMPO REAL */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Turnos de diálogo ({script.turns.length} turnos)
            </h3>
            <span className="text-xs text-slate-400">
              Haz clic en cualquier turno para seleccionarlo; se resalta en tiempo real
            </span>
          </div>

          {script.turns.map((turn, index) => {
            const isHostA = turn.speaker === 'Host_A';
            const speakerName = isHostA ? hostA.name : hostB.name;
            const isTurnActive = index === activeTurnIndex;
            const turnWords = countWords(turn.text);
            const turnDuration = estimateTurnDurationSec(turn.text, wpm);
            const emoMeta = getEmotionMeta(turn.emotion);
            const isEmotionMatch =
              !highlightedEmotion ||
              turn.emotion?.toLowerCase() === highlightedEmotion.toLowerCase();

            return (
              <div
                key={index}
                ref={(el) => {
                  turnElementsRef.current[index] = el;
                }}
                onClick={() => setActiveTurnIndex(index)}
                style={{
                  borderLeftColor: emoMeta.hex,
                  borderLeftWidth: '5px',
                }}
                className={`p-4 md:p-5 rounded-2xl border transition-all relative ${
                  !isEmotionMatch
                    ? 'opacity-35 hover:opacity-85'
                    : isTurnActive
                    ? isHostA
                      ? 'bg-blue-950/40 border-blue-400 ring-2 ring-blue-400/80 shadow-xl shadow-blue-500/10'
                      : 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/80 shadow-xl shadow-amber-500/10'
                    : isHostA
                    ? 'bg-blue-950/15 border-blue-900/30 hover:border-blue-700/50'
                    : 'bg-amber-950/15 border-amber-900/30 hover:border-amber-700/50'
                }`}
              >
                {/* Badge flotante de turno activo en edición */}
                {isTurnActive && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                    ✍️ Editando ahora
                  </div>
                )}

                {/* Turn Header */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all ${
                        isTurnActive
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* Speaker toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTurn(index, { speaker: isHostA ? 'Host_B' : 'Host_A' });
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        isHostA
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                    >
                      👤 {speakerName} ({turn.speaker})
                    </button>

                    {/* Emotion Selector with Emotion Badge Styling */}
                    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={turn.emotion}
                        onChange={(e) => updateTurn(index, { emotion: e.target.value })}
                        className={`appearance-none text-xs font-bold rounded-xl pl-2.5 pr-6 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-1 ${emoMeta.badgeClass}`}
                        style={{ borderColor: emoMeta.hex }}
                        title={`Sentimiento detectado: ${emoMeta.label} - ${emoMeta.description}`}
                      >
                        {EMOTIONS.map((emo) => {
                          const m = getEmotionMeta(emo);
                          return (
                            <option key={emo} value={emo} className="bg-slate-900 text-slate-100 font-sans">
                              {m.icon} {m.label}
                            </option>
                          );
                        })}
                      </select>
                      <span className="absolute right-2 pointer-events-none text-[8px] opacity-75">
                        ▼
                      </span>
                    </div>

                    {/* Conteo de palabras y tiempo estimado en tiempo real para este turno */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono ml-1">
                      <span className="text-slate-300">{turnWords} palabras</span>
                      <span>·</span>
                      <span className="text-amber-400 font-semibold">~{turnDuration}s</span>
                    </div>
                  </div>

                  {/* Turn Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => addTurn(index)}
                      title="Insertar turno a continuación"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTurn(index)}
                      title="Eliminar este turno"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SFX asignado a este turno */}
                {turn.sfx ? (
                  <div
                    className="mb-3 px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{turn.sfx.icon || '🎵'}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-purple-200">{turn.sfx.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-900/60 text-purple-300 border border-purple-700/50">
                          {turn.sfx.position === 'before'
                            ? '⚡ Al inicio'
                            : turn.sfx.position === 'overlay'
                            ? '🌊 Superpuesto'
                            : '🏁 Al final'}
                        </span>
                        <span className="text-[10px] text-purple-400 font-mono">
                          Vol: {Math.round(turn.sfx.volume * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Botón escuchar SFX */}
                      <button
                        type="button"
                        onClick={() => {
                          if (playingTurnSfxIndex === index) {
                            sfxEngine.stopAll();
                            setPlayingTurnSfxIndex(null);
                          } else {
                            setPlayingTurnSfxIndex(index);
                            sfxEngine.play(turn.sfx!.effectId, turn.sfx!.volume);
                            setTimeout(() => {
                              setPlayingTurnSfxIndex((prev) => (prev === index ? null : prev));
                            }, 3000);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-900/70 hover:bg-purple-800 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Probar efecto de sonido en este turno"
                      >
                        {playingTurnSfxIndex === index ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-purple-300 animate-ping" />
                            <span>Detener</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Probar</span>
                          </>
                        )}
                      </button>

                      {/* Selector rápido de posición */}
                      <select
                        value={turn.sfx.position}
                        onChange={(e) => {
                          const newPos = e.target.value as SfxPosition;
                          updateTurn(index, {
                            sfx: { ...turn.sfx!, position: newPos },
                          });
                        }}
                        className="bg-purple-950 border border-purple-800 text-purple-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                        title="Momento en que sonará el efecto"
                      >
                        <option value="before">Al inicio (Intro)</option>
                        <option value="overlay">Superpuesto (Fondo)</option>
                        <option value="after">Al final (Cierre)</option>
                      </select>

                      {/* Cambiar SFX */}
                      <button
                        type="button"
                        onClick={() => setSfxModalTurnIndex(index)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 text-xs transition-colors"
                        title="Cambiar a otro efecto de la librería"
                      >
                        Cambiar
                      </button>

                      {/* Quitar SFX */}
                      <button
                        type="button"
                        onClick={() => updateTurn(index, { sfx: undefined })}
                        className="p-1 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Quitar efecto de sonido"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSfxModalTurnIndex(index)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-purple-300 bg-slate-900/50 hover:bg-purple-950/40 border border-slate-800/80 hover:border-purple-600/40 transition-all"
                      title="Añadir efecto de sonido (transición, énfasis o ambiente) a este turno"
                    >
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span>+ Añadir SFX</span>
                    </button>
                  </div>
                )}

                {/* Diapositiva Especializada: Tabla, Terminal o Contexto Anime */}
                {(turn.slideType === 'table' || turn.tableData) && (
                  <div className="mb-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between text-blue-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Table className="w-3.5 h-3.5 text-blue-400" />
                        Diapositiva Tabla: {turn.sectionTitle || turn.visual_title}
                      </span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                        {turn.tableData?.rows?.length || 0} filas × {turn.tableData?.headers?.length || 0} columnas
                      </span>
                    </div>
                    {turn.tableData && (
                      <div className="overflow-x-auto rounded border border-blue-900/60 text-[11px]">
                        <table className="w-full text-left">
                          <thead className="bg-blue-900/40 text-white font-semibold">
                            <tr>
                              {turn.tableData.headers.map((h, i) => (
                                <th key={i} className="p-1.5 border-b border-blue-800">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-900/40 text-slate-300">
                            {turn.tableData.rows.slice(0, 3).map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1.5 font-mono text-[10px]">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {(turn.slideType === 'terminal' || turn.terminalData) && (
                  <div className="mb-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Diapositiva Terminal: {turn.sectionTitle || turn.visual_title}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded">
                        Consola Linux bash
                      </span>
                    </div>
                    {turn.terminalData && (
                      <div className="p-2.5 rounded bg-black/80 font-mono text-[11px] text-emerald-400 space-y-1 border border-emerald-900/50">
                        <div className="text-white font-bold">$ {turn.terminalData.command}</div>
                        {turn.terminalData.lines.slice(1, 4).map((l, i) => (
                          <div key={i} className="text-slate-400 text-[10px] truncate">{l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(turn.slideType === 'context_anime' || (!turn.tableData && !turn.terminalData && turn.relevantText)) && (
                  <div className="mb-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between text-purple-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">🎌</span>
                        Diapositiva Contexto Anime: {turn.sectionTitle || turn.visual_title}
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded">
                        Ilustración IA + Texto
                      </span>
                    </div>
                    {turn.relevantText && (
                      <div className="p-2 rounded bg-purple-950/40 text-slate-200 text-[11px] whitespace-pre-line leading-relaxed font-sans border border-purple-900/40">
                        {turn.relevantText}
                      </div>
                    )}
                  </div>
                )}

                {/* Dialogue Text */}
                <div className="mb-3">
                  <textarea
                    value={turn.text}
                    onFocus={() => setActiveTurnIndex(index)}
                    onChange={(e) => updateTurn(index, { text: e.target.value })}
                    rows={3}
                    className={`w-full bg-slate-950/80 border rounded-xl p-3 text-xs md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none font-sans leading-relaxed resize-none transition-all ${
                      isTurnActive
                        ? 'border-amber-500/80 ring-1 ring-amber-500/40'
                        : 'border-slate-800 focus:border-amber-500'
                    }`}
                    placeholder="Diálogo del anfitrión..."
                  />
                </div>

                {/* Visual Title, Visual Prompt and Render Preview */}
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-indigo-400" />
                      <span>Composición Visual del Turno</span>
                      {settings?.branding?.turnBackgroundImages?.[index] && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-medium">
                          ✓ Con imagen
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRenderPreviewTurnIndex(index);
                        setIsRenderPreviewOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900/70 text-purple-200 border border-purple-500/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Ver cómo se combinaría la imagen generada con el título en este turno"
                    >
                      <Eye className="w-3 h-3 text-purple-300" />
                      <span>Vista previa de render</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Título en pantalla (Visual Title):
                      </label>
                      <input
                        type="text"
                        value={turn.visual_title}
                        onFocus={() => setActiveTurnIndex(index)}
                        onChange={(e) => updateTurn(index, { visual_title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                        placeholder="Título breve para la pantalla"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-indigo-400" />
                        Prompt visual de apoyo (en inglés):
                      </label>
                      <input
                        type="text"
                        value={turn.visual_prompt}
                        onFocus={() => setActiveTurnIndex(index)}
                        onChange={(e) => updateTurn(index, { visual_prompt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="Cinematic concept art prompt..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para asignar SFX a un turno específico */}
      {sfxModalTurnIndex !== null && (
        <SfxManager
          script={script}
          setScript={setScript}
          activeTurnIndex={activeTurnIndex}
          setActiveTurnIndex={setActiveTurnIndex}
          targetTurnForModal={sfxModalTurnIndex}
          isModal={true}
          onCloseModal={() => setSfxModalTurnIndex(null)}
        />
      )}

      {/* Modal de Vista Previa de Renderizado de Turno (Imágenes + Títulos) */}
      {isRenderPreviewOpen && (
        <RenderPreviewModal
          script={script}
          setScript={setScript}
          hostA={hostA}
          hostB={hostB}
          initialTurnIndex={renderPreviewTurnIndex}
          settings={settings}
          setSettings={setSettings}
          onClose={() => setIsRenderPreviewOpen(false)}
        />
      )}
    </div>
  );
};
