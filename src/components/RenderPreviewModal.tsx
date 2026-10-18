import React, { useState, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  Download,
  Monitor,
  Smartphone,
  Volume2,
  Image as ImageIcon,
  Edit3,
  Loader2,
  CheckCircle2,
  Layers,
  Eye,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { DialogueTurn, HostConfig, PodcastScript, StudioSettings } from '../types';
import { sfxEngine } from '../services/sfxEngine';
import { buildManualPrompt, generateBackgroundFromSource, getStoredBackgroundSource } from '../services/imageService';
import { DEFAULT_LOGO_BASE64 } from '../assets/logoData';

interface RenderPreviewModalProps {
  script: PodcastScript;
  setScript: React.Dispatch<React.SetStateAction<PodcastScript | null>>;
  hostA: HostConfig;
  hostB: HostConfig;
  initialTurnIndex?: number;
  settings?: StudioSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StudioSettings>>;
  onClose: () => void;
}

export const RenderPreviewModal: React.FC<RenderPreviewModalProps> = ({
  script,
  setScript,
  hostA,
  hostB,
  initialTurnIndex = 0,
  settings,
  setSettings,
  onClose,
}) => {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(
    Math.min(Math.max(0, initialTurnIndex), (script.turns?.length || 1) - 1)
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(
    settings?.aspectRatio || '16:9'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fallback de imágenes de turno en estado local si no viene de settings
  const [localTurnImages, setLocalTurnImages] = useState<Record<number, string>>(
    settings?.branding?.turnBackgroundImages || {}
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const turns = script.turns || [];
  const currentTurn: DialogueTurn = turns[currentTurnIndex] || {
    speaker: 'Host_A',
    emotion: 'curioso',
    text: '',
    visual_title: 'Título no definido',
    visual_prompt: '',
  };

  const isHostA = currentTurn.speaker === 'Host_A';
  const currentHost = isHostA ? hostA : hostB;
  const currentBgImage =
    settings?.branding?.turnBackgroundImages?.[currentTurnIndex] ||
    localTurnImages[currentTurnIndex];

  // Actualizar un campo de este turno en el guion
  const updateCurrentTurn = (fields: Partial<DialogueTurn>) => {
    setScript((prev) => {
      if (!prev) return prev;
      const newTurns = [...prev.turns];
      newTurns[currentTurnIndex] = {
        ...newTurns[currentTurnIndex],
        ...fields,
      };
      return { ...prev, turns: newTurns };
    });
  };

  // Guardar imagen para el turno actual
  const saveTurnImage = (url: string) => {
    setLocalTurnImages((prev) => ({
      ...prev,
      [currentTurnIndex]: url,
    }));

    if (setSettings) {
      setSettings((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          turnBackgroundImages: {
            ...(prev.branding.turnBackgroundImages || {}),
            [currentTurnIndex]: url,
          },
        },
      }));
    }
  };

  // Quitar imagen del turno actual
  const removeTurnImage = () => {
    setLocalTurnImages((prev) => {
      const copy = { ...prev };
      delete copy[currentTurnIndex];
      return copy;
    });

    if (setSettings) {
      setSettings((prev) => {
        const copy = { ...(prev.branding.turnBackgroundImages || {}) };
        delete copy[currentTurnIndex];
        return {
          ...prev,
          branding: {
            ...prev.branding,
            turnBackgroundImages: copy,
          },
        };
      });
    }
  };

  // Generar el fondo de este turno con el origen elegido en el estudio (o copiar su prompt en modo manual)
  const handleGenerateImage = async () => {
    const source = getStoredBackgroundSource();
    const style = settings?.branding?.visualStyle || 'anime';
    const aspectRatio = settings?.aspectRatio || '16:9';
    if (source === 'manual') {
      const prompt = buildManualPrompt(currentTurn, style, 'shinkai', aspectRatio, script.episode_title);
      try {
        await navigator.clipboard.writeText(prompt);
        alert('Prompt copiado. Pégalo en Gemini y sube aquí la imagen con el botón de subir.');
      } catch {
        window.prompt('Copia este prompt y pégalo en Gemini:', prompt);
      }
      return;
    }
    try {
      setIsGenerating(true);
      const result = await generateBackgroundFromSource(source, currentTurn, {
        style,
        aspectRatio,
        episodeTitle: script.episode_title,
        index: currentTurnIndex,
      });
      saveTurnImage(result.imageUrl);
      if (result.source === 'svg-fallback') {
        alert(`No se pudo generar la imagen; se usa un fondo vectorial de reserva.\n\nMotivo: ${result.error}`);
      }
    } catch (e: any) {
      console.error('Error generando ilustración del turno:', e);
      alert(e?.message || 'Error generando la ilustración.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Subir imagen desde disco local
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        saveTurnImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Descargar fotograma actual como imagen PNG de alta fidelidad
  const handleDownloadSnapshot = () => {
    setIsDownloading(true);
    const width = aspectRatio === '9:16' ? 720 : 1280;
    const height = aspectRatio === '9:16' ? 1280 : 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsDownloading(false);
      return;
    }

    const renderSnapshot = (bgImg?: HTMLImageElement) => {
      // 1. Fondo (Imagen o degradado de fallback)
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const hRatio = width / bgImg.naturalWidth;
        const vRatio = height / bgImg.naturalHeight;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (width - bgImg.naturalWidth * ratio) / 2;
        const centerShiftY = (height - bgImg.naturalHeight * ratio) / 2;
        ctx.drawImage(
          bgImg,
          0,
          0,
          bgImg.naturalWidth,
          bgImg.naturalHeight,
          centerShiftX,
          centerShiftY,
          bgImg.naturalWidth * ratio,
          bgImg.naturalHeight * ratio
        );
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.5, '#020617');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Grid sutil
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
        for (let y = 0; y < height; y += 8) {
          ctx.fillRect(0, y, width, 2);
        }
      }

      // 2. Viñeta oscura para contraste
      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, 'rgba(2, 6, 23, 0.55)');
      vignette.addColorStop(0.4, 'rgba(2, 6, 23, 0.15)');
      vignette.addColorStop(0.7, 'rgba(2, 6, 23, 0.65)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // 3. Título en pantalla (Visual Title)
      const isVert = aspectRatio === '9:16';
      const titleY = isVert ? height * 0.18 : height * 0.16;
      ctx.save();
      ctx.textAlign = 'center';

      // Badge superior de diapositiva
      ctx.fillStyle = '#f59e0b';
      ctx.font = `800 ${Math.round(height * 0.020)}px "Plus Jakarta Sans", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 10;
      ctx.fillText(`DIAPOSITIVA #${currentTurnIndex + 1}`, width / 2, titleY - height * 0.04);

      // Título en grande
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(height * 0.040)}px "Plus Jakarta Sans", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      ctx.fillText(currentTurn.visual_title || `Turno #${currentTurnIndex + 1}`, width / 2, titleY);
      ctx.restore();

      // 4. Subtítulo / Diálogo inferior
      const cardY = isVert ? height * 0.70 : height * 0.72;
      const cardW = Math.min(width * 0.88, 860);
      const cardH = Math.min(height * 0.22, 160);

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isHostA ? 'rgba(59, 130, 246, 0.5)' : 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // RoundRect fallback
      if (ctx.roundRect) {
        ctx.roundRect(width / 2 - cardW / 2, cardY, cardW, cardH, 18);
      } else {
        ctx.rect(width / 2 - cardW / 2, cardY, cardW, cardH);
      }
      ctx.fill();
      ctx.stroke();

      // Badge de Locutor
      ctx.fillStyle = isHostA ? '#93c5fd' : '#fcd34d';
      ctx.font = `700 ${Math.round(height * 0.019)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(`🎙️ ${currentHost.name} [${currentTurn.emotion}]`, width / 2 - cardW / 2 + 24, cardY + 32);

      // Texto de diálogo
      ctx.fillStyle = '#f8fafc';
      ctx.font = `500 ${Math.round(height * 0.022)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(
        currentTurn.text ? (currentTurn.text.slice(0, 85) + (currentTurn.text.length > 85 ? '...' : '')) : '',
        width / 2 - cardW / 2 + 24,
        cardY + 70
      );
      ctx.restore();

      // Trigger download
      const link = document.createElement('a');
      link.download = `render-preview-turno-${currentTurnIndex + 1}-${aspectRatio}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsDownloading(false);
    };

    if (currentBgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentBgImage;
      img.onload = () => renderSnapshot(img);
      img.onerror = () => renderSnapshot();
    } else {
      renderSnapshot();
    }
  };

  const isVertical = aspectRatio === '9:16';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <span>Vista Previa de Renderizado Audiovisual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                  Composición Diapositiva & Título
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Comprueba cómo se combinan la imagen de fondo, el título y los subtítulos para cada turno.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de relación de aspecto */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Formato Horizontal YouTube (16:9)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16:9</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Formato Vertical YouTube Shorts (9:16)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16</span>
              </button>
            </div>

            {/* Cerrar modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Viewport and Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Composition Viewport (Cols 1-7 or 1-8) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-3">
            {/* Viewport Box */}
            <div
              className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 transition-all ${
                isVertical
                  ? 'w-[280px] sm:w-[320px] aspect-[9/16]'
                  : 'w-full max-w-[560px] aspect-video'
              }`}
            >
              {/* Capa 1: Imagen de fondo o ilustración conceptual */}
              {currentBgImage ? (
                <img
                  src={currentBgImage}
                  alt={currentTurn.visual_title}
                  className="w-full h-full object-cover block animate-in fade-in duration-300"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 relative">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">
                    Sin imagen asignada para este turno
                  </h4>
                  <p className="text-slate-400 text-xs max-w-xs mb-3 italic">
                    "{currentTurn.visual_prompt || 'Genera una ilustración para este turno del guion'}"
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGenerating}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all active:scale-95"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Generar con IA ahora</span>
                  </button>
                </div>
              )}

              {/* Capa 2: Viñeta y degradados de contraste cinematográfico */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/70 pointer-events-none" />

              {/* Capa 3: Top Bar con Diapositiva & Formato */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-slate-700 text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                  <span>SLIDE #{currentTurnIndex + 1}</span>
                  <span>·</span>
                  <span className="text-slate-300">{aspectRatio}</span>
                </div>

                {currentTurn.sfx && (
                  <div className="px-2 py-0.5 rounded-lg bg-purple-950/80 backdrop-blur-md border border-purple-500/50 text-[10px] text-purple-200 font-semibold flex items-center gap-1">
                    <span>{currentTurn.sfx.icon || '🎵'}</span>
                    <span className="truncate max-w-[90px]">{currentTurn.sfx.name}</span>
                  </div>
                )}
              </div>

              {/* Capa 4: Título en Pantalla (Visual Title) con composición televisiva */}
              <div className="absolute top-12 left-4 right-4 text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block drop-shadow-md mb-0.5">
                  Tema en Pantalla
                </span>
                <h2 className="text-white font-extrabold text-base sm:text-xl leading-tight drop-shadow-lg shadow-black line-clamp-2">
                  {currentTurn.visual_title || 'Título de la Diapositiva'}
                </h2>
              </div>

              {/* Capa 5: Tarjeta Inferior de Locutor y Subtítulo de Diálogo */}
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                      isHostA ? 'bg-blue-600' : 'bg-amber-600'
                    }`}
                  >
                    {isHostA ? 'A' : 'B'}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isHostA ? 'text-blue-300' : 'text-amber-300'
                    }`}
                  >
                    {currentHost.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    [{currentTurn.emotion}]
                  </span>
                </div>

                <p className="text-slate-100 text-xs line-clamp-2 leading-relaxed font-sans">
                  {currentTurn.text || 'Sin diálogo en este turno...'}
                </p>
              </div>
            </div>

            {/* Quick Actions under Viewport */}
            <div className="flex items-center gap-2 flex-wrap justify-center pt-1 text-xs">
              {currentTurn.sfx && (
                <button
                  type="button"
                  onClick={() => sfxEngine.play(currentTurn.sfx!.effectId, currentTurn.sfx!.volume)}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-200 font-semibold flex items-center gap-1.5 hover:bg-purple-900/60 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Probar SFX: {currentTurn.sfx.name}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadSnapshot}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                title="Descargar este fotograma como imagen PNG en alta definición"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isDownloading ? 'Generando PNG...' : 'Descargar Diapositiva (PNG)'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Settings & Live Editing for Current Turn (Cols 8-12) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Navegación entre Turnos */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Navegación de Turnos:
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Turno {currentTurnIndex + 1} de {turns.length}
                </span>
              </div>

              {/* Botones Anterior / Siguiente */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTurnIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentTurnIndex === 0}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTurnIndex((prev) => Math.min(turns.length - 1, prev + 1))
                  }
                  disabled={currentTurnIndex >= turns.length - 1}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Tira horizontal de miniaturas / números de turnos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                {turns.map((t, idx) => {
                  const isSelected = idx === currentTurnIndex;
                  const hasImage = !!(
                    settings?.branding?.turnBackgroundImages?.[idx] ||
                    localTurnImages[idx]
                  );
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentTurnIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md scale-105'
                          : hasImage
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                      title={`Turno #${idx + 1}: ${t.visual_title}${hasImage ? ' (Con ilustración)' : ''}`}
                    >
                      <span>#{idx + 1}</span>
                      {hasImage && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ajustes y Edición en Vivo del Título y Prompt */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edición en Vivo del Turno #{currentTurnIndex + 1}</span>
              </h4>

              {/* Input Título en Pantalla */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Título Superpuesto (Visual Title):
                </label>
                <input
                  type="text"
                  value={currentTurn.visual_title || ''}
                  onChange={(e) => updateCurrentTurn({ visual_title: e.target.value })}
                  placeholder="Título para la diapositiva en pantalla..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              {/* Textarea Prompt Visual para Generación */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Prompt Visual de Apoyo (Concept Art):
                </label>
                <textarea
                  value={currentTurn.visual_prompt || ''}
                  onChange={(e) => updateCurrentTurn({ visual_prompt: e.target.value })}
                  rows={2}
                  placeholder="Cinematic concept illustration prompt..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                />
              </div>

              {/* Acciones de Imagen: Generar con IA / Subir Archivo */}
              <div className="pt-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGenerating}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{currentBgImage ? 'Regenerar con IA' : 'Generar Imagen con IA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Subir archivo de imagen desde tu equipo"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-300" />
                    <span>Subir</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {currentBgImage && (
                  <button
                    type="button"
                    onClick={removeTurnImage}
                    className="text-[11px] text-rose-400 hover:underline text-center py-1"
                  >
                    Quitar imagen actual de este turno
                  </button>
                )}
              </div>
            </div>

            {/* Cuadro de resumen informativo */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span>Locutor asignado:</span>
                <span className={isHostA ? 'text-blue-400' : 'text-amber-400'}>
                  {currentHost.name} ({currentTurn.speaker})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Emoción:</span>
                <span className="capitalize text-slate-300">[{currentTurn.emotion}]</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Efecto acústico (SFX):</span>
                <span>{currentTurn.sfx ? `${currentTurn.sfx.name} (${currentTurn.sfx.position})` : 'Ninguno'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Los cambios en el título y las imágenes generadas se sincronizan automáticamente con el estudio de vídeo.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Listo / Volver al Guion
          </button>
        </div>
      </div>
    </div>
  );
};
