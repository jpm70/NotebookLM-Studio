import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  Monitor,
  Smartphone,
  Sparkles,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  ExternalLink,
  Layers,
  Upload,
  Compass,
  Subtitles,
  FileText,
  ChevronDown,
  ChevronUp,
  Music,
  Volume2,
  VolumeX,
  Youtube,
  Flame,
  Loader2,
  CheckCircle,
  Zap,
  PlayCircle,
  Eye,
  Palette,
  Radio,
  FolderDown,
  LayoutGrid,
} from 'lucide-react';
import { DialogueTurn, HostConfig, PodcastScript, StudioSettings, VideoBrandingSettings } from '../types';
import { VideoRenderer } from '../services/videoRenderer';
import { DEFAULT_LOGO_BASE64 } from '../assets/logoData';
import {
  LOGO_PRESETS,
  INTRO_ANIMATIONS,
  OUTRO_ANIMATIONS,
  INTRO_SFX_OPTIONS,
  OUTRO_SFX_OPTIONS,
  VISUAL_STYLES,
  TRANSITION_OPTIONS,
  STUDIO_TEMPLATE_PRESETS,
  LogoPreset,
} from '../assets/introOutroPresets';
import { sfxEngine } from '../services/sfxEngine';
import { generateSubtitlesFromScript, triggerSrtDownload, buildSrtContent } from '../services/subtitleService';
import { bgmService, BgmTrackType } from '../services/audioBgmService';
import {
  buildFallbackSvg,
  generateBackgroundFromSource,
  getStoredBackgroundSource,
  storeBackgroundSource,
  fileToSlideImage,
  BackgroundSource,
  FREE_SECONDS_PER_IMAGE,
} from '../services/imageService';
import { ManualBackgroundsPanel } from './ManualBackgroundsPanel';
import { getSharedAudioContext } from '../services/sharedAudio';
import { YouTubeMetadataModal } from './YouTubeMetadataModal';
import { ShortsClipModal } from './ShortsClipModal';
import { VideoTimelineEditor } from './VideoTimelineEditor';
import { browserTTS } from '../services/ttsService';
import { generateValidatedPythonPackageZip } from '../services/pythonProjectFiles';
import { SlideGalleryViewer } from './SlideGalleryViewer';

