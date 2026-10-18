import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Edit3,
  Type,
  Image as ImageIcon,
  Clock,
  Sliders,
  Eye,
  Check,
  X,
  Sparkles,
  Maximize2,
  ChevronRight,
  Layers,
  Upload,
  Volume2,
  AlertCircle,
  Monitor,
  Smartphone,
  Download,
  Flag,
  Bookmark,
  Palette,
  Copy,
} from 'lucide-react';
import {
  DialogueTurn,
  HostConfig,
  PodcastScript,
  StudioSettings,
  VideoBrandingSettings,
  VideoOverlay,
  OverlayType,
} from '../types';
import { VideoRenderer } from '../services/videoRenderer';
import { estimateTurnDurationSec, formatDigitalTime } from './ScriptEditor';
import { getEmotionMeta } from './EmotionalRhythmTracker';
import { VISUAL_STYLES } from '../assets/introOutroPresets';

interface VideoTimelineEditorProps {
  script: PodcastScript;
  hostA: HostConfig;
  hostB: HostConfig;
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  onClose?: () => void;
}

export const VideoTimelineEditor: React.FC<VideoTimelineEditorProps> = ({
  script,
  hostA,
  hostB,
  settings,
  setSettings,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isEditingOverlay, setIsEditingOverlay] = useState<boolean>(false);
  const [editingType, setEditingType] = useState<OverlayType>('text');

  // Formulario para nuevo overlay o edición
  const [overlayForm, setOverlayForm] = useState<Partial<VideoOverlay>>({
    type: 'text',
    text: '',
    textStyle: 'lower-third',
    textColor: '#ffffff',
    textBgColor: 'rgba(15, 23, 42, 0.92)',
    fontSize: 'medium',
    positionX: 50,
    positionY: 80,
    widthPercent: 35,
    animation: 'fade',
    opacity: 1.0,
    startTime: 0,
    endTime: 4,
  });

  const branding = settings.branding;
  const overlays = useMemo(() => branding.overlays || [], [branding.overlays]);
  const chapters = useMemo(() => branding.timelineChapters || [], [branding.timelineChapters]);
  const [copiedChaptersToast, setCopiedChaptersToast] = useState(false);

  // Auto-generar capítulos a partir de la estructura del podcast
  const handleAutoGenerateChapters = () => {
    const autoChapters: Array<{ id: string; seconds: number; title: string }> = [];
    autoChapters.push({
      id: 'ch-intro',
      seconds: 0,
      title: '01. Introducción & Portada',
    });

    const introOffset = branding.includeIntro ? (branding.introDuration || 3.5) : 0;
    let cursor = introOffset;
    let chIndex = 2;

    (script.turns || []).forEach((t, idx) => {
      const dur = estimateTurnDurationSec(t.text, 140);
      if (idx === 0 || idx % 2 === 0 || (t.visual_title && t.visual_title.length > 3)) {
        autoChapters.push({
          id: `ch-turn-${idx}`,
          seconds: Math.round(cursor),
          title: `${String(chIndex).padStart(2, '0')}. ${t.visual_title || `Diálogo Parte ${chIndex}`}`,
        });
        chIndex++;
      }
      cursor += dur;
    });

    if (branding.includeOutro) {
      autoChapters.push({
        id: 'ch-outro',
        seconds: Math.round(cursor),
        title: `${String(chIndex).padStart(2, '0')}. Cierre & Conclusiones`,
      });
    }

    setSettings((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        timelineChapters: autoChapters,
      },
    }));
  };

  const handleAddChapterAtCurrentTime = () => {
    const sec = Math.round(currentTime);
    const newCh = {
      id: `ch-${Date.now()}`,
      seconds: sec,
      title: `Capítulo en ${formatDigitalTime(sec)}`,
    };
    const updated = [...(branding.timelineChapters || []), newCh].sort((a, b) => a.seconds - b.seconds);
    setSettings((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        timelineChapters: updated,
      },
    }));
  };

  const handleDeleteChapter = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        timelineChapters: (prev.branding.timelineChapters || []).filter((c) => c.id !== id),
      },
    }));
  };

  const handleCopyYouTubeChapters = () => {
    const chs = branding.timelineChapters && branding.timelineChapters.length > 0
      ? branding.timelineChapters
      : [
          { id: '1', seconds: 0, title: 'Introducción' },
          ...timelineStructure.segments.filter((s) => s.type === 'turn').map((s, i) => ({
            id: `t-${i}`,
            seconds: Math.round(s.startTime),
            title: s.label,
          })),
        ];

    const lines = chs.map((c) => `${formatDigitalTime(c.seconds)} ${c.title}`).join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedChaptersToast(true);
    setTimeout(() => setCopiedChaptersToast(false), 2500);
  };

  // 1. Estructura de Tiempo de Todo el Vídeo
  const timelineStructure = useMemo(() => {
    const introDur = branding.includeIntro ? Math.max(1, branding.introDuration || 3.5) : 0;
    const outroDur = branding.includeOutro ? Math.max(1, branding.outroDuration || 3.5) : 0;

    let cursor = 0;
    const segments: Array<{
      id: string;
      type: 'intro' | 'turn' | 'outro';
      turnIndex?: number;
      startTime: number;
      endTime: number;
      duration: number;
      label: string;
      speaker?: string;
      emotion?: string;
      bgImage?: string;
      sfxId?: string;
    }> = [];

    // Intro Segment
    if (introDur > 0) {
      segments.push({
        id: 'intro',
        type: 'intro',
        startTime: cursor,
        endTime: cursor + introDur,
        duration: introDur,
        label: 'Portada (Intro)',
      });
      cursor += introDur;
    }

    // Turns Segments
    (script.turns || []).forEach((t, idx) => {
      const dur = estimateTurnDurationSec(t.text, 140);
      segments.push({
        id: `turn-${idx}`,
        type: 'turn',
        turnIndex: idx,
        startTime: cursor,
        endTime: cursor + dur,
        duration: dur,
        label: t.visual_title || `Turno #${idx + 1}`,
        speaker: t.speaker,
        emotion: t.emotion,
        bgImage: branding.turnBackgroundImages?.[idx],
        sfxId: t.sfx?.effectId,
      });
      cursor += dur;
    });

    // Outro Segment
    if (outroDur > 0) {
      segments.push({
        id: 'outro',
        type: 'outro',
        startTime: cursor,
        endTime: cursor + outroDur,
        duration: outroDur,
        label: 'Fin (Outro)',
      });
      cursor += outroDur;
    }

    const totalDuration = Math.max(1, cursor);
    return {
      introDur,
      outroDur,
      segments,
      totalDuration,
    };
  }, [script, branding]);

  // Inicializar VideoRenderer
  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new VideoRenderer(canvasRef.current);
      rendererRef.current.resize(settings.aspectRatio, settings.resolution);
      rendererRef.current.preloadImages(
        branding.logoUrl,
        branding.introCoverUrl || branding.turnBackgroundImages?.[0]
      );
      rendererRef.current.preloadTurnBackgrounds(branding.turnBackgroundImages);
    }
  }, [settings.aspectRatio, settings.resolution, branding]);

  // Dibujar el fotograma correspondiente al tiempo actual (currentTime)
  const renderAtTime = (time: number) => {
    if (!rendererRef.current) return;
    const { segments, totalDuration } = timelineStructure;

    // Localizar segmento activo
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    const activeSeg =
      segments.find((s) => clampedTime >= s.startTime && clampedTime < s.endTime) ||
      segments[segments.length - 1];

    if (!activeSeg) return;

    if (activeSeg.type === 'intro') {
      rendererRef.current.drawFrame(
        clampedTime,
        null,
        0,
        script.turns?.length || 1,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'intro'
      );
    } else if (activeSeg.type === 'outro') {
      rendererRef.current.drawFrame(
        clampedTime,
        null,
        (script.turns?.length || 1) - 1,
        script.turns?.length || 1,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'outro'
      );
    } else {
      const turnIdx = activeSeg.turnIndex ?? 0;
      const turn = script.turns[turnIdx];
      const turnProgress =
        activeSeg.duration > 0
          ? (clampedTime - activeSeg.startTime) / activeSeg.duration
          : 0.5;

      rendererRef.current.drawFrame(
        clampedTime,
        turn,
        turnIdx,
        script.turns?.length || 1,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'dialogue',
        turnProgress
      );
    }
  };

  // Re-render cuando cambia currentTime o configuración
  useEffect(() => {
    if (!isPlaying) {
      renderAtTime(currentTime);
    }
  }, [currentTime, settings, isPlaying]);

  // Loop de reproducción continua
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= timelineStructure.totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        renderAtTime(next);
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timelineStructure.totalDuration]);

  // Guardar un nuevo overlay o actualizar existente
  const handleSaveOverlay = () => {
    if (editingType === 'text' && !overlayForm.text?.trim()) return;
    if (editingType === 'image' && !overlayForm.imageUrl) return;

    const start = Math.max(0, overlayForm.startTime ?? 0);
    const end = Math.max(start + 0.5, overlayForm.endTime ?? start + 3);

    const newOverlay: VideoOverlay = {
      id: overlayForm.id || `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: editingType,
      startTime: start,
      endTime: end,
      text: overlayForm.text?.trim(),
      textStyle: overlayForm.textStyle || 'lower-third',
      textColor: overlayForm.textColor || '#ffffff',
      textBgColor: overlayForm.textBgColor || 'rgba(15, 23, 42, 0.92)',
      fontSize: overlayForm.fontSize || 'medium',
      imageUrl: overlayForm.imageUrl,
      imageAlt: overlayForm.imageAlt,
      positionX: overlayForm.positionX ?? 50,
      positionY: overlayForm.positionY ?? (editingType === 'text' ? 80 : 50),
      widthPercent: overlayForm.widthPercent ?? (editingType === 'text' ? 40 : 30),
      animation: overlayForm.animation || 'fade',
      opacity: overlayForm.opacity ?? 1.0,
    };

    setSettings((prev) => {
      const existing = prev.branding.overlays || [];
      const index = existing.findIndex((o) => o.id === newOverlay.id);
      let updated: VideoOverlay[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = newOverlay;
      } else {
        updated = [...existing, newOverlay].sort((a, b) => a.startTime - b.startTime);
      }
      return {
        ...prev,
        branding: {
          ...prev.branding,
          overlays: updated,
        },
      };
    });

    setIsEditingOverlay(false);
    setSelectedOverlayId(newOverlay.id);
    renderAtTime(currentTime);
  };

  // Eliminar un overlay
  const handleDeleteOverlay = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        overlays: (prev.branding.overlays || []).filter((o) => o.id !== id),
      },
    }));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
    renderAtTime(currentTime);
  };

  // Abrir editor para nuevo overlay
  const handleStartNewOverlay = (type: OverlayType) => {
    setEditingType(type);
    setOverlayForm({
      id: undefined,
      type,
      text: type === 'text' ? 'DATO CLAVE: 85% DE ADOPCIÓN' : '',
      textStyle: 'lower-third',
      textColor: '#ffffff',
      textBgColor: 'rgba(15, 23, 42, 0.92)',
      fontSize: 'medium',
      imageUrl: '',
      positionX: 50,
      positionY: type === 'text' ? 80 : 50,
      widthPercent: type === 'text' ? 40 : 30,
      animation: 'fade',
      opacity: 1.0,
      startTime: Math.round(currentTime * 10) / 10,
      endTime: Math.min(
        timelineStructure.totalDuration,
        Math.round((currentTime + 4) * 10) / 10
      ),
    });
    setIsEditingOverlay(true);
  };

  // Abrir editor para un overlay existente
  const handleEditOverlay = (ov: VideoOverlay) => {
    setEditingType(ov.type);
    setOverlayForm({ ...ov });
    setIsEditingOverlay(true);
  };

  // Subir imagen para overlay
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setOverlayForm((prev) => ({
          ...prev,
          imageUrl: dataUrl,
          imageAlt: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const isVertical = settings.aspectRatio === '9:16';

  return (
    <div className="space-y-6">
      {/* Barra de cabecera del editor de línea de tiempo */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Línea de Tiempo del Vídeo & Edición de Superposiciones
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                Timeline Player
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Previsualiza todo el metraje en tiempo real y superpone textos, títulos flotantes o imágenes en momentos exactos.
            </p>
          </div>
        </div>

        {/* Botones de acción rápida: Añadir Texto / Añadir Imagen */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleStartNewOverlay('text')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all active:scale-95"
          >
            <Type className="w-4 h-4" />
            <span>+ Añadir Texto</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartNewOverlay('image')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <ImageIcon className="w-4 h-4" />
            <span>+ Añadir Imagen</span>
          </button>

          {/* Selector Rápido de Estilo Visual (Anime, Pizarra, Cyberpunk, Studio, Minimal) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 px-1 font-semibold flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Estilo:</span>
            </span>
            {VISUAL_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setSettings((prev) => ({
                    ...prev,
                    branding: { ...prev.branding, visualStyle: st.id },
                  }));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  (branding.visualStyle || 'studio') === st.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={st.description}
              >
                <span>{st.icon}</span>
                <span className="hidden sm:inline">{st.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Relación de aspecto */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, aspectRatio: '16:9' }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                !isVertical ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> 16:9
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, aspectRatio: '9:16' }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                isVertical ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> 9:16
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Cerrar vista de línea de tiempo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal: Viewport Canvas (Izquierda) + Inspector de Superposiciones (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Viewport Canvas del Vídeo */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-2xl space-y-4">
          {/* Canvas Box */}
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 transition-all ${
              isVertical ? 'w-[280px] sm:w-[320px] aspect-[9/16]' : 'w-full max-w-[580px] aspect-video'
            }`}
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain block bg-slate-950" />

            {/* Timecode Badge sobre el Canvas */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-slate-700 text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-md">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
              <span>{formatDigitalTime(currentTime)}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-300">{formatDigitalTime(timelineStructure.totalDuration)}</span>
            </div>

            {/* Overlays activos en este segundo */}
            <div className="absolute top-3 right-3 flex items-center gap-1 pointer-events-none">
              {overlays
                .filter((o) => currentTime >= o.startTime && currentTime <= o.endTime)
                .map((o) => (
                  <span
                    key={o.id}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/80 border border-purple-500 text-purple-200"
                  >
                    {o.type === 'text' ? '📝 Texto' : '🖼️ Imagen'}
                  </span>
                ))}
            </div>
          </div>

          {/* Controles de Reproducción y Scrubbing */}
          <div className="w-full space-y-2">
            {/* Barra de progreso / Scrubbing deslizante */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-amber-400 min-w-[48px]">
                {formatDigitalTime(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={timelineStructure.totalDuration}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  renderAtTime(val);
                }}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />

              <span className="font-mono text-xs text-slate-400 min-w-[48px] text-right">
                {formatDigitalTime(timelineStructure.totalDuration)}
              </span>
            </div>

            {/* Botones Play / Pause / Skip */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  renderAtTime(0);
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Ir al inicio (00:00)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const prev = Math.max(0, currentTime - 5);
                  setCurrentTime(prev);
                  renderAtTime(prev);
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Retroceder 5 segundos"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = Math.min(timelineStructure.totalDuration, currentTime + 5);
                  setCurrentTime(next);
                  renderAtTime(next);
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Avanzar 5 segundos"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Inspector y Editor de Capas Superpuestas (Derecha) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Modal / Formulario de Edición de Overlay */}
          {isEditingOverlay ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/50 shadow-2xl space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  {editingType === 'text' ? <Type className="w-4 h-4 text-amber-400" /> : <ImageIcon className="w-4 h-4 text-indigo-400" />}
                  <span>{overlayForm.id ? 'Editar Superposición' : `Nueva Capa de ${editingType === 'text' ? 'Texto' : 'Imagen'}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingOverlay(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Si es Texto */}
              {editingType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Texto a mostrar en pantalla:
                    </label>
                    <textarea
                      rows={2}
                      value={overlayForm.text || ''}
                      onChange={(e) => setOverlayForm((p) => ({ ...p, text: e.target.value }))}
                      placeholder="Escribe el texto destacado..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Estilo Visual de Texto */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Estilo de presentación:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {[
                        { id: 'lower-third', label: '📺 Cintillo TV' },
                        { id: 'headline', label: '🎬 Título Cine' },
                        { id: 'badge', label: '🏷️ Píldora DATO' },
                        { id: 'neon', label: '⚡ Neón Cyber' },
                        { id: 'quote', label: '💬 Cita Textual' },
                        { id: 'alert', label: '🚨 Alerta Roja' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setOverlayForm((p) => ({ ...p, textStyle: st.id as any }))}
                          className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all ${
                            overlayForm.textStyle === st.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Si es Imagen */}
              {editingType === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Imagen / Gráfico a superponer:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Subir archivo de imagen</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    {overlayForm.imageUrl && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                        <img
                          src={overlayForm.imageUrl}
                          alt="Preview"
                          className="w-12 h-12 object-contain rounded bg-slate-900 border border-slate-800 p-1"
                        />
                        <span className="text-[11px] text-emerald-400 font-medium truncate">
                          ✓ Imagen cargada ({overlayForm.imageAlt || 'Personalizada'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rango de Tiempo (Start - End) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Inicio (segundos):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={timelineStructure.totalDuration}
                    step={0.5}
                    value={overlayForm.startTime ?? 0}
                    onChange={(e) => setOverlayForm((p) => ({ ...p, startTime: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Fin (segundos):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={timelineStructure.totalDuration}
                    step={0.5}
                    value={overlayForm.endTime ?? 4}
                    onChange={(e) => setOverlayForm((p) => ({ ...p, endTime: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  />
                </div>
              </div>

              {/* Posicionamiento en Pantalla */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Posición Vertical (Y):</span>
                  <span className="font-mono text-amber-400">{overlayForm.positionY}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={overlayForm.positionY ?? 80}
                  onChange={(e) => setOverlayForm((p) => ({ ...p, positionY: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Posición Horizontal (X):</span>
                  <span className="font-mono text-amber-400">{overlayForm.positionX}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={overlayForm.positionX ?? 50}
                  onChange={(e) => setOverlayForm((p) => ({ ...p, positionX: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Botón Guardar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveOverlay}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Superposición</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOverlay(false)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* Lista de Capas de Superposición Creadas */
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Capas Superpuestas Activas ({overlays.length})</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {overlays.length === 0 ? 'Sin capas creadas' : 'En el vídeo'}
                </span>
              </div>

              {overlays.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No has añadido textos flotantes ni imágenes todavía.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartNewOverlay('text')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                    >
                      + Añadir Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewOverlay('image')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold hover:bg-indigo-500/30 transition-colors"
                    >
                      + Añadir Imagen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {overlays.map((ov) => {
                    const isCurrent = currentTime >= ov.startTime && currentTime <= ov.endTime;
                    const isSelected = selectedOverlayId === ov.id;

                    return (
                      <div
                        key={ov.id}
                        onClick={() => {
                          setSelectedOverlayId(ov.id);
                          setCurrentTime(ov.startTime);
                          renderAtTime(ov.startTime);
                        }}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                            : isSelected
                            ? 'bg-slate-950 border-amber-500'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                            {ov.type === 'text' ? <Type className="w-3.5 h-3.5 text-amber-400" /> : <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {ov.type === 'text' ? ov.text : ov.imageAlt || 'Imagen superpuesta'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatDigitalTime(ov.startTime)} - {formatDigitalTime(ov.endTime)} ({Math.round((ov.endTime - ov.startTime) * 10) / 10}s)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleEditOverlay(ov)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                            title="Editar superposición"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOverlay(ov.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Eliminar superposición"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PISTA MULTI-TRACK DE LA LÍNEA DE TIEMPO DEL VÍDEO (Escenas, Overlays y Audio) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Línea de Tiempo Multitrack
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Duración Total: {formatDigitalTime(timelineStructure.totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" /> {hostA.name}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> {hostB.name}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Overlays
            </span>
          </div>
        </div>

        {/* Contenedor con regla de tiempo y pistas */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2.5 relative overflow-x-auto shadow-inner">
          {/* Track 1: Escenas / Turnos de Vídeo */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pista 1: Escenas & Diálogos
            </div>
            <div className="h-10 w-full bg-slate-900/90 rounded-lg flex gap-1 p-1 border border-slate-800">
              {timelineStructure.segments.map((seg) => {
                const widthPercent = (seg.duration / timelineStructure.totalDuration) * 100;
                const isCurrent = currentTime >= seg.startTime && currentTime < seg.endTime;
                const isHostA = seg.speaker === 'Host_A';

                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => {
                      setCurrentTime(seg.startTime);
                      renderAtTime(seg.startTime);
                    }}
                    style={{ width: `${Math.max(2.5, widthPercent)}%` }}
                    className={`h-full rounded text-[10px] font-mono font-bold transition-all relative truncate px-1 flex items-center justify-between text-left ${
                      isCurrent
                        ? 'ring-2 ring-white scale-[1.02] z-10'
                        : seg.type === 'intro'
                        ? 'bg-amber-600/80 text-white hover:bg-amber-500'
                        : seg.type === 'outro'
                        ? 'bg-blue-600/80 text-white hover:bg-blue-500'
                        : isHostA
                        ? 'bg-blue-950/80 text-blue-200 border border-blue-600/40 hover:bg-blue-900/80'
                        : 'bg-amber-950/80 text-amber-200 border border-amber-600/40 hover:bg-amber-900/80'
                    }`}
                    title={`${seg.label} (${formatDigitalTime(seg.startTime)} - ${formatDigitalTime(seg.endTime)})`}
                  >
                    <span className="truncate">
                      {seg.type === 'turn' ? `#${(seg.turnIndex || 0) + 1} ${seg.label}` : seg.label}
                    </span>
                    {seg.bgImage && <span className="text-[9px] shrink-0">🖼️</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track 2: Capas de Superposición (Overlays) */}
          <div>
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Pista 2: Textos & Imágenes Superpuestas</span>
              <span>{overlays.length} capas</span>
            </div>
            <div className="h-8 w-full bg-slate-900/90 rounded-lg relative p-1 border border-slate-800">
              {overlays.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                  Línea de superposiciones vacía. Pulsa '+ Añadir Texto' o '+ Añadir Imagen' para insertar elementos.
                </div>
              ) : (
                overlays.map((ov) => {
                  const leftPercent = (ov.startTime / timelineStructure.totalDuration) * 100;
                  const widthPercent = ((ov.endTime - ov.startTime) / timelineStructure.totalDuration) * 100;
                  const isCurrent = currentTime >= ov.startTime && currentTime <= ov.endTime;

                  return (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => {
                        setSelectedOverlayId(ov.id);
                        setCurrentTime(ov.startTime);
                        renderAtTime(ov.startTime);
                      }}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(3, widthPercent)}%`,
                      }}
                      className={`absolute top-1 bottom-1 rounded px-1.5 text-[10px] font-bold truncate flex items-center gap-1 transition-all ${
                        isCurrent
                          ? 'bg-purple-500 text-white ring-2 ring-white z-10 shadow-lg shadow-purple-500/40'
                          : 'bg-purple-900/70 border border-purple-500/50 text-purple-200 hover:bg-purple-800'
                      }`}
                      title={`${ov.type === 'text' ? ov.text : 'Imagen'} (${formatDigitalTime(ov.startTime)} - ${formatDigitalTime(ov.endTime)})`}
                    >
                      <span>{ov.type === 'text' ? '📝' : '🖼️'}</span>
                      <span className="truncate">{ov.type === 'text' ? ov.text : 'Imagen'}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Track 3: Marcadores de Capítulos (YouTube Chapters) */}
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>Pista 3: Marcadores de Capítulos ({chapters.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoGenerateChapters}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                  title="Auto-generar capítulos a partir de la estructura del guion"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto-generar</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddChapterAtCurrentTime}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700 hover:text-white transition-colors"
                  title="Añadir marcador en el segundo actual"
                >
                  + En {formatDigitalTime(currentTime)}
                </button>
                <button
                  type="button"
                  onClick={handleCopyYouTubeChapters}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-950/40 transition-colors flex items-center gap-1"
                  title="Copiar marcas de tiempo con formato para la descripción de YouTube"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{copiedChaptersToast ? '¡Copiado!' : 'Copiar YouTube'}</span>
                </button>
              </div>
            </div>

            <div className="h-8 w-full bg-slate-900/90 rounded-lg relative p-1 border border-slate-800">
              {chapters.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                  Sin capítulos definidos. Pulsa 'Auto-generar' para crear marcas automáticas por escena.
                </div>
              ) : (
                chapters.map((ch) => {
                  const leftPercent = (ch.seconds / timelineStructure.totalDuration) * 100;
                  const isNear = Math.abs(currentTime - ch.seconds) < 2.5;

                  return (
                    <div
                      key={ch.id}
                      style={{ left: `${Math.min(94, Math.max(0, leftPercent))}%` }}
                      className="absolute top-1 bottom-1 flex items-center group z-10"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTime(ch.seconds);
                          renderAtTime(ch.seconds);
                        }}
                        className={`h-full px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          isNear
                            ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-white z-20 shadow-md shadow-amber-500/40 scale-105'
                            : 'bg-amber-950/90 border border-amber-500/60 text-amber-200 hover:bg-amber-900'
                        }`}
                        title={`${ch.title} (${formatDigitalTime(ch.seconds)}) - Clic para saltar`}
                      >
                        <Flag className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{ch.title}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(ch.id);
                        }}
                        className="hidden group-hover:flex ml-1 p-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400 hover:text-rose-200"
                        title="Eliminar este capítulo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
