import React, { useMemo } from 'react';
import {
  Activity,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Filter,
  X,
} from 'lucide-react';
import { DialogueTurn, HostConfig } from '../types';

export interface EmotionMeta {
  id: string;
  label: string;
  icon: string;
  colorName: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  hex: string;
  glowHex: string;
  description: string;
}

export const EMOTION_METAS: Record<string, EmotionMeta> = {
  entusiasta: {
    id: 'entusiasta',
    label: 'Entusiasta',
    icon: '⚡',
    colorName: 'Ámbar Enérgico',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    hex: '#f59e0b',
    glowHex: 'rgba(245, 158, 11, 0.4)',
    description: 'Dinamismo, pasión y convicción enérgica',
  },
  analítico: {
    id: 'analítico',
    label: 'Analítico',
    icon: '📊',
    colorName: 'Índigo Racional',
    bgClass: 'bg-indigo-500/15',
    borderClass: 'border-indigo-500/50',
    textClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    hex: '#6366f1',
    glowHex: 'rgba(99, 102, 241, 0.4)',
    description: 'Rigor técnico, datos, desglose lógico y profundidad',
  },
  curioso: {
    id: 'curioso',
    label: 'Curioso',
    icon: '🔍',
    colorName: 'Cian Indagador',
    bgClass: 'bg-cyan-500/15',
    borderClass: 'border-cyan-500/50',
    textClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    hex: '#06b6d4',
    glowHex: 'rgba(6, 182, 212, 0.4)',
    description: 'Preguntas estimulantes, exploración y descubrimiento',
  },
  sorprendido: {
    id: 'sorprendido',
    label: 'Sorprendido',
    icon: '😲',
    colorName: 'Rosa Impacto',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/50',
    textClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    hex: '#f43f5e',
    glowHex: 'rgba(244, 63, 94, 0.4)',
    description: 'Giro inesperado, revelación impactante y asombro',
  },
  reflexivo: {
    id: 'reflexivo',
    label: 'Reflexivo',
    icon: '💭',
    colorName: 'Esmeralda Sereno',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    hex: '#10b981',
    glowHex: 'rgba(16, 185, 129, 0.4)',
    description: 'Pausa reflexiva, filosofía, visión global y conclusiones',
  },
  divertido: {
    id: 'divertido',
    label: 'Divertido',
    icon: '😄',
    colorName: 'Fucsia Cómplice',
    bgClass: 'bg-fuchsia-500/15',
    borderClass: 'border-fuchsia-500/50',
    textClass: 'text-fuchsia-400',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    hex: '#d946ef',
    glowHex: 'rgba(217, 70, 239, 0.4)',
    description: 'Complicidad, ironía ligera, humor e ingenio',
  },
};

export const DEFAULT_EMOTION_META: EmotionMeta = {
  id: 'neutro',
  label: 'Neutro',
  icon: '🎙️',
  colorName: 'Gris Neutro',
  bgClass: 'bg-slate-500/15',
  borderClass: 'border-slate-500/50',
  textClass: 'text-slate-400',
  badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  hex: '#64748b',
  glowHex: 'rgba(100, 116, 139, 0.3)',
  description: 'Locución estándar sin carga emocional predominante',
};

export function getEmotionMeta(emotion?: string): EmotionMeta {
  if (!emotion) return DEFAULT_EMOTION_META;
  const key = emotion.toLowerCase().trim();
  return EMOTION_METAS[key] || DEFAULT_EMOTION_META;
}

interface EmotionalRhythmTrackerProps {
  turns: DialogueTurn[];
  activeTurnIndex: number;
  onSelectTurn: (index: number) => void;
  hostA: HostConfig;
  hostB: HostConfig;
  highlightedEmotion: string | null;
  setHighlightedEmotion: (emotion: string | null) => void;
}