interface VideoStudioProps {
  script: PodcastScript;
  setScript?: React.Dispatch<React.SetStateAction<PodcastScript | null>>;
  hostA: HostConfig;
  hostB: HostConfig;
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  onLogoUpload?: (dataUrl: string) => void;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({
  script,
  setScript,
  hostA,
  hostB,
  settings,
  setSettings,
  onLogoUpload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // El lienzo solo existe en algunas vistas: guardarlo en estado hace que el renderizador
  // se cree en cuanto aparece (antes la vista previa salía en blanco hasta cambiar un ajuste)
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const attachCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    setCanvasEl(el);
  }, []);
  const [pendingExport, setPendingExport] = useState<'full' | 'teaser' | null>(null);
  const exportPanelRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const introLogoInputRef = useRef<HTMLInputElement | null>(null);
  const outroLogoInputRef = useRef<HTMLInputElement | null>(null);
  const turnImageInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isPlayingIntroPreview, setIsPlayingIntroPreview] = useState(false);
  const [isPlayingPostIntroPreview, setIsPlayingPostIntroPreview] = useState(false);
  const [isPlayingOutroPreview, setIsPlayingOutroPreview] = useState(false);
  const [testingSfxId, setTestingSfxId] = useState<string | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [previewStage, setPreviewStage] = useState<'intro' | 'post-intro' | 'dialogue' | 'outro'>('dialogue');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStageDescription, setExportStageDescription] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastTimeline, setLastTimeline] = useState<{ turnStartTimes: number[]; outroStart: number } | null>(null);
  const [exportedVideoExt, setExportedVideoExt] = useState<'mp4' | 'webm'>('mp4');
  const [exportMode, setExportMode] = useState<'full' | 'teaser'>('full');
  const exportCancelRef = useRef<boolean>(false);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);

  // Estados para BGM en vivo
  const [isPlayingBgmTest, setIsPlayingBgmTest] = useState(false);

  // Estados para Generación de Fondos Ilustrados y Lote Anime
  const [isGeneratingTurnImages, setIsGeneratingTurnImages] = useState(false);
  const [generatingTurnIdx, setGeneratingTurnIdx] = useState<number | null>(null);
  const [selectedAnimeMood, setSelectedAnimeMood] = useState<'shinkai' | 'cyberpunk' | 'ghibli'>('shinkai');
  const [batchAnimeProgressText, setBatchAnimeProgressText] = useState<string | null>(null);
  const batchCancelRef = useRef(false);
  const [bgSource, setBgSource] = useState<BackgroundSource>(getStoredBackgroundSource);
  const chooseBgSource = (source: BackgroundSource) => {
    setBgSource(source);
    storeBackgroundSource(source);
    setBatchAnimeProgressText(null);
  };

  // Modales
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isShortsModalOpen, setIsShortsModalOpen] = useState(false);
  const [activeStudioView, setActiveStudioView] = useState<'gallery' | 'branding' | 'timeline'>('gallery');

  // Estados para exportación de paquete Python con assets validados
  const [isExportingPythonBundle, setIsExportingPythonBundle] = useState(false);
  const [pythonBundleNotice, setPythonBundleNotice] = useState<string | null>(null);

  const handleExportPythonBundle = async () => {
    try {
      setIsExportingPythonBundle(true);
      setPythonBundleNotice('Iniciando auditoría de assets del paquete...');
      const result = await generateValidatedPythonPackageZip({
        script,
        hostA,
        hostB,
        settings,
        onProgress: (pct, stage) => {
          setPythonBundleNotice(`Validando (${pct}%): ${stage}`);
        },
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notebooklm_studio_bundle.zip`;
      a.click();
      setPythonBundleNotice(`✓ Paquete validado al 100% (${result.stats.totalFiles} archivos, ${result.stats.totalSizeFormatted}) descargado.`);
      setTimeout(() => setPythonBundleNotice(null), 6000);
    } catch (err: any) {
      console.error('Error al empaquetar bundle Python:', err);
      setPythonBundleNotice(`Error: ${err?.message || 'Fallo al empaquetar'}`);
    } finally {
      setIsExportingPythonBundle(false);
    }
  };

  const branding = settings.branding;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const videoFileSlug =
    (branding.introTitle || script.episode_title || 'podcast')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'podcast';

  // Calcular timestamps de subtítulos sincronizados con el audio y offset de intro
  const introOffset = branding.includeIntro ? (branding.introDuration || 3) : 0;
  const subtitles = useMemo(() => {
    return generateSubtitlesFromScript(
      script.turns,
      hostA,
      hostB,
      introOffset,
      settings.pauseBetweenSpeakers || 0.3
    );
  }, [script.turns, hostA, hostB, introOffset, settings.pauseBetweenSpeakers]);

  // Actualizar configuración de branding
  const updateBranding = (fields: Partial<VideoBrandingSettings>) => {
    setSettings((prev) => ({
      ...prev,
      branding: { ...prev.branding, ...fields },
    }));
  };

  // Manejar subida de archivo de logo personalizado
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateBranding({ logoUrl: dataUrl, enabledLogo: true });
        if (onLogoUpload) onLogoUpload(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejar subida de archivo de logo específico para la Intro
  const handleIntroLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateBranding({ introLogoUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejar subida de archivo de logo específico para el Outro
  const handleOutroLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateBranding({ outroLogoUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Previsualizar la animación de Intro con SFX sincronizado
  const playIntroPreview = () => {
    if (!rendererRef.current) return;
    setIsPlayingPreview(false);
    setIsPlayingOutroPreview(false);
    setIsPlayingIntroPreview(true);
    setPreviewStage('intro');

    if (branding.introSfx && branding.introSfx !== 'none') {
      sfxEngine.play(branding.introSfx, 0.85);
    }

    const durationSec = branding.introDuration || 3.5;
    const startNow = performance.now();

    const frameStep = (now: number) => {
      const elapsed = (now - startNow) / 1000;
      if (elapsed >= durationSec) {
        setIsPlayingIntroPreview(false);
        rendererRef.current?.drawFrame(
          durationSec,
          null,
          0,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          false,
          branding,
          'intro'
        );
        return;
      }

      rendererRef.current?.drawFrame(
        elapsed,
        null,
        0,
        script.turns.length,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'intro'
      );

      requestAnimationFrame(frameStep);
    };

    requestAnimationFrame(frameStep);
  };

  // Previsualizar la animación de Post-Intro (Título del Artículo en Modo Animación)
  const playPostIntroPreview = () => {
    if (!rendererRef.current) return;
    setIsPlayingPreview(false);
    setIsPlayingIntroPreview(false);
    setIsPlayingOutroPreview(false);
    setIsPlayingPostIntroPreview(true);
    setPreviewStage('post-intro');

    const durationSec = branding.postIntroDuration || 3.2;
    const startNow = performance.now();

    const frameStep = (now: number) => {
      const elapsed = (now - startNow) / 1000;
      if (elapsed >= durationSec) {
        setIsPlayingPostIntroPreview(false);
        rendererRef.current?.drawFrame(
          durationSec,
          null,
          0,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          false,
          branding,
          'post-intro'
        );
        return;
      }

      rendererRef.current?.drawFrame(
        elapsed,
        null,
        0,
        script.turns.length,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'post-intro'
      );

      requestAnimationFrame(frameStep);
    };

    requestAnimationFrame(frameStep);
  };

  // Previsualizar la animación de Outro con SFX sincronizado
  const playOutroPreview = () => {
    if (!rendererRef.current) return;
    setIsPlayingPreview(false);
    setIsPlayingIntroPreview(false);
    setIsPlayingOutroPreview(true);
    setPreviewStage('outro');

    if (branding.outroSfx && branding.outroSfx !== 'none') {
      sfxEngine.play(branding.outroSfx, 0.85);
    }

    const durationSec = branding.outroDuration || 3.5;
    const startNow = performance.now();

    const frameStep = (now: number) => {
      const elapsed = (now - startNow) / 1000;
      if (elapsed >= durationSec) {
        setIsPlayingOutroPreview(false);
        rendererRef.current?.drawFrame(
          durationSec,
          null,
          script.turns.length - 1,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          false,
          branding,
          'outro'
        );
        return;
      }

      rendererRef.current?.drawFrame(
        elapsed,
        null,
        script.turns.length - 1,
        script.turns.length,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        'outro'
      );

      requestAnimationFrame(frameStep);
    };

    requestAnimationFrame(frameStep);
  };

  const testSfx = (sfxId: string) => {
    if (!sfxId || sfxId === 'none') return;
    setTestingSfxId(sfxId);
    sfxEngine.play(sfxId, 0.8);
    setTimeout(() => {
      setTestingSfxId((prev) => (prev === sfxId ? null : prev));
    }, 2500);
  };

  // Manejar subida de imagen para el turno actual
  const handleTurnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTurnBackground(currentTurnIndex, await fileToSlideImage(file, settings.aspectRatio));
  };

  const removeTurnBackground = (turnIdx: number) => {
    setSettings((prev) => {
      const copy = { ...(prev.branding.turnBackgroundImages || {}) };
      delete copy[turnIdx];
      return { ...prev, branding: { ...prev.branding, turnBackgroundImages: copy } };
    });
  };

  // Guarda el fondo de un turno usando el estado más reciente (evita perder fondos en lote)
  const setTurnBackground = (turnIdx: number, imageUrl: string) => {
    setSettings((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        turnBackgroundImages: { ...(prev.branding.turnBackgroundImages || {}), [turnIdx]: imageUrl },
      },
    }));
  };

  const sourceName = bgSource === 'gemini' ? 'Gemini' : 'el generador gratuito';

  // Generar el fondo ilustrado de un turno con el origen elegido (Gemini API o gratuito)
  const handleGenerateTurnImage = async (turnIdx: number) => {
    const turn = script.turns[turnIdx];
    if (!turn || bgSource === 'manual') return;

    try {
      setGeneratingTurnIdx(turnIdx);
      setBatchAnimeProgressText(`Generando con ${sourceName} el fondo de la diapositiva ${turnIdx + 1}...`);
      const result = await generateBackgroundFromSource(bgSource, turn, {
        style: branding.visualStyle || 'anime',
        mood: selectedAnimeMood,
        aspectRatio: settings.aspectRatio,
        episodeTitle: script.episode_title,
        index: turnIdx,
        onWait: (secs) =>
          setBatchAnimeProgressText(`Límite gratuito: la diapositiva ${turnIdx + 1} se pide en ${secs} s...`),
      });
      setTurnBackground(turnIdx, result.imageUrl);
      setBatchAnimeProgressText(
        result.source === 'svg-fallback'
          ? `⚠ No se pudo generar la imagen; se usa un fondo vectorial de reserva. Motivo: ${result.error}`
          : `✓ Fondo de la diapositiva ${turnIdx + 1} generado con ${result.model}.`
      );
    } catch (e: any) {
      console.error('Error generando fondo ilustrado:', e);
      setBatchAnimeProgressText(`⚠ ${e?.message || 'Error generando el fondo.'}`);
    } finally {
      setGeneratingTurnIdx(null);
    }
  };

  // Convertir audio base64 de síntesis Gemini a ArrayBuffer para Web Audio
  const base64ToArrayBuffer = (base64DataUrl: string): ArrayBuffer => {
    const base64 = base64DataUrl.includes(',') ? base64DataUrl.split(',')[1] : base64DataUrl;
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Generar fondos ilustrados para todos los turnos del episodio
  const handleGenerateAllTurnImages = async () => {
    await handleBatchGenerateAnimeBackgrounds(selectedAnimeMood);
  };

  // Generación en lote: mismo estilo y paleta en todas las diapositivas.
  // Con Gemini, si la primera imagen falla por cuota o modelo, el resto usa SVG sin seguir gastando peticiones.
  const handleBatchGenerateAnimeBackgrounds = async (mood: 'shinkai' | 'cyberpunk' | 'ghibli' = selectedAnimeMood) => {
    if (bgSource === 'manual') return;
    const total = script.turns.length;
    batchCancelRef.current = false;
    const cancel = {
      get cancelled() {
        return batchCancelRef.current;
      },
    };
    setIsGeneratingTurnImages(true);
    let generated = 0;
    let fallbacks = 0;
    let lastError = '';
    let geminiUnavailable: string | null = null;

    try {
      for (let i = 0; i < total; i++) {
        if (batchCancelRef.current) break;
        const turn = script.turns[i];
        setBatchAnimeProgressText(`Generando con ${sourceName} el fondo ${i + 1} de ${total}...`);

        if (geminiUnavailable) {
          setTurnBackground(
            i,
            buildFallbackSvg(turn.visual_title, branding.visualStyle || 'anime', mood, i, settings.aspectRatio)
          );
          fallbacks++;
          continue;
        }

        const result = await generateBackgroundFromSource(bgSource, turn, {
          style: branding.visualStyle || 'anime',
          mood,
          aspectRatio: settings.aspectRatio,
          episodeTitle: script.episode_title,
          index: i,
          cancel,
          onWait: (secs) =>
            setBatchAnimeProgressText(
              `Fondo ${i + 1} de ${total}: el generador gratuito admite 1 imagen cada ${FREE_SECONDS_PER_IMAGE} s, siguiente en ${secs} s...`
            ),
        });
        if (batchCancelRef.current) break;
        setTurnBackground(i, result.imageUrl);
        if (result.source !== 'svg-fallback') {
          generated++;
        } else {
          fallbacks++;
          lastError = result.error || '';
          const geminiBlocked =
            bgSource === 'gemini' && /cuota|no tiene ningún modelo|facturación|no es válida|rechazado/i.test(lastError);
          const freeBlocked = bgSource === 'free' && /HTTP 403|sigue limitando/i.test(lastError);
          if ((geminiBlocked && generated === 0) || freeBlocked) {
            geminiUnavailable = lastError;
          }
        }
      }

      const cancelled = batchCancelRef.current ? ' (detenido)' : '';
      setBatchAnimeProgressText(
        geminiUnavailable
          ? bgSource === 'gemini'
            ? `⚠ Gemini no puede generar imágenes con esta clave: ${geminiUnavailable} Se han usado ${fallbacks} fondos vectoriales de reserva. Prueba el generador gratuito o el modo manual.`
            : `⚠ ${geminiUnavailable} Se han generado ${generated} fondos y ${fallbacks} son vectoriales de reserva.`
          : fallbacks > 0
          ? `⚠ ${generated} fondos generados y ${fallbacks} de reserva${cancelled}. Último error: ${lastError}`
          : `✓ ¡Lote completado! ${generated} fondos generados con ${sourceName}${cancelled}.`
      );
    } catch (e: any) {
      console.error('Error generando lote de fondos:', e);
      setBatchAnimeProgressText(`⚠ ${e?.message || 'Error generando los fondos.'}`);
    } finally {
      setIsGeneratingTurnImages(false);
    }
  };

  // Probar música de fondo con Web Audio
  const toggleBgmTest = () => {
    if (isPlayingBgmTest) {
      bgmService.stop();
      setIsPlayingBgmTest(false);
    } else {
      bgmService.start(branding.bgmTrack, branding.bgmVolume, branding.customBgmDataUrl);
      setIsPlayingBgmTest(true);
    }
  };

  // Inicializar o redimensionar Canvas y precargar logo y fondos
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new VideoRenderer(canvasRef.current);
    renderer.resize(settings.aspectRatio, '720p');
    renderer.preloadImages(branding.logoUrl || DEFAULT_LOGO_BASE64, branding.introCoverUrl);
    renderer.preloadTurnBackgrounds(branding.turnBackgroundImages);
    rendererRef.current = renderer;

    const currentTurn = script.turns[currentTurnIndex] || script.turns[0];
    renderer.drawFrame(
      0,
      currentTurn,
      currentTurnIndex,
      script.turns.length,
      hostA,
      hostB,
      script.episode_title,
      settings.aspectRatio,
      false,
      branding,
      previewStage,
      0.5
    );
  }, [canvasEl, settings.aspectRatio, currentTurnIndex, script, hostA, hostB, branding, previewStage]);

  // Grabación pedida desde una vista sin lienzo: arrancarla en cuanto el lienzo exista
  useEffect(() => {
    if (!pendingExport || !canvasEl) return;
    const mode = pendingExport;
    setPendingExport(null);
    handleExportVideo(mode);
    setTimeout(() => exportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExport, canvasEl]);

  // Bucle de animación en vivo de previsualización
  useEffect(() => {
    if (!isPlayingPreview || !rendererRef.current) return;

    let animId: number;
    let startTime = performance.now();
    let turnTimer = 0;
    const turnDuration = 3500;

    // Si BGM está activado, arrancarlo
    if (branding.enabledBgm && !isPlayingBgmTest) {
      bgmService.start(branding.bgmTrack, branding.bgmVolume, branding.customBgmDataUrl);
    }

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      turnTimer += 16.6;

      const turnProgress = Math.min(1, turnTimer / turnDuration);

      if (previewStage === 'dialogue') {
        // Auto-ducking en simulación
        if (branding.enableAutoDucking) {
          bgmService.duckAudio(true);
        }

        if (turnTimer >= turnDuration) {
          turnTimer = 0;
          setCurrentTurnIndex((prev) => (prev + 1) % script.turns.length);
        }
      } else {
        if (branding.enableAutoDucking) {
          bgmService.duckAudio(false);
        }
      }

      const turn = script.turns[currentTurnIndex] || script.turns[0];
      rendererRef.current?.drawFrame(
        elapsed,
        turn,
        currentTurnIndex,
        script.turns.length,
        hostA,
        hostB,
        script.episode_title,
        settings.aspectRatio,
        true,
        branding,
        previewStage,
        turnProgress
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      if (!isPlayingBgmTest) bgmService.stop();
    };
  }, [canvasEl, isPlayingPreview, currentTurnIndex, script, hostA, hostB, settings.aspectRatio, branding, previewStage, isPlayingBgmTest]);

  // Exportar vídeo a .mp4 con integración directa de voces de locutores, BGM, Auto-Ducking y SFX
  const handleExportVideo = async (targetMode: 'full' | 'teaser' = exportMode) => {
    if (isExporting) return;
    if (!canvasRef.current) {
      // El lienzo solo existe en "Ajustes & Portada" (p. ej. se lanza desde la Galería):
      // se cambia de vista y la grabación arranca en cuanto el lienzo aparece
      setActiveStudioView('branding');
      setPendingExport(targetMode);
      return;
    }

    exportCancelRef.current = false;
    setIsExporting(true);
    setExportProgress(0);
    setExportedVideoUrl(null);
    setExportStageDescription('Inicializando motor de renderizado y canales de audio...');

    // Ajustes más recientes (los fondos generados en lote pueden haber llegado tras el último render)
    const branding = settingsRef.current.branding;
    const canvas = canvasRef.current;
    const renderer = new VideoRenderer(canvas);
    renderer.resize(settings.aspectRatio, '720p');
    renderer.preloadImages(branding.logoUrl || DEFAULT_LOGO_BASE64, branding.introCoverUrl);
    setExportStageDescription('Preparando los fondos de las diapositivas...');
    await renderer.preloadTurnBackgrounds(branding.turnBackgroundImages);

    const fps = 30;
    const stream = canvas.captureStream(fps);

    // Un único AudioContext compartido mezcla voces, música de fondo y efectos en la pista del vídeo
    const audioContext = getSharedAudioContext();
    const destNode = audioContext.createMediaStreamDestination();
    destNode.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    const sfxOut = sfxEngine.getOutput();
    sfxOut.connect(destNode);
    let bgmGain: GainNode | null = null;
    const releaseAudio = () => {
      try {
        sfxOut.disconnect(destNode);
      } catch {
        // ya desconectado
      }
      try {
        bgmGain?.disconnect(destNode);
      } catch {
        // ya desconectado
      }
      bgmService.stop();
    };

    // FASE 1: SINTETIZAR Y PRECARGAR VOCES DE LOS LOCUTORES (Host A y Host B)
    setExportError(null);
    setExportStageDescription('Sintetizando pistas vocales de los locutores...');
    const turnAudioBuffers: (AudioBuffer | null)[] = [];
    const turnDurations: number[] = [];

    for (let i = 0; i < script.turns.length; i++) {
      if (exportCancelRef.current) {
        setIsExporting(false);
        releaseAudio();
        return;
      }

      const turn = script.turns[i];
      const isHostA = turn.speaker === 'Host_A';
      const host = isHostA ? hostA : hostB;
      const voiceName = host.neuralVoice || (host.voiceGender === 'female' ? 'Kore' : 'Puck');

      setExportStageDescription(`[Voz ${i + 1}/${script.turns.length}] Sintetizando voz de ${host.name} (${voiceName})...`);
      setExportProgress(Math.round(((i + 1) / (script.turns.length + 2)) * 25));

      let loadedBuffer: AudioBuffer;
      try {
        const audioUrl = await browserTTS.synthesizeWithGemini(turn.text, voiceName, turn.emotion);
        const ab = base64ToArrayBuffer(audioUrl);
        loadedBuffer = await audioContext.decodeAudioData(ab.slice(0));
      } catch (err: any) {
        // Sin voz no hay vídeo: mejor parar que publicar turnos mudos o con pitidos
        console.error(`Error sintetizando la voz del turno ${i + 1}:`, err);
        releaseAudio();
        setIsExporting(false);
        setExportStageDescription('');
        setExportError(
          `No se pudo sintetizar la voz del turno ${i + 1} con Gemini: ${String(err?.message || err).replace(/\.$/, '')}. ` +
            'Las voces ya generadas se guardan en caché, así que al reintentar solo se piden las que faltan.'
        );
        return;
      }

      turnAudioBuffers.push(loadedBuffer);
      const rawDur = loadedBuffer.duration;
      const calculatedTurnDur = targetMode === 'teaser'
        ? Math.min(3.8, Math.max(2.2, rawDur * 0.8))
        : Math.max(3.2, rawDur + (settings.pauseBetweenSpeakers || 0.3));
      turnDurations.push(calculatedTurnDur);
    }

    // La música arranca justo al empezar a grabar, no durante la síntesis de voces
    if (branding.enabledBgm) {
      bgmService.start(branding.bgmTrack, branding.bgmVolume, branding.customBgmDataUrl);
      bgmGain = bgmService.getGainNode();
      bgmGain?.connect(destNode);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
      ? 'video/mp4;codecs=avc1,mp4a.40.2'
      : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      if (!exportCancelRef.current && chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        setExportedVideoExt(mimeType.includes('mp4') ? 'mp4' : 'webm');
        setExportedVideoUrl(videoUrl);
      }
      setIsExporting(false);
      setExportProgress(100);
      setExportStageDescription('');
      releaseAudio();
    };

    recorder.start(100);

    // FASE 2: CÁLCULO DE CRONOGRAMA REAL BASADO EN LA DURACIÓN DE LAS VOCES
    const introDuration = branding.includeIntro ? (branding.introDuration || 3.5) : 0;
    const postIntroDuration = branding.includePostIntro !== false ? (branding.postIntroDuration || 3.5) : 0;
    const outroDuration = branding.includeOutro ? (branding.outroDuration || 3.5) : 0;

    const turnStartTimes: number[] = [];
    let accumulatedDialogueTime = 0;
    for (let i = 0; i < script.turns.length; i++) {
      turnStartTimes.push(introDuration + postIntroDuration + accumulatedDialogueTime);
      accumulatedDialogueTime += turnDurations[i];
    }
    const dialogueDuration = accumulatedDialogueTime;
    if (targetMode === 'full') {
      setLastTimeline({ turnStartTimes: [...turnStartTimes], outroStart: introDuration + postIntroDuration + dialogueDuration });
    }
    const totalDurationSec = introDuration + postIntroDuration + dialogueDuration + outroDuration;
    const totalFrames = Math.max(30, Math.round(totalDurationSec * fps));

    const playedTurnIndices = new Set<number>();
    let introSfxPlayed = false;
    let outroSfxPlayed = false;

    let currentFrame = 0;
    const frameIntervalMs = 1000 / fps; // 33.3ms a 30fps

    const renderNextFrame = () => {
      if (exportCancelRef.current) {
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }

      if (currentFrame >= totalFrames) {
        setExportStageDescription('Finalizando compilación de vídeo y pistas de audio...');
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 300);
        return;
      }

      const totalSec = currentFrame / fps;

      if (currentFrame < introDuration * fps) {
        // Portada / Intro
        if (branding.enableAutoDucking) bgmService.duckAudio(false);
        if (!introSfxPlayed && branding.introSfx && branding.introSfx !== 'none') {
          introSfxPlayed = true;
          sfxEngine.play(branding.introSfx, 0.85);
        }
        setExportStageDescription(`[1/4] Portada Intro: "${branding.introTitle || script.episode_title}"`);
        renderer.drawFrame(
          totalSec,
          null,
          0,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          true,
          branding,
          'intro'
        );
      } else if (currentFrame < (introDuration + postIntroDuration) * fps) {
        // Post-Intro Animada: Animación Cinemática del Título
        if (branding.enableAutoDucking) bgmService.duckAudio(false);
        const postIntroSec = totalSec - introDuration;
        setExportStageDescription(`[2/4] Post-Intro: Animación Cinemática del Título`);
        renderer.drawFrame(
          postIntroSec,
          null,
          0,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          true,
          branding,
          'post-intro'
        );
      } else if (currentFrame < (introDuration + postIntroDuration + dialogueDuration) * fps) {
        // Diálogos con reproducción sincronizada de voces de los locutores y auto-ducking
        let turnIdx = 0;
        for (let i = 0; i < script.turns.length; i++) {
          if (totalSec >= turnStartTimes[i]) {
            turnIdx = i;
          }
        }

        const turn = script.turns[turnIdx];
        const tStart = turnStartTimes[turnIdx];
        const tDur = turnDurations[turnIdx] || 3.5;
        const turnProgress = Math.min(1.0, Math.max(0.0, (totalSec - tStart) / tDur));

        // Iniciar reproducción de la voz del locutor en la pista del vídeo
        if (!playedTurnIndices.has(turnIdx)) {
          playedTurnIndices.add(turnIdx);
          const buf = turnAudioBuffers[turnIdx];
          if (buf) {
            try {
              const srcNode = audioContext.createBufferSource();
              srcNode.buffer = buf;
              if (targetMode === 'teaser' && buf.duration > tDur) {
                srcNode.playbackRate.value = Math.min(1.35, buf.duration / tDur);
              }
              const voiceGain = audioContext.createGain();
              voiceGain.gain.value = 1.0;
              srcNode.connect(voiceGain);
              voiceGain.connect(destNode);
              srcNode.start();

              if (branding.enableAutoDucking) {
                bgmService.duckAudio(true);
                setTimeout(() => {
                  if (branding.enableAutoDucking) bgmService.duckAudio(false);
                }, tDur * 1000);
              }
            } catch (err) {
              console.warn('Error iniciando audio de turno:', err);
            }
          }
        }

        const slideTypeTag = turn?.slideType === 'table' ? '📊 Tabla' : turn?.slideType === 'terminal' ? '💻 Terminal' : '🎌 Anime';
        setExportStageDescription(`[3/4] Diapositiva ${turnIdx + 1}/${script.turns.length} (${slideTypeTag}) • Voz: ${turn?.speaker === 'Host_A' ? hostA.name : hostB.name}`);

        renderer.drawFrame(
          totalSec,
          turn,
          turnIdx,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          true,
          branding,
          'dialogue',
          turnProgress
        );
      } else {
        // Fin / Outro
        if (branding.enableAutoDucking) bgmService.duckAudio(false);
        if (!outroSfxPlayed && branding.outroSfx && branding.outroSfx !== 'none') {
          outroSfxPlayed = true;
          sfxEngine.play(branding.outroSfx, 0.85);
        }
        const outroSec = totalSec - introDuration - postIntroDuration - dialogueDuration;
        setExportStageDescription(`[4/4] Cierre (Outro): "${branding.outroTitle || '¡Gracias por acompañarnos!'}"`);
        renderer.drawFrame(
          outroSec,
          null,
          script.turns.length - 1,
          script.turns.length,
          hostA,
          hostB,
          script.episode_title,
          settings.aspectRatio,
          true,
          branding,
          'outro'
        );
      }

      currentFrame++;
      const recordingProgress = 25 + Math.round((currentFrame / totalFrames) * 74);
      setExportProgress(Math.min(99, recordingProgress));

      // Pacing exacto en tiempo real: garantiza que MediaRecorder grabe la duración completa con voces
      setTimeout(renderNextFrame, frameIntervalMs);
    };

    renderNextFrame();
  };

  const isVertical = settings.aspectRatio === '9:16';

  return (
    <div className="space-y-6">
      {/* Studio Bar Controls & Quick Launchers */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Estudio de Renderizado Audiovisual</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                YouTube Edition
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Formato: <strong>{isVertical ? '9:16 (YouTube Shorts)' : '16:9 (YouTube Horizontal)'}</strong> • BGM & Auto-Ducking
            </p>
          </div>
        </div>

        {/* Action Hub: Selector de Vista, Kits y Formato */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switcher de Vista Principal: Galería 1:1 vs Ajustes vs Línea de Tiempo */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStudioView('gallery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeStudioView === 'gallery'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Galería Visual (1:1)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeStudioView === 'gallery' ? 'bg-slate-950/40 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                {script.turns?.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudioView('branding')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeStudioView === 'branding'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustes & Portada</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStudioView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeStudioView === 'timeline'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Línea de Tiempo</span>
              {(branding.overlays?.length || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-mono font-bold">
                  {branding.overlays?.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsYouTubeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-500/20 transition-all active:scale-95"
          >
            <Youtube className="w-4 h-4 fill-white" />
            <span>Kit SEO</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShortsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4" />
            <span>Short (9:16)</span>
          </button>

          {/* Aspect Ratio Switch */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, aspectRatio: '16:9' }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                !isVertical ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> 16:9
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, aspectRatio: '9:16' }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                isVertical ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> 9:16
            </button>
          </div>
        </div>
      </div>

      {activeStudioView === 'gallery' ? (
        <SlideGalleryViewer
          script={script}
          setScript={setScript}
          hostA={hostA}
          hostB={hostB}
          settings={settings}
          setSettings={setSettings}
          onSelectSlideForPreview={(idx) => {
            setActiveStudioView('branding');
            setPreviewStage('dialogue');
            setCurrentTurnIndex(idx);
            setIsPlayingPreview(true);
          }}
          onLaunchExport={() => handleExportVideo('full')}
          onLaunchPythonBundle={handleExportPythonBundle}
          onSwitchToBranding={() => setActiveStudioView('branding')}
        />
      ) : activeStudioView === 'timeline' ? (
        <VideoTimelineEditor
          script={script}
          hostA={hostA}
          hostB={hostB}
          settings={settings}
          setSettings={setSettings}
          onClose={() => setActiveStudioView('branding')}
        />
      ) : (
        <>
          {/* Main Studio Viewport & Controls */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Canvas Display Viewport */}
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-2xl relative">
          {/* Stage Selector for Preview */}
          <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <span className="text-slate-400 px-2 font-semibold">Vista previa:</span>
              <button
                type="button"
                onClick={() => setPreviewStage('intro')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  previewStage === 'intro' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Portada (Intro)
              </button>
              <button
                type="button"
                onClick={() => setPreviewStage('post-intro')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  previewStage === 'post-intro' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Post-Intro (Título)
              </button>
              <button
                type="button"
                onClick={() => setPreviewStage('dialogue')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  previewStage === 'dialogue' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Diálogos (Podcast)
              </button>
              <button
                type="button"
                onClick={() => setPreviewStage('outro')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  previewStage === 'outro' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Fin (Outro)
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              {branding.enabledBgm && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Music className="w-3 h-3" /> BGM: {branding.bgmTrack.toUpperCase()}
                </span>
              )}
              <span>{branding.enabledLogo ? `Logo: ${branding.logoPosition}` : 'Logo off'}</span>
            </div>
          </div>

          {/* Actual Canvas */}
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-700/60 transition-all ${
              isVertical ? 'max-w-[340px] aspect-[9/16]' : 'max-w-2xl w-full aspect-video'
            }`}
          >
            <canvas ref={attachCanvas} className="w-full h-full object-contain block bg-slate-950" />

            {/* Overlaid preview badge */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlayingPreview ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
              {isPlayingPreview ? 'SIMULACIÓN EN VIVO' : previewStage.toUpperCase()}
            </div>
          </div>

          {/* Canvas Controls */}
          <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
            <button
              onClick={() => setIsPlayingPreview(!isPlayingPreview)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-200" />}
              {isPlayingPreview ? 'Pausar Simulación' : 'Simular Vídeo en Vivo'}
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioView('timeline')}
              className="px-3.5 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 text-purple-200 border border-purple-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Abrir editor completo de línea de tiempo con pistas de texto e imagen"
            >
              <Film className="w-3.5 h-3.5 text-purple-300" />
              <span>Línea de Tiempo & Overlays</span>
            </button>

            {previewStage === 'dialogue' && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setCurrentTurnIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentTurnIndex === 0}
                  className="px-2 py-1 rounded text-slate-300 hover:text-white disabled:opacity-40"
                >
                  ◀ Anterior
                </button>
                <span className="px-2 font-mono text-amber-400 font-bold">
                  Turno {currentTurnIndex + 1}/{script.turns.length}
                </span>
                <button
                  onClick={() => setCurrentTurnIndex((prev) => Math.min(script.turns.length - 1, prev + 1))}
                  disabled={currentTurnIndex === script.turns.length - 1}
                  className="px-2 py-1 rounded text-slate-300 hover:text-white disabled:opacity-40"
                >
                  Siguiente ▶
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customization & Export Column */}
        <div className="w-full lg:w-96 space-y-4">
          {/* SECCIÓN: Estilo Visual del Vídeo & Plantillas Predefinidas */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>Estilo Visual del Vídeo</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    5 Estilos
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Elige la atmósfera estética (Anime, Pizarra, Cyberpunk, Studio o Minimal).
                </p>
              </div>
            </div>

            {/* 1. Selector Rápido de Estilos Visuales (Anime, Pizarra, Cyberpunk, Studio, Minimal) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                <span>Tema & Paleta de Renderizado:</span>
                <span className="text-[10px] font-mono text-amber-400">
                  Activo: {(branding.visualStyle || 'studio').toUpperCase()}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VISUAL_STYLES.map((style) => {
                  const isActive = (branding.visualStyle || 'studio') === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => updateBranding({ visualStyle: style.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <span>{style.icon}</span>
                          <span className="truncate">{style.name.split(' ')[0]}</span>
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold"
                          style={{
                            backgroundColor: `${style.color}20`,
                            color: style.color,
                            border: `1px solid ${style.color}40`,
                          }}
                        >
                          {style.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {style.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Plantillas de 1 Clic (Studio Presets) */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Plantillas Integrales de 1-Clic:</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono">BGM + Estilo + Subtítulos</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {STUDIO_TEMPLATE_PRESETS.map((preset) => {
                  const isCurrent = (branding.visualStyle || 'studio') === preset.visualStyle;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        updateBranding({
                          visualStyle: preset.visualStyle,
                          turnTransition: preset.turnTransition,
                          bgmTrack: preset.bgmTrack,
                          subtitleStyle: preset.subtitleStyle,
                          introAnimation: preset.introAnimation,
                          outroAnimation: preset.outroAnimation,
                          enableBackchanneling: preset.enableBackchanneling,
                        });
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] shrink-0 font-medium flex items-center gap-1.5 transition-all ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title={preset.description}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Transiciones Cinemáticas entre Turnos */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                <span>Transición entre Turnos:</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {TRANSITION_OPTIONS.find((t) => t.id === (branding.turnTransition || 'ken-burns'))?.name || 'Ken Burns'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                {TRANSITION_OPTIONS.map((trans) => {
                  const isSelected = (branding.turnTransition || 'ken-burns') === trans.id;
                  return (
                    <button
                      key={trans.id}
                      type="button"
                      onClick={() => updateBranding({ turnTransition: trans.id })}
                      className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={trans.description}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span>{trans.icon}</span>
                        <span className="truncate">{trans.name.split(' ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Reacciones Orgánicas de Fondo (Asentimientos / Backchanneling) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                  🤝
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-200">
                    Asentimientos de Fondo (Backchanneling)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    El oyente reacciona con asentimientos y complicidad visual (💡, 🤔, 👏)
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={branding.enableBackchanneling ?? true}
                onChange={(e) => updateBranding({ enableBackchanneling: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* 1. Generación Automática en Lote: Fondos Anime Consistentes */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 space-y-4 shadow-lg shadow-purple-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Fondos de las diapositivas</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                    Estética Consistente
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Un fondo por diapositiva con el mismo estilo y paleta, a partir del prompt visual de cada turno.
                </p>
              </div>
            </div>

            {/* Origen de los fondos */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-200 block">Origen de las imágenes:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {(
                  [
                    {
                      id: 'free',
                      name: 'Gratis (sin clave)',
                      desc: `Generador Pollinations. 1 imagen cada ${FREE_SECONDS_PER_IMAGE} s: ~${Math.ceil((script.turns.length * FREE_SECONDS_PER_IMAGE) / 60)} min para ${script.turns.length} fondos.`,
                    },
                    {
                      id: 'manual',
                      name: 'Manual con Gemini',
                      desc: 'Copias cada prompt a la app de Gemini y subes aquí las imágenes.',
                    },
                    {
                      id: 'gemini',
                      name: 'Gemini API',
                      desc: 'Con tu clave. Por API exige facturación activada.',
                    },
                  ] as { id: BackgroundSource; name: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => chooseBgSource(opt.id)}
                    disabled={isGeneratingTurnImages}
                    className={`p-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                      bgSource === opt.id
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-0.5">{opt.name}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {bgSource === 'free' && (
                <p className="text-[10px] text-slate-500 leading-snug">
                  Los prompts de imagen se envían a image.pollinations.ai, un servicio externo gratuito sin garantía de
                  disponibilidad. Su pequeña marca de agua se recorta automáticamente.
                </p>
              )}
            </div>

            {/* Selector de Atmósfera / Paleta Anime Consistente */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-200 block">
                Atmósfera de los fondos:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  {
                    id: 'shinkai',
                    name: 'Shinkai Twilight',
                    icon: '🎌',
                    desc: 'Cielos morados, estrellas y luces cian',
                    color: '#c084fc',
                  },
                  {
                    id: 'cyberpunk',
                    name: 'Cyberpunk Tokyo',
                    icon: '🌃',
                    desc: 'Neón azul, lluvia y rascacielos',
                    color: '#38bdf8',
                  },
                  {
                    id: 'ghibli',
                    name: 'Ghibli Garden',
                    icon: '🌿',
                    desc: 'Luz solar suave, verde y maquinaria',
                    color: '#34d399',
                  },
                ].map((mood) => {
                  const isSelected = selectedAnimeMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedAnimeMood(mood.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-0.5">
                        <span>{mood.icon}</span>
                        <span>{mood.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {mood.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banner de Progreso de Generación en Lote */}
            {batchAnimeProgressText && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                  batchAnimeProgressText.startsWith('⚠')
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                    : 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                }`}
              >
                {(isGeneratingTurnImages || generatingTurnIdx !== null) && (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                )}
                <span className="font-semibold flex-1 break-words">{batchAnimeProgressText}</span>
                {isGeneratingTurnImages ? (
                  <button
                    type="button"
                    onClick={() => {
                      batchCancelRef.current = true;
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-200 hover:text-white shrink-0"
                  >
                    Detener
                  </button>
                ) : (
                  generatingTurnIdx === null && (
                    <button
                      type="button"
                      onClick={() => setBatchAnimeProgressText(null)}
                      className="px-1.5 text-slate-400 hover:text-white shrink-0"
                      title="Cerrar aviso"
                    >
                      ×
                    </button>
                  )
                )}
              </div>
            )}

            {bgSource === 'manual' ? (
              <ManualBackgroundsPanel
                turns={script.turns}
                episodeTitle={script.episode_title}
                style={branding.visualStyle || 'anime'}
                mood={selectedAnimeMood}
                aspectRatio={settings.aspectRatio}
                backgrounds={branding.turnBackgroundImages || {}}
                onSetBackground={setTurnBackground}
                onRemoveBackground={removeTurnBackground}
              />
            ) : (
              <>
            {/* Botón Principal de Generación en Lote */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBatchGenerateAnimeBackgrounds(selectedAnimeMood)}
                disabled={isGeneratingTurnImages}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-95 transition-all"
              >
                {isGeneratingTurnImages ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando fondos con {sourceName}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>
                      Generar {bgSource === 'gemini' ? 'con Gemini' : 'gratis'} los fondos de las {script.turns.length} diapositivas
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Controles para el turno individual actual */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateTurnImage(currentTurnIndex)}
                disabled={generatingTurnIdx === currentTurnIndex || isGeneratingTurnImages}
                className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
              >
                {generatingTurnIdx === currentTurnIndex ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>Regenerar Turno #{currentTurnIndex + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => turnImageInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-1"
                title="Subir archivo de imagen para este turno"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir</span>
              </button>
              <input
                ref={turnImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTurnImageUpload}
              />
            </div>

            {branding.turnBackgroundImages?.[currentTurnIndex] && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Fondo activo en Turno #{currentTurnIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeTurnBackground(currentTurnIndex)}
                  className="text-rose-400 hover:underline text-[10px]"
                >
                  Quitar
                </button>
              </div>
            )}
              </>
            )}
          </div>

          {/* 2. Música de Fondo (BGM) & Auto-Ducking */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                Música de Fondo (BGM)
              </h4>
              <input
                type="checkbox"
                checked={branding.enabledBgm}
                onChange={(e) => updateBranding({ enabledBgm: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {branding.enabledBgm && (
              <div className="space-y-3 pt-1 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Estilo musical:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { id: 'lofi', label: '🎧 Lo-Fi Cálido' },
                      { id: 'synthwave', label: '🕹️ Synthwave 80s' },
                      { id: 'acoustic', label: '🎸 Acústico' },
                      { id: 'ambient', label: '🌌 Ambiente Espacial' },
                    ].map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          updateBranding({ bgmTrack: track.id as BgmTrackType });
                          if (isPlayingBgmTest) {
                            bgmService.start(track.id as BgmTrackType, branding.bgmVolume);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all ${
                          branding.bgmTrack === track.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volumen y Test */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>Volumen Música</span>
                    <span className="font-mono text-emerald-400">{Math.round(branding.bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.45}
                    step={0.02}
                    value={branding.bgmVolume}
                    onChange={(e) => {
                      const vol = Number(e.target.value);
                      updateBranding({ bgmVolume: vol });
                      bgmService.setVolume(vol);
                    }}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Auto-Ducking Checkbox */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">Auto-Ducking Inteligente</div>
                      <div className="text-[10px] text-slate-400">Atenúa BGM automáticamente cuando hablan</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={branding.enableAutoDucking}
                    onChange={(e) => updateBranding({ enableAutoDucking: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleBgmTest}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  {isPlayingBgmTest ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isPlayingBgmTest ? 'Detener Prueba de Audio' : 'Escuchar Muestra BGM'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Subtítulos Dinámicos (.SRT) con Karaoke */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-amber-400" />
                Subtítulos Dinámicos & Karaoke
              </h4>
              <input
                type="checkbox"
                checked={branding.enabledSubtitles !== false}
                onChange={(e) => updateBranding({ enabledSubtitles: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {branding.enabledSubtitles !== false && (
              <div className="space-y-3 pt-1 text-xs">
                {/* Estilo visual de subtítulo */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Estilo de animación y diseño:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { id: 'karaoke', label: '🔥 Karaoke TikTok' },
                      { id: 'modern-bold', label: '💥 Modern Bold' },
                      { id: 'card', label: '🎴 Tarjeta Oscura' },
                      { id: 'bottom-bar', label: '📺 Barra YouTube' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => updateBranding({ subtitleStyle: st.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-left font-medium transition-all ${
                          (branding.subtitleStyle || 'karaoke') === st.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tamaño de fuente */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Tamaño de texto:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    {[
                      { id: 'small', label: 'Pequeño' },
                      { id: 'medium', label: 'Mediano' },
                      { id: 'large', label: 'Grande' },
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => updateBranding({ subtitleFontSize: sz.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                          (branding.subtitleFontSize || 'medium') === sz.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón de descarga de archivo .SRT */}
                <button
                  type="button"
                  onClick={() => triggerSrtDownload(subtitles, script.episode_title)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Descargar Subtítulos (.srt)
                </button>
              </div>
            )}
          </div>

          {/* 4. Logo de Agua en Esquina */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Logo de Agua en Esquina
              </h4>
              <input
                type="checkbox"
                checked={branding.enabledLogo}
                onChange={(e) => updateBranding({ enabledLogo: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Current Logo Preview without distortion */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <img
                src={branding.logoUrl || DEFAULT_LOGO_BASE64}
                alt="Logo en esquina"
                className="w-11 h-11 object-contain rounded-lg bg-slate-900 border border-slate-800 p-1"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">Logo Oficial</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {branding.websiteUrl || 'unfantasmaenelsistema.com'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
              >
                <Upload className="w-3 h-3" /> Cambiar
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
            </div>

            {branding.enabledLogo && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Posición en pantalla:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { id: 'top-right', label: 'Arriba Derecha' },
                      { id: 'top-left', label: 'Arriba Izquierda' },
                      { id: 'bottom-right', label: 'Abajo Derecha' },
                      { id: 'bottom-left', label: 'Abajo Izquierda' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => updateBranding({ logoPosition: pos.id as any })}
                        className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                          branding.logoPosition === pos.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Tamaño</span>
                      <span className="font-mono text-amber-400">{branding.logoSizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={24}
                      value={branding.logoSizePercent}
                      onChange={(e) => updateBranding({ logoSizePercent: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Opacidad</span>
                      <span className="font-mono text-amber-400">{Math.round(branding.logoOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.0}
                      step={0.05}
                      value={branding.logoOpacity}
                      onChange={(e) => updateBranding({ logoOpacity: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Portada e Intro Settings con Efectos Visuales y Selector de Logo */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Portada Inicial (Intro Dinámica)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    Efecto Visual & Logo
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Animación de apertura durante un par de segundos con logo y texto personalizados.
                </p>
              </div>
              <input
                type="checkbox"
                checked={branding.includeIntro}
                onChange={(e) => updateBranding({ includeIntro: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {branding.includeIntro && (
              <div className="space-y-4 pt-1 text-xs">
                {/* 5.1 Selector de Logo para la Intro */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Logo de la Intro:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => introLogoInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Upload className="w-3 h-3 text-amber-400" />
                        <span>Subir logo propio</span>
                      </button>
                      <input
                        ref={introLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIntroLogoFileChange}
                      />
                      {branding.introLogoUrl && (
                        <button
                          type="button"
                          onClick={() => updateBranding({ introLogoUrl: undefined })}
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo activo y galería de presets */}
                  <div className="flex items-center gap-3">
                    <img
                      src={branding.introLogoUrl || branding.logoUrl || DEFAULT_LOGO_BASE64}
                      alt="Logo Intro"
                      className="w-12 h-12 rounded-xl bg-slate-900 border border-amber-500/40 p-1 object-contain shrink-0 shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 mb-1">
                        Elige un preset o usa tu imagen:
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {LOGO_PRESETS.map((preset) => {
                          const isSelected = (branding.introLogoUrl || branding.logoUrl) === preset.svgDataUrl;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => updateBranding({ introLogoUrl: preset.svgDataUrl })}
                              className={`px-2 py-1 rounded-lg border text-[11px] shrink-0 flex items-center gap-1 transition-all ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title={preset.description}
                            >
                              <span>{preset.icon}</span>
                              <span className="truncate max-w-[100px]">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5.2 Textos de la Intro */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Título Principal de la Intro:
                    </label>
                    <input
                      type="text"
                      value={branding.introTitle}
                      onChange={(e) => updateBranding({ introTitle: e.target.value })}
                      placeholder="Título introductorio impactante..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Subtítulo o Frase de Apertura:
                    </label>
                    <input
                      type="text"
                      value={branding.introSubtitle}
                      onChange={(e) => updateBranding({ introSubtitle: e.target.value })}
                      placeholder="Subtítulo complementario del episodio..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                {/* 5.3 Selector de Efecto Visual Introductorio */}
                <div>
                  <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Efecto Visual Introductorio:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {INTRO_ANIMATIONS.map((anim) => {
                      const isSelected = (branding.introAnimation || 'cinematic-zoom') === anim.id;
                      return (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => updateBranding({ introAnimation: anim.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-white">{anim.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-amber-400">
                              {anim.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {anim.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5.4 Duración y Sonido SFX de Intro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Duración */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Duración del Efecto</span>
                      <span className="font-mono text-amber-400 font-bold">{branding.introDuration || 3.5} seg</span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={6.0}
                      step={0.5}
                      value={branding.introDuration || 3.5}
                      onChange={(e) => updateBranding({ introDuration: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Sonido SFX */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Efecto Sonoro (SFX)</span>
                      <button
                        type="button"
                        onClick={() => testSfx(branding.introSfx || 'rise')}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Probar
                      </button>
                    </div>
                    <select
                      value={branding.introSfx || 'rise'}
                      onChange={(e) => updateBranding({ introSfx: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {INTRO_SFX_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botón Previsualizar Intro en Vivo */}
                <button
                  type="button"
                  onClick={playIntroPreview}
                  disabled={isPlayingIntroPreview}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <PlayCircle className={`w-4 h-4 ${isPlayingIntroPreview ? 'animate-spin' : ''}`} />
                  <span>
                    {isPlayingIntroPreview
                      ? 'Reproduciendo animación de Intro...'
                      : `▶️ Previsualizar Intro en Vivo (${branding.introDuration || 3.5} seg)`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 5.5 Post-Intro Animada: Animación del Título del Artículo */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Post-Intro Animada (Título del Artículo)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Modo Animación
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Carga en modo animación cinematográfica el título de cada artículo tras la introducción.
                </p>
              </div>
              <input
                type="checkbox"
                checked={branding.includePostIntro !== false}
                onChange={(e) => updateBranding({ includePostIntro: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {branding.includePostIntro !== false && (
              <div className="space-y-4 pt-1 text-xs">
                {/* Título y Subtítulo de la Post-Intro */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Título Principal del Artículo:
                    </label>
                    <input
                      type="text"
                      value={branding.introTitle || script.episode_title}
                      onChange={(e) => updateBranding({ introTitle: e.target.value })}
                      placeholder="Kismet:"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Subtítulo del Artículo (Acento Verde):
                    </label>
                    <input
                      type="text"
                      value={branding.introSubtitle || ''}
                      onChange={(e) => updateBranding({ introSubtitle: e.target.value })}
                      placeholder="escuchar sin transmitir, y ver mucho más que solo WiFi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Categoría / Etiqueta de Cabecera:
                    </label>
                    <input
                      type="text"
                      value={branding.articleCategory || 'Redes inalámbricas | unfantasmaenelsistema.com'}
                      onChange={(e) => updateBranding({ articleCategory: e.target.value })}
                      placeholder="Redes inalámbricas | unfantasmaenelsistema.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Selector de Estilo de Animación Cinemática de la Post-Intro */}
                <div>
                  <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estilo de Animación Cinemática:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'anamorphic-flare', name: 'Optical Flare & Laser', icon: '✨', desc: 'Destello anamórfico, haz láser y partículas' },
                      { id: 'cyberpunk-hud', name: 'Cyberpunk HUD Grid', icon: '⚡', desc: 'Retícula táctica militar y esquinas de enfoque' },
                      { id: 'kinetic-bold', name: 'Kinetic 3D Zoom', icon: '🎬', desc: 'Tipografía elástica en 3D y espectro sonoro' },
                    ].map((style) => {
                      const isSelected = (branding.postIntroAnimation || 'anamorphic-flare') === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => updateBranding({ postIntroAnimation: style.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/40'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-0.5">
                            <span>{style.icon}</span>
                            <span>{style.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {style.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duración de la Post-Intro */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>Duración de la Post-Intro Animada</span>
                    <span className="font-mono text-emerald-400 font-bold">{branding.postIntroDuration || 3.5} seg</span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={5.5}
                    step={0.5}
                    value={branding.postIntroDuration || 3.5}
                    onChange={(e) => updateBranding({ postIntroDuration: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Botón Previsualizar Post-Intro en Vivo */}
                <button
                  type="button"
                  onClick={playPostIntroPreview}
                  disabled={isPlayingPostIntroPreview}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <PlayCircle className={`w-4 h-4 ${isPlayingPostIntroPreview ? 'animate-spin' : ''}`} />
                  <span>
                    {isPlayingPostIntroPreview
                      ? 'Reproduciendo animación cinematográfica...'
                      : `▶️ Previsualizar Post-Intro Cinemática (${branding.postIntroDuration || 3.5} seg)`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Fin / Outro Settings con Efectos Visuales y Personalización */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Pantalla Final (Outro / Cierre)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                    CTA & Despedida
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Pantalla de cierre personalizada con llamadas a la acción, enlaces y efecto visual de despedida.
                </p>
              </div>
              <input
                type="checkbox"
                checked={branding.includeOutro}
                onChange={(e) => updateBranding({ includeOutro: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {branding.includeOutro && (
              <div className="space-y-4 pt-1 text-xs">
                {/* 6.1 Selector de Logo de Cierre */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Logo / Emblema de Cierre:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => outroLogoInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Upload className="w-3 h-3 text-blue-400" />
                        <span>Subir imagen</span>
                      </button>
                      <input
                        ref={outroLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOutroLogoFileChange}
                      />
                      {branding.outroLogoUrl && (
                        <button
                          type="button"
                          onClick={() => updateBranding({ outroLogoUrl: undefined })}
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={branding.outroLogoUrl || branding.logoUrl || DEFAULT_LOGO_BASE64}
                      alt="Logo Outro"
                      className="w-12 h-12 rounded-xl bg-slate-900 border border-blue-500/40 p-1 object-contain shrink-0 shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 mb-1">
                        Elige un emblema de despedida:
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {LOGO_PRESETS.map((preset) => {
                          const isSelected = (branding.outroLogoUrl || branding.logoUrl) === preset.svgDataUrl;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => updateBranding({ outroLogoUrl: preset.svgDataUrl })}
                              className={`px-2 py-1 rounded-lg border text-[11px] shrink-0 flex items-center gap-1 transition-all ${
                                isSelected
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title={preset.description}
                            >
                              <span>{preset.icon}</span>
                              <span className="truncate max-w-[100px]">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6.2 Textos y Call to Action de Cierre */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Título de Despedida:
                      </label>
                      <input
                        type="text"
                        value={branding.outroTitle}
                        onChange={(e) => updateBranding({ outroTitle: e.target.value })}
                        placeholder="¡Gracias por escucharnos!"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Subtítulo / Agradecimiento:
                      </label>
                      <input
                        type="text"
                        value={branding.outroSubtitle}
                        onChange={(e) => updateBranding({ outroSubtitle: e.target.value })}
                        placeholder="Suscríbete y activa la campanita..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Botón de Llamada a la Acción (CTA):
                      </label>
                      <input
                        type="text"
                        value={branding.outroCallToAction || '▶ SUSCRÍBETE AL CANAL'}
                        onChange={(e) => updateBranding({ outroCallToAction: e.target.value })}
                        placeholder="▶ SUSCRÍBETE AL CANAL"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 focus:outline-none focus:border-rose-500 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Enlace a Web o Redes:
                      </label>
                      <input
                        type="text"
                        value={branding.websiteUrl}
                        onChange={(e) => updateBranding({ websiteUrl: e.target.value })}
                        placeholder="https://www.unfantasmaenelsistema.com/"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 6.3 Selector de Efecto Visual de Cierre */}
                <div>
                  <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Efecto Visual de Cierre:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OUTRO_ANIMATIONS.map((anim) => {
                      const isSelected = (branding.outroAnimation || 'fade-zoom-out') === anim.id;
                      return (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => updateBranding({ outroAnimation: anim.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-white">{anim.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-blue-300">
                              {anim.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {anim.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6.4 Duración y Sonido SFX de Cierre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Duración */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Duración del Cierre</span>
                      <span className="font-mono text-blue-400 font-bold">{branding.outroDuration || 3.5} seg</span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={6.0}
                      step={0.5}
                      value={branding.outroDuration || 3.5}
                      onChange={(e) => updateBranding({ outroDuration: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Sonido SFX de Cierre */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>Efecto Sonoro de Cierre</span>
                      <button
                        type="button"
                        onClick={() => testSfx(branding.outroSfx || 'gong-peaceful')}
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Probar
                      </button>
                    </div>
                    <select
                      value={branding.outroSfx || 'gong-peaceful'}
                      onChange={(e) => updateBranding({ outroSfx: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {OUTRO_SFX_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botón Previsualizar Cierre en Vivo */}
                <button
                  type="button"
                  onClick={playOutroPreview}
                  disabled={isPlayingOutroPreview}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  <PlayCircle className={`w-4 h-4 ${isPlayingOutroPreview ? 'animate-spin' : ''}`} />
                  <span>
                    {isPlayingOutroPreview
                      ? 'Reproduciendo animación de Cierre...'
                      : `▶️ Previsualizar Cierre en Vivo (${branding.outroDuration || 3.5} seg)`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 7. Export Action Card */}
          <div ref={exportPanelRef} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>Exportación de Vídeo Final ({settings.aspectRatio})</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Exporta con música BGM, auto-ducking, fondos anime, tablas y comandos
                </p>
              </div>
            </div>

            {/* Selector de Modo de Exportación */}
            {!isExporting && (
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setExportMode('teaser')}
                  className={`py-2 px-2.5 rounded-lg font-bold flex flex-col items-center transition-all ${
                    exportMode === 'teaser'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1">⚡ Resumen Dinámico</span>
                  <span className="text-[10px] font-normal opacity-80">(~20-25s • Rápido)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode('full')}
                  className={`py-2 px-2.5 rounded-lg font-bold flex flex-col items-center transition-all ${
                    exportMode === 'full'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1">🎬 Episodio Completo</span>
                  <span className="text-[10px] font-normal opacity-80">(voces completas • para YouTube)</span>
                </button>
              </div>
            )}

            {isExporting && (
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950 border border-amber-500/30">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-amber-400 font-bold truncate max-w-[220px]">
                    {exportStageDescription || 'Compilando vídeo...'}
                  </span>
                  <span className="text-white font-black">{exportProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    style={{ width: `${exportProgress}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 transition-all duration-150"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Modo: {exportMode === 'teaser' ? 'Resumen (2.2s/diapo)' : 'Completo (duración real de cada voz)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      exportCancelRef.current = true;
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline"
                  >
                    Cancelar Exportación
                  </button>
                </div>
              </div>
            )}

            {isExporting && (
              <p className="text-[10px] text-slate-400 leading-snug">
                La grabación es en tiempo real: un episodio de 8 minutos tarda unos 8 minutos. Mantén esta pestaña visible
                hasta que termine; si la ocultas, el navegador ralentiza la grabación.
              </p>
            )}

            {exportError && !isExporting && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-[11px] flex items-start gap-2">
                <span className="flex-1 break-words">{exportError}</span>
                <button
                  type="button"
                  onClick={() => setExportError(null)}
                  className="px-1.5 text-rose-300 hover:text-white shrink-0"
                  title="Cerrar aviso"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleExportVideo(exportMode)}
                disabled={isExporting}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Grabando ({exportProgress}%)...
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 fill-slate-950" />
                    {exportMode === 'teaser' ? 'Compilar Resumen Rápido (.mp4)' : 'Compilar Episodio Completo (.mp4)'}
                  </>
                )}
              </button>
            </div>

            {/* Opción Alternativa: Exportar Paquete Local de Python con Todos los Assets */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                onClick={handleExportPythonBundle}
                disabled={isExportingPythonBundle || isExporting}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
              >
                {isExportingPythonBundle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{pythonBundleNotice || 'Auditando y empaquetando assets...'}</span>
                  </>
                ) : (
                  <>
                    <FolderDown className="w-4 h-4 text-amber-400" />
                    <span>📦 Exportar Paquete Python con Assets (.ZIP)</span>
                  </>
                )}
              </button>

              {pythonBundleNotice && !isExportingPythonBundle && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] font-mono flex items-center gap-2 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{pythonBundleNotice}</span>
                </div>
              )}
            </div>

            {exportedVideoUrl && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  ¡Vídeo completo compilado con éxito!
                </div>
                <video src={exportedVideoUrl} controls className="w-full rounded-lg border border-slate-800 bg-black max-h-[220px]" />
                <a
                  href={exportedVideoUrl}
                  download={`${videoFileSlug}_${settings.aspectRatio === '9:16' ? 'shorts' : 'youtube'}.${exportedVideoExt}`}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar Vídeo Completo (.{exportedVideoExt})
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modales Integrados */}
      <YouTubeMetadataModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        script={script}
        hostA={hostA}
        hostB={hostB}
        branding={branding}
        timeline={lastTimeline}
      />

      <ShortsClipModal
        isOpen={isShortsModalOpen}
        onClose={() => setIsShortsModalOpen(false)}
        script={script}
        hostA={hostA}
        hostB={hostB}
        branding={branding}
      />
    </div>
  );
};
