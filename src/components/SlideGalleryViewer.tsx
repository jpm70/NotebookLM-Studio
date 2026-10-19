import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Terminal,
  Table as TableIcon,
  Image as ImageIcon,
  Edit3,
  Play,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  RefreshCw,
  Film,
  FolderDown,
  Sliders,
  Eye,
  ChevronRight,
  Code2,
  Move,
} from 'lucide-react';
import {
  DialogueTurn,
  HostConfig,
  PodcastScript,
  StudioSettings,
  SlideType,
  SlideTableData,
  SlideTerminalData,
} from '../types';

interface SlideGalleryViewerProps {
  script: PodcastScript;
  setScript?: React.Dispatch<React.SetStateAction<PodcastScript | null>>;
  hostA: HostConfig;
  hostB: HostConfig;
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  onSelectSlideForPreview?: (index: number) => void;
  /** Abre la vista previa en esa diapositiva con el editor de caja activo. */
  onPlaceBox?: (index: number) => void;
  onLaunchExport?: () => void;
  onLaunchPythonBundle?: () => void;
  onSwitchToBranding?: () => void;
}

export const SlideGalleryViewer: React.FC<SlideGalleryViewerProps> = ({
  script,
  setScript,
  hostA,
  hostB,
  settings,
  setSettings,
  onSelectSlideForPreview,
  onPlaceBox,
  onLaunchExport,
  onLaunchPythonBundle,
  onSwitchToBranding,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'anime' | 'table' | 'terminal'>('all');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Estados de edición rápida in-situ
  const [editTurn, setEditTurn] = useState<DialogueTurn | null>(null);

  const turns = script.turns || [];

  // Filtrado de diapositivas
  const filteredTurns = turns.map((turn, index) => ({ turn, originalIndex: index })).filter(({ turn }) => {
    if (filterType === 'all') return true;
    if (filterType === 'table') return turn.slideType === 'table';
    if (filterType === 'terminal') return turn.slideType === 'terminal';
    if (filterType === 'anime') return turn.slideType === 'context_anime' || !turn.slideType || turn.slideType === 'standard';
    return true;
  });

  const countAnime = turns.filter((t) => t.slideType === 'context_anime' || !t.slideType || t.slideType === 'standard').length;
  const countTables = turns.filter((t) => t.slideType === 'table').length;
  const countTerminals = turns.filter((t) => t.slideType === 'terminal').length;

  const handleOpenEdit = (index: number) => {
    const target = turns[index];
    if (!target) return;
    setEditingIndex(index);
    // Clon profundo para edición
    setEditTurn(JSON.parse(JSON.stringify(target)));
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editTurn || !setScript) return;

    setScript((prev) => {
      if (!prev) return prev;
      const updatedTurns = [...prev.turns];
      updatedTurns[editingIndex] = editTurn;
      return {
        ...prev,
        turns: updatedTurns,
      };
    });

    setEditingIndex(null);
    setEditTurn(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditTurn(null);
  };

  const handleDeleteSlide = (index: number) => {
    if (!setScript || turns.length <= 1) return;
    setScript((prev) => {
      if (!prev) return prev;
      const updated = prev.turns.filter((_, i) => i !== index);
      return { ...prev, turns: updated };
    });
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    if (!setScript) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= turns.length) return;

    setScript((prev) => {
      if (!prev) return prev;
      const updated = [...prev.turns];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, turns: updated };
    });
  };

  const handleAddSlide = () => {
    if (!setScript) return;
    const isHostA = turns.length % 2 === 0;
    const newSlide: DialogueTurn = {
      speaker: isHostA ? 'Host_A' : 'Host_B',
      emotion: 'entusiasta',
      text: 'Nueva diapositiva con análisis técnico y comentarios de los locutores.',
      visual_title: `Diapositiva ${turns.length + 1}`,
      visual_prompt: 'High tech cybersecurity laboratory with glowing displays and data graphs, anime style',
      slideType: 'context_anime',
    };

    setScript((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        turns: [...prev.turns, newSlide],
      };
    });
    // Abrir editor inmediatamente para la nueva diapositiva
    handleOpenEdit(turns.length);
  };

  // Helper para renderizar miniatura 1:1 según tipo
  const renderSlideMiniature = (turn: DialogueTurn, idx: number) => {
    const isHostA = turn.speaker === 'Host_A';
    const host = isHostA ? hostA : hostB;
    const userBg = settings.branding.turnBackgroundImages?.[idx];
    const isTerminal = turn.slideType === 'terminal';
    const isTable = turn.slideType === 'table';

    // 1. DIAPOSITIVA TIPO TERMINAL
    if (isTerminal) {
      const term = turn.terminalData || {
        command: 'kismet -c wlan0',
        lines: ['[*] Iniciando captura en canal...', '[+] Paquetes capturados: 1,420', '[!] Alerta IDS: SSID duplicado'],
        title: 'user@unfantasma: ~',
      };
      return (
        <div className="w-full h-full bg-[#030712] p-2.5 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden select-none border border-emerald-950/40">
          {/* Barra de Ventana Terminal */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[8px] text-slate-500 truncate max-w-[130px]">
              {term.title || 'user@unfantasma: ~'}
            </span>
            <span className="text-[7px] text-emerald-400 font-bold">BASH</span>
          </div>

          {/* Cuerpo de Terminal con Comando y Salida */}
          <div className="flex-1 py-1 space-y-1 overflow-hidden">
            <div className="text-emerald-400 font-bold flex items-center gap-1 truncate">
              <span className="text-slate-500">$</span>
              <span className="truncate">{term.command || 'sudo kismet -c wlan0'}</span>
            </div>
            <div className="space-y-0.5 text-slate-300">
              {(term.lines || []).slice(0, 3).map((line, lIdx) => (
                <div key={lIdx} className="truncate text-[8px] opacity-90 text-slate-400">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Prompt y Cursor Parpadeante */}
          <div className="pt-1 flex items-center gap-1 border-t border-slate-800/50 text-slate-500 text-[8px]">
            <span className="text-emerald-400 font-bold">▶</span>
            <span className="text-slate-400 truncate max-w-[140px]">{turn.visual_title || 'Terminal pasiva'}</span>
            <span className="w-1.5 h-2.5 bg-emerald-400 inline-block animate-pulse" />
          </div>
        </div>
      );
    }

    // 2. DIAPOSITIVA TIPO TABLA LIMPIA
    if (isTable) {
      const table = turn.tableData || {
        headers: ['Aspecto', 'Kismet', 'Aircrack-ng'],
        rows: [
          ['Operación', 'Pasiva (Solo escucha)', 'Activa (Inyecta deauth)'],
          ['Visibilidad', 'Indetectable', 'Detectable en espectro'],
        ],
        caption: 'Comparativa de operación',
      };
      return (
        <div className="w-full h-full bg-[#030712] p-2 flex flex-col justify-between text-[8px] relative overflow-hidden select-none border border-cyan-950/40">
          <div className="flex items-center justify-between pb-1 border-b border-cyan-900/40 shrink-0">
            <span className="font-bold text-cyan-300 truncate max-w-[150px] uppercase tracking-wider text-[7.5px]">
              {turn.visual_title || 'Tabla Comparativa'}
            </span>
            <span className="text-[7px] text-cyan-400 font-mono">TABLE</span>
          </div>

          {/* Mini Tabla Limpia */}
          <div className="flex-1 my-1 overflow-hidden rounded bg-slate-900/60 border border-slate-800/80">
            <table className="w-full border-collapse text-[7.5px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700/80">
                  {(table.headers || []).slice(0, 3).map((h, hIdx) => (
                    <th key={hIdx} className="p-1 text-left font-bold text-slate-200 truncate">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.rows || []).slice(0, 2).map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-900/30'}>
                    {(row || []).slice(0, 3).map((cell, cIdx) => (
                      <td key={cIdx} className="p-1 text-slate-300 truncate border-t border-slate-800/40">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[7px] text-slate-400 truncate text-center opacity-80">
            {table.caption || `${table.rows?.length || 0} filas estructuradas`}
          </div>
        </div>
      );
    }

    // 3. DIAPOSITIVA TIPO ANIME + TEXTO
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col justify-between p-2.5 text-white select-none">
        {/* Fondo Anime / Ilustración */}
        {userBg ? (
          <img src={userBg} alt="Fondo Diapositiva" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/90 to-purple-950/80">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,#f59e0b,transparent_60%)]" />
          </div>
        )}

        {/* Overlay Degradado para Legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Header de la Diapositiva */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[7.5px] uppercase font-bold tracking-wider text-amber-400 font-mono truncate max-w-[130px]">
            {turn.visual_title || `Escena ${idx + 1}`}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>

        {/* Texto Relevante y Locutor */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-300">
            <span>{host.avatarIcon || (isHostA ? '🎙️' : '🎧')}</span>
            <span style={{ color: host.color || '#38bdf8' }}>{host.name}</span>
            <span className="text-slate-500 font-normal">[{turn.emotion || 'normal'}]</span>
          </div>
          <p className="text-[8px] text-slate-200 line-clamp-2 leading-tight">
            "{turn.text}"
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Título y Acciones Globales */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5" /> PREVISUALIZACIÓN RÁPIDA 1:1
            </span>
            <span className="text-xs text-slate-400">• Total: {turns.length} Diapositivas</span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-white">
            Galería Visual de Diapositivas antes de Generar
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Revisa la cuadrícula en miniatura 1:1 de cada diapositiva detectada del artículo. Puedes hacer clic en cualquiera para <strong>editar directamente textos, filas de tablas o comandos de terminal</strong> antes de lanzar la grabación final.
          </p>
        </div>

        {/* Acciones Principales */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddSlide}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Añadir Diapositiva</span>
          </button>

          {onLaunchExport && (
            <button
              type="button"
              onClick={onLaunchExport}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Film className="w-4 h-4 fill-slate-950" />
              <span>Lanzar Grabación Final (.mp4)</span>
            </button>
          )}

          {onLaunchPythonBundle && (
            <button
              type="button"
              onClick={onLaunchPythonBundle}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              title="Descargar paquete validado de Python con todos los assets"
            >
              <FolderDown className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Paquete Python (.zip)</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Métricas por Tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1">
          <span className="text-slate-400 px-2 font-semibold">Filtrar:</span>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Todas ({turns.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('anime')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'anime'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Anime + Texto ({countAnime})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('table')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'table'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tablas ({countTables})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('terminal')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'terminal'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminales ({countTerminals})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-3">
          <span>Relación de Aspecto: <strong className="text-white">{settings.aspectRatio}</strong></span>
          {onSwitchToBranding && (
            <button
              type="button"
              onClick={onSwitchToBranding}
              className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" /> Configurar Estilos y Portada
            </button>
          )}
        </div>
      </div>

      {/* Cuadrícula Visual de Diapositivas (Grid 1:1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTurns.map(({ turn, originalIndex }) => {
          const isHostA = turn.speaker === 'Host_A';
          const host = isHostA ? hostA : hostB;
          const isTerminal = turn.slideType === 'terminal';
          const isTable = turn.slideType === 'table';
          const isAnime = !isTerminal && !isTable;

          return (
            <div
              key={originalIndex}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col overflow-hidden shadow-lg group hover:shadow-amber-500/10"
            >
              {/* Header de la Tarjeta */}
              <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">
                    Diapositiva {originalIndex + 1}
                  </span>
                  <span className="text-[10px] text-slate-500">·</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {isTerminal ? '💻 Terminal' : isTable ? '📊 Tabla' : '🎨 Anime'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveSlide(originalIndex, 'up')}
                    disabled={originalIndex === 0}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                    title="Mover arriba"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSlide(originalIndex, 'down')}
                    disabled={originalIndex === turns.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                    title="Mover abajo"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(originalIndex)}
                    disabled={turns.length <= 1}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-20 transition-colors ml-1"
                    title="Eliminar diapositiva"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Contenedor de Miniatura Visual 1:1 */}
              <div
                onClick={() => handleOpenEdit(originalIndex)}
                className="w-full aspect-video bg-black cursor-pointer relative overflow-hidden group-hover:brightness-105 transition-all"
                title="Haz clic para editar textos, filas o comandos de esta diapositiva"
              >
                {renderSlideMiniature(turn, originalIndex)}

                {/* Overlay hover con botón de edición rápida */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md">
                    <Edit3 className="w-3.5 h-3.5" /> Editar Directamente
                  </span>
                </div>
              </div>

              {/* Información y Acciones Rápidas */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white truncate max-w-[180px]">
                      {turn.visual_title || `Punto ${originalIndex + 1}`}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${host.color}20`, color: host.color }}
                    >
                      {host.name} ({turn.speaker})
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {turn.text}
                  </p>
                </div>

                {/* Botones de Acción al Pie de la Tarjeta */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(originalIndex)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar Diapositiva</span>
                  </button>

                  {onPlaceBox && (turn.relevantText || turn.tableData || turn.terminalData) && (
                    <button
                      type="button"
                      onClick={() => onPlaceBox(originalIndex)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-600/60 text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                      title="Mover y redimensionar la tarjeta, tabla o terminal de esta diapositiva"
                    >
                      <Move className="w-3 h-3" />
                      <span>Colocar caja</span>
                    </button>
                  )}

                  {onSelectSlideForPreview && (
                    <button
                      type="button"
                      onClick={() => onSelectSlideForPreview(originalIndex)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold flex items-center gap-1 transition-colors"
                      title="Probar y previsualizar en el canvas principal"
                    >
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Probar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE EDICIÓN DIRECTA IN-SITU DE DIAPOSITIVA                           */}
      {/* ========================================================================= */}
      {editingIndex !== null && editTurn && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Editando Diapositiva {editingIndex + 1}: {editTurn.visual_title || 'Sin título'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Selector de Tipo de Diapositiva */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Tipo de Diapositiva:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'context_anime', name: '🎨 Anime + Texto', desc: 'Fondo ilustrado y diálogo' },
                    { id: 'table', name: '📊 Tabla Limpia', desc: 'Matriz comparativa de datos' },
                    { id: 'terminal', name: '💻 Terminal Interactiva', desc: 'Ventana de comandos bash' },
                  ].map((t) => {
                    const isSelected = (editTurn.slideType || 'context_anime') === t.id || (t.id === 'context_anime' && editTurn.slideType === 'standard');
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const newType = t.id as SlideType;
                          setEditTurn((prev) => {
                            if (!prev) return prev;
                            const updated = { ...prev, slideType: newType };
                            // Inicializar datos si no existen
                            if (newType === 'table' && !updated.tableData) {
                              updated.tableData = {
                                headers: ['Aspecto', 'Kismet', 'Aircrack-ng'],
                                rows: [
                                  ['Operación', 'Pasiva (Solo escucha)', 'Activa (Inyecta deauth)'],
                                  ['Visibilidad', 'Indetectable', 'Detectable en espectro'],
                                ],
                                caption: 'Comparativa de protocolos',
                              };
                            }
                            if (newType === 'terminal' && !updated.terminalData) {
                              updated.terminalData = {
                                command: 'kismet -c wlan0',
                                lines: ['[*] Iniciando captura en canal...', '[+] Paquetes capturados: 1,420'],
                                title: 'user@unfantasma: ~',
                              };
                            }
                            return updated;
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white font-bold ring-1 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-xs text-white">{t.name}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título Visual y Diálogo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Título Visual en Pantalla:
                  </label>
                  <input
                    type="text"
                    value={editTurn.visual_title || ''}
                    onChange={(e) => setEditTurn((prev) => prev ? { ...prev, visual_title: e.target.value } : null)}
                    placeholder="Ej. Instalación de Kismet"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Locutor y Emoción:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editTurn.speaker}
                      onChange={(e) => setEditTurn((prev) => prev ? { ...prev, speaker: e.target.value as any } : null)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Host_A">{hostA.name} (Host A)</option>
                      <option value="Host_B">{hostB.name} (Host B)</option>
                    </select>

                    <select
                      value={editTurn.emotion || 'entusiasta'}
                      onChange={(e) => setEditTurn((prev) => prev ? { ...prev, emotion: e.target.value } : null)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="entusiasta">Entusiasta</option>
                      <option value="analítico">Analítico</option>
                      <option value="curioso">Curioso</option>
                      <option value="sorprendido">Sorprendido</option>
                      <option value="reflexivo">Reflexivo</option>
                      <option value="divertido">Divertido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Diálogo del Locutor */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Diálogo del Locutor (Locución y Subtítulos):
                </label>
                <textarea
                  value={editTurn.text || ''}
                  onChange={(e) => setEditTurn((prev) => prev ? { ...prev, text: e.target.value } : null)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500"
                  placeholder="Escribe el diálogo que pronunciará el locutor..."
                />
              </div>

              {/* EDITOR ESPECÍFICO: TERMINAL */}
              {editTurn.slideType === 'terminal' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> Edición de Comando y Salida de Terminal
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Estilo macOS/Linux</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Título de la Ventana:</label>
                    <input
                      type="text"
                      value={editTurn.terminalData?.title || 'user@unfantasma: ~'}
                      onChange={(e) =>
                        setEditTurn((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            terminalData: {
                              ...prev.terminalData,
                              title: e.target.value,
                              lines: prev.terminalData?.lines || [],
                            },
                          };
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Comando Bash Principal ($):
                    </label>
                    <input
                      type="text"
                      value={editTurn.terminalData?.command || ''}
                      onChange={(e) =>
                        setEditTurn((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            terminalData: {
                              ...prev.terminalData,
                              command: e.target.value,
                              lines: prev.terminalData?.lines || [],
                            },
                          };
                        })
                      }
                      placeholder="sudo apt install kismet -y && kismet -c wlan0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Líneas de Salida de Terminal (una por renglón):
                    </label>
                    <textarea
                      value={(editTurn.terminalData?.lines || []).join('\n')}
                      onChange={(e) => {
                        const newLines = e.target.value.split('\n');
                        setEditTurn((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            terminalData: {
                              ...prev.terminalData,
                              lines: newLines,
                            },
                          };
                        })
                      }}
                      rows={4}
                      placeholder="[*] Iniciando Kismet server...&#10;[+] Canal fijado en 6&#10;[OK] Red detectada: Target_WiFi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
                    />
                  </div>
                </div>
              )}

              {/* EDITOR ESPECÍFICO: TABLA LIMPIA */}
              {editTurn.slideType === 'table' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" /> Edición de Tabla Autoadaptable
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTurn((prev) => {
                          if (!prev) return prev;
                          const headers = prev.tableData?.headers || ['Columna 1', 'Columna 2'];
                          const rows = prev.tableData?.rows || [];
                          const newRow = new Array(headers.length).fill('Nuevo valor');
                          return {
                            ...prev,
                            tableData: {
                              ...prev.tableData,
                              headers,
                              rows: [...rows, newRow],
                            },
                          };
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Añadir Fila
                    </button>
                  </div>

                  {/* Encabezados de Columna */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Encabezados de Columna:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(editTurn.tableData?.headers || []).map((header, hIdx) => (
                        <input
                          key={hIdx}
                          type="text"
                          value={header}
                          onChange={(e) => {
                            const newHeaders = [...(editTurn.tableData?.headers || [])];
                            newHeaders[hIdx] = e.target.value;
                            setEditTurn((prev) => prev ? {
                              ...prev,
                              tableData: { ...prev.tableData, headers: newHeaders, rows: prev.tableData?.rows || [] },
                            } : null);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-bold"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Editor de Filas */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block">Filas de Datos:</label>
                    {(editTurn.tableData?.rows || []).map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          {row.map((cell, cIdx) => (
                            <input
                              key={cIdx}
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newRows = [...(editTurn.tableData?.rows || [])];
                                newRows[rIdx][cIdx] = e.target.value;
                                setEditTurn((prev) => prev ? {
                                  ...prev,
                                  tableData: { ...prev.tableData, headers: prev.tableData?.headers || [], rows: newRows },
                                } : null);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newRows = (editTurn.tableData?.rows || []).filter((_, idx) => idx !== rIdx);
                            setEditTurn((prev) => prev ? {
                              ...prev,
                              tableData: { ...prev.tableData, headers: prev.tableData?.headers || [], rows: newRows },
                            } : null);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EDITOR ESPECÍFICO: PROMPT ANIME */}
              {(editTurn.slideType === 'context_anime' || !editTurn.slideType || editTurn.slideType === 'standard') && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Prompt Visual para Fondo Anime:
                  </label>
                  <input
                    type="text"
                    value={editTurn.visual_prompt || ''}
                    onChange={(e) => setEditTurn((prev) => prev ? { ...prev, visual_prompt: e.target.value } : null)}
                    placeholder="Anime tech landscape, Makoto Shinkai twilight sky, high detailed..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Los cambios se reflejarán instantáneamente en la línea de tiempo y en la exportación de vídeo.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