export const EmotionalRhythmTracker: React.FC<EmotionalRhythmTrackerProps> = ({
  turns,
  activeTurnIndex,
  onSelectTurn,
  hostA,
  hostB,
  highlightedEmotion,
  setHighlightedEmotion,
}) => {
  // Estadísticas de distribución emocional
  const stats = useMemo(() => {
    if (!turns || turns.length === 0) {
      return {
        counts: {} as Record<string, number>,
        percentages: {} as Record<string, number>,
        total: 0,
        dominantEmotion: 'curioso',
        transitionsCount: 0,
        arcDiagnostic: 'Sin turnos cargados',
      };
    }

    const counts: Record<string, number> = {};
    let transitionsCount = 0;
    let prevEmotion = '';

    turns.forEach((t, i) => {
      const emo = (t.emotion || 'curioso').toLowerCase().trim();
      counts[emo] = (counts[emo] || 0) + 1;
      if (i > 0 && emo !== prevEmotion) {
        transitionsCount++;
      }
      prevEmotion = emo;
    });

    const total = turns.length;
    const percentages: Record<string, number> = {};
    let maxCount = -1;
    let dominantEmotion = 'curioso';

    Object.keys(counts).forEach((key) => {
      const pct = Math.round((counts[key] / total) * 100);
      percentages[key] = pct;
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        dominantEmotion = key;
      }
    });

    // Diagnóstico del ritmo según balance
    let arcDiagnostic = 'Ritmo equilibrado';
    const domPct = percentages[dominantEmotion] || 0;
    const domMeta = getEmotionMeta(dominantEmotion);

    if (domPct >= 50) {
      arcDiagnostic = `Tono muy marcado: predominio ${domMeta.label.toLowerCase()} (${domPct}%).`;
    } else if (transitionsCount >= total * 0.7) {
      arcDiagnostic = 'Ritmo muy dinámico con cambios frecuentes de tono conversacional.';
    } else {
      arcDiagnostic = 'Fluidez balanceada con variedad emocional entre anfitriones.';
    }

    return {
      counts,
      percentages,
      total,
      dominantEmotion,
      transitionsCount,
      arcDiagnostic,
    };
  }, [turns]);

  if (!turns || turns.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4">
      {/* Header con título y diagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 via-indigo-500/20 to-rose-500/20 border border-slate-700 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Ritmo Emocional del Episodio
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-900 border border-slate-700 text-slate-300">
                {turns.length} turnos · {stats.transitionsCount} cambios de tono
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {stats.arcDiagnostic}
            </p>
          </div>
        </div>

        {/* Botón de limpiar filtro si está activo */}
        {highlightedEmotion && (
          <button
            type="button"
            onClick={() => setHighlightedEmotion(null)}
            className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Filter className="w-3 h-3 text-amber-400" />
            <span>Filtrando por: <b>{getEmotionMeta(highlightedEmotion).label}</b></span>
            <X className="w-3 h-3 text-slate-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Visual Timeline Ribbon: Barra secuencial de turnos coloreada por sentimiento */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold">
            <span>Inicio (Apertura)</span>
            <ChevronRight className="w-3 h-3" />
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            Haz clic en un segmento para ir al turno
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <ChevronRight className="w-3 h-3" />
            <span>Cierre (Fin)</span>
          </span>
        </div>

        {/* Cinta cromática de turnos */}
        <div className="h-7 w-full bg-slate-900 rounded-xl p-1 flex gap-1 border border-slate-800 overflow-x-auto shadow-inner">
          {turns.map((turn, idx) => {
            const meta = getEmotionMeta(turn.emotion);
            const isActive = idx === activeTurnIndex;
            const isMatchHighlight =
              !highlightedEmotion ||
              turn.emotion?.toLowerCase() === highlightedEmotion.toLowerCase();
            const speakerName = turn.speaker === 'Host_A' ? hostA.name : hostB.name;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTurn(idx)}
                style={{
                  backgroundColor: meta.hex,
                  boxShadow: isActive ? `0 0 12px ${meta.glowHex}` : undefined,
                }}
                className={`flex-1 min-w-[20px] sm:min-w-[24px] h-full rounded-lg transition-all relative group flex items-center justify-center font-mono text-[10px] font-bold text-slate-950 ${
                  isActive
                    ? 'ring-2 ring-white scale-105 z-10'
                    : isMatchHighlight
                    ? 'opacity-90 hover:opacity-100 hover:scale-105 hover:z-10'
                    : 'opacity-25 hover:opacity-60'
                }`}
                title={`Turno #${idx + 1} (${speakerName}) • ${meta.icon} ${meta.label}: "${turn.text?.slice(0, 60)}..."`}
              >
                {/* Indicador de turno o icono */}
                <span className="truncate px-0.5 pointer-events-none drop-shadow-sm hidden md:inline">
                  {idx + 1}
                </span>

                {/* Marcador animado para el turno activo */}
                {isActive && (
                  <span className="absolute -top-1 w-2 h-2 rounded-full bg-white ring-2 ring-slate-950 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda y Filtro de Sentimientos Detectados con métricas */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-400">
            Distribución de sentimientos en el guion:
          </span>
          <span className="text-[10px] text-slate-500">
            Haz clic en un sentimiento para resaltar sus turnos
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(EMOTION_METAS).map(([emoKey, meta]) => {
            const count = stats.counts[emoKey] || 0;
            const pct = stats.percentages[emoKey] || 0;
            const isSelected = highlightedEmotion === emoKey;

            return (
              <button
                key={emoKey}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setHighlightedEmotion(null);
                  } else {
                    setHighlightedEmotion(emoKey);
                  }
                }}
                className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? `${meta.bgClass} ${meta.borderClass} ring-2 ${meta.borderClass} shadow-md`
                    : count > 0
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    : 'bg-slate-950/40 border-slate-900 opacity-40 hover:opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{meta.icon}</span>
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: meta.hex }}
                  />
                </div>

                <div className="flex items-baseline justify-between text-[11px] font-mono mt-0.5">
                  <span className={count > 0 ? meta.textClass : 'text-slate-500'}>
                    {pct}%
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {count} {count === 1 ? 'turno' : 'turnos'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
