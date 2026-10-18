import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Zap,
  Filter,
  Search,
  Check,
  Plus,
  Trash2,
  Layers,
  Sliders,
  X,
  Clock,
  ArrowRight,
  Music,
  Wand2,
} from 'lucide-react';
import { PodcastScript, SfxCategory, SfxPosition, SoundEffectItem, TurnSfxConfig } from '../types';
import { SFX_CATALOG, sfxEngine, getSfxById } from '../services/sfxEngine';

interface SfxManagerProps {
  script: PodcastScript;
  setScript: React.Dispatch<React.SetStateAction<PodcastScript | null>>;
  activeTurnIndex: number;
  setActiveTurnIndex: (index: number) => void;
  targetTurnForModal?: number | null;
  onCloseModal?: () => void;
  isModal?: boolean;
}

export const SfxManager: React.FC<SfxManagerProps> = ({
  script,
  setScript,
  activeTurnIndex,
  setActiveTurnIndex,
  targetTurnForModal = null,
  onCloseModal,
  isModal = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | SfxCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);

  // Estado para inserción en turno específico
  const [targetTurnIndex, setTargetTurnIndex] = useState<number>(
    targetTurnForModal !== null ? targetTurnForModal : activeTurnIndex
  );
  const [insertionPosition, setInsertionPosition] = useState<SfxPosition>('before');
  const [insertionVolume, setInsertionVolume] = useState<number>(0.7);
  const [justAssignedId, setJustAssignedId] = useState<string | null>(null);

  // Manejar parada automática al desmontar
  React.useEffect(() => {
    return () => {
      sfxEngine.stopAll();
    };
  }, []);

  // Filtrado de efectos
  const filteredCatalog = useMemo(() => {
    return SFX_CATALOG.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Turnos que tienen SFX asignados
  const turnsWithSfx = useMemo(() => {
    if (!script?.turns) return [];
    return script.turns
      .map((turn, index) => ({ turn, index }))
      .filter((item) => !!item.turn.sfx);
  }, [script?.turns]);

  // Reproducir preview de un sonido
  const handleTogglePreview = async (effect: SoundEffectItem) => {
    if (playingSfxId === effect.id) {
      sfxEngine.stopAll();
      setPlayingSfxId(null);
      return;
    }

    sfxEngine.stopAll();
    setPlayingSfxId(effect.id);
    try {
      await sfxEngine.play(effect.id, insertionVolume);
    } finally {
      setPlayingSfxId((current) => (current === effect.id ? null : current));
    }
  };

  // Asignar SFX al turno seleccionado
  const handleAssignSfx = (effect: SoundEffectItem) => {
    if (!script?.turns || targetTurnIndex < 0 || targetTurnIndex >= script.turns.length) return;

    const newConfig: TurnSfxConfig = {
      effectId: effect.id,
      name: effect.name,
      category: effect.category,
      position: effect.category === 'ambient' ? 'overlay' : insertionPosition,
      volume: insertionVolume,
      icon: effect.icon,
      description: effect.description,
    };

    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = [...prev.turns];
      newTurns[targetTurnIndex] = {
        ...newTurns[targetTurnIndex],
        sfx: newConfig,
      };
      return { ...prev, turns: newTurns };
    });

    setJustAssignedId(effect.id);
    setTimeout(() => setJustAssignedId(null), 2000);

    if (isModal && onCloseModal) {
      setTimeout(onCloseModal, 400);
    }
  };

  // Eliminar SFX de un turno
  const handleRemoveSfx = (turnIdx: number) => {
    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = [...prev.turns];
      const updated = { ...newTurns[turnIdx] };
      delete updated.sfx;
      newTurns[turnIdx] = updated;
      return { ...prev, turns: newTurns };
    });
  };

  // Insertar sugerencias inteligentes de transiciones automáticas
  const handleAutoSuggestTransitions = () => {
    if (!script?.turns || script.turns.length === 0) return;

    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = [...prev.turns];

      newTurns.forEach((turn, i) => {
        // En el primer turno: Swoosh inicial o Whoosh cinemático
        if (i === 0 && !turn.sfx) {
          turn.sfx = {
            effectId: 'whoosh-cinematic',
            name: 'Whoosh Cinemático',
            category: 'transition',
            position: 'before',
            volume: 0.75,
          };
        } else if (i === Math.floor(newTurns.length / 2) && !turn.sfx) {
          // A mitad de programa: Chime revelación
          turn.sfx = {
            effectId: 'chime-transition',
            name: 'Chime Revelación',
            category: 'transition',
            position: 'before',
            volume: 0.65,
          };
        } else if (i === newTurns.length - 1 && !turn.sfx) {
          // Último turno: Ding o Tada de cierre
          turn.sfx = {
            effectId: 'tada-fanfare',
            name: 'Tada / Éxito',
            category: 'emphasis',
            position: 'after',
            volume: 0.7,
          };
        }
      });

      return { ...prev, turns: newTurns };
    });
  };

  // Limpiar todos los SFX
  const handleClearAllSfx = () => {
    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = prev.turns.map((t) => {
        const copy = { ...t };
        delete copy.sfx;
        return copy;
      });
      return { ...prev, turns: newTurns };
    });
  };

  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md'
    : 'p-5 md:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6';

  const modalBoxClasses = isModal
    ? 'w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6'
    : 'space-y-6';

  return (
    <div className={containerClasses}>
      <div className={modalBoxClasses}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold">
              <Zap className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-white tracking-wide">
                  Efectos de Sonido (SFX) & Transiciones
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  Estudio Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inserta barridos, clics, timbres y ambientes sincronizados en momentos clave del guion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isModal && (
              <button
                type="button"
                onClick={handleAutoSuggestTransitions}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all shadow-sm"
                title="Inserta automáticamente efectos recomendados en inicio, clímax y final"
              >
                <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                Sugerir SFX Auto
              </button>
            )}

            {isModal && onCloseModal && (
              <button
                onClick={onCloseModal}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Resumen de SFX aplicados en el Guion */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Efectos Asignados</div>
              <div className="text-sm font-black text-white">
                {turnsWithSfx.length} de {script?.turns?.length || 0} turnos
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Catálogo Disponible</div>
              <div className="text-sm font-black text-white">{SFX_CATALOG.length} efectos acústicos</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Motor de Síntesis</div>
              <div className="text-sm font-black text-emerald-400">Web Audio API 0-Latency</div>
            </div>
          </div>
        </div>

        {/* Barra de Configuración de Inserción (Turno destino, posición y volumen) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 shadow-inner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Destino de inserción:</span>
            </div>

            {/* Selector de Turno Destino */}
            <select
              value={targetTurnIndex}
              onChange={(e) => setTargetTurnIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-amber-500 shadow-sm"
            >
              {script?.turns?.map((t, idx) => (
                <option key={idx} value={idx}>
                  Turno {idx + 1} ({t.speaker === 'Host_A' ? 'Alex' : 'Sam'}): &quot;
                  {t.text.slice(0, 32)}...&quot;
                </option>
              ))}
            </select>

            {/* Posición del Efecto */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setInsertionPosition('before')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  insertionPosition === 'before'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Al inicio (Transición)
              </button>
              <button
                type="button"
                onClick={() => setInsertionPosition('overlay')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  insertionPosition === 'overlay'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ambiente de fondo
              </button>
              <button
                type="button"
                onClick={() => setInsertionPosition('after')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  insertionPosition === 'after'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Al final (Énfasis)
              </button>
            </div>
          </div>

          {/* Control de Volumen de inserción */}
          <div className="flex items-center gap-2 text-xs">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">Volumen:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={insertionVolume}
              onChange={(e) => setInsertionVolume(parseFloat(e.target.value))}
              className="w-24 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-amber-300 font-bold w-10">
              {Math.round(insertionVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Controles de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Pestañas de categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({SFX_CATALOG.length})
            </button>
            <button
              onClick={() => setSelectedCategory('transition')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === 'transition'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>🌀 Transiciones</span>
            </button>
            <button
              onClick={() => setSelectedCategory('emphasis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === 'emphasis'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>🔔 Énfasis & Clics</span>
            </button>
            <button
              onClick={() => setSelectedCategory('ambient')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === 'ambient'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>☕ Ambientes</span>
            </button>
          </div>

          {/* Campo de búsqueda rápida */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar sonido (swoosh, pop, lluvia...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Grilla de Sonidos de la Biblioteca */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredCatalog.map((effect) => {
            const isPlaying = playingSfxId === effect.id;
            const isCurrentTurnAssigned =
              script?.turns[targetTurnIndex]?.sfx?.effectId === effect.id;
            const wasJustAssigned = justAssignedId === effect.id;

            return (
              <div
                key={effect.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isCurrentTurnAssigned
                    ? 'bg-amber-950/30 border-amber-400/80 ring-1 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{effect.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {effect.name}
                          {isCurrentTurnAssigned && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                              En Turno
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {effect.tag} · ~{effect.duration}s
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        effect.category === 'transition'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : effect.category === 'emphasis'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {effect.category === 'transition'
                        ? 'Transición'
                        : effect.category === 'emphasis'
                        ? 'Énfasis'
                        : 'Ambiente'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {effect.description}
                  </p>
                </div>

                {/* Acciones: Escuchar + Insertar */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleTogglePreview(effect)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isPlaying
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Detener' : 'Escuchar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAssignSfx(effect)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      wasJustAssigned
                        ? 'bg-emerald-400 text-slate-950 shadow-md'
                        : isCurrentTurnAssigned
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 hover:bg-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {wasJustAssigned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Listo!</span>
                      </>
                    ) : isCurrentTurnAssigned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Actualizar</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insertar en #{targetTurnIndex + 1}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Línea de tiempo de efectos configurados en el guion */}
        {turnsWithSfx.length > 0 && (
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Línea de tiempo de SFX en el guion ({turnsWithSfx.length} activos)
              </h4>
              <button
                type="button"
                onClick={handleClearAllSfx}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Quitar todos
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {turnsWithSfx.map(({ turn, index }) => {
                const sfx = turn.sfx!;
                const effectMeta = getSfxById(sfx.effectId);
                const isPlaying = playingSfxId === sfx.effectId;

                return (
                  <div
                    key={index}
                    className="flex-shrink-0 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs shadow-sm"
                  >
                    <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold flex items-center justify-center font-mono">
                      #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePreview(effectMeta || SFX_CATALOG[0])}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Probar sonido"
                    >
                      {isPlaying ? (
                        <Square className="w-3 h-3 text-rose-400 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 text-amber-400 fill-current" />
                      )}
                    </button>

                    <div>
                      <div className="font-bold text-white flex items-center gap-1 text-[11px]">
                        <span>{effectMeta?.icon || '🎵'}</span>
                        <span>{sfx.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="text-amber-400 font-semibold">
                          {sfx.position === 'before'
                            ? 'Al inicio'
                            : sfx.position === 'after'
                            ? 'Al final'
                            : 'Ambiente'}
                        </span>
                        <span>·</span>
                        <span>{Math.round(sfx.volume * 100)}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTurnIndex(index);
                        setTargetTurnIndex(index);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                      title="Ir a este turno"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveSfx(index)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Eliminar este efecto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
