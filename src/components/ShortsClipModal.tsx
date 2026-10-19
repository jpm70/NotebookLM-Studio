import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Smartphone,
  Sparkles,
  Flame,
  Loader2,
  CheckCircle,
  Volume2,
} from 'lucide-react';
import { HostConfig, PodcastScript, VideoBrandingSettings } from '../types';
import { VideoRenderer } from '../services/videoRenderer';
import { browserTTS } from '../services/ttsService';

interface ShortsClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: PodcastScript;
  hostA: HostConfig;
  hostB: HostConfig;
  branding: VideoBrandingSettings;
}

export const ShortsClipModal: React.FC<ShortsClipModalProps> = ({
  isOpen,
  onClose,
  script,
  hostA,
  hostB,
  branding,
}) => {
  const [selectedTurnIndex, setSelectedTurnIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRenderingClip, setIsRenderingClip] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Seleccionar automáticamente el turno con mayor longitud o el más revelador
  useEffect(() => {
    if (!isOpen || !script.turns?.length) return;

    let longestIdx = 0;
    let maxLen = 0;
    script.turns.forEach((t, i) => {
      if (t.text.length > maxLen) {
        maxLen = t.text.length;
        longestIdx = i;
      }
    });
    setSelectedTurnIndex(longestIdx);
    setDownloadUrl(null);
  }, [isOpen, script]);

  // Inicializar canvas y renderer en 9:16
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new VideoRenderer(canvas);
    renderer.preloadImages(branding.logoUrl, branding.introCoverUrl);
    renderer.preloadTurnBackgrounds(branding.turnBackgroundImages);
    renderer.resize('9:16', '720p');
    rendererRef.current = renderer;

    drawCurrentFrame(0, 0.5);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      browserTTS.stop();
    };
  }, [isOpen, selectedTurnIndex, branding]);

  const drawCurrentFrame = (time: number, turnProgress = 0.5) => {
    if (!rendererRef.current || !canvasRef.current) return;
    const currentTurn = script.turns[selectedTurnIndex];
    if (!currentTurn) return;

    rendererRef.current.drawFrame(
      time,
      currentTurn,
      selectedTurnIndex,
      script.turns.length,
      hostA,
      hostB,
      currentTurn.visual_title || script.episode_title,
      '9:16',
      isPlaying,
      {
        ...branding,
        subtitleStyle: 'karaoke', // Karaoke obligatorio en Shorts para dinamismo
      },
      'dialogue',
      turnProgress
    );
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      browserTTS.stop();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const currentTurn = script.turns[selectedTurnIndex];
    if (!currentTurn) return;

    setIsPlaying(true);
    startTimeRef.current = performance.now();

    const loop = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const approxDuration = Math.max(4, currentTurn.text.length / 15);
      const progress = Math.min(1, elapsed / approxDuration);

      drawCurrentFrame(elapsed, progress);

      if (elapsed < approxDuration && isPlaying) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else if (elapsed >= approxDuration) {
        setIsPlaying(false);
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);

    await browserTTS.playTurnBrowser(currentTurn, hostA, hostB, 'Español de España');
    setIsPlaying(false);
  };

  const handleRenderShort = async () => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    const currentTurn = script.turns[selectedTurnIndex];
    if (!canvas || !renderer || !currentTurn) return;

    setIsRenderingClip(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    const stream = canvas.captureStream(24);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
      videoBitsPerSecond: 3000000,
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsRenderingClip(false);
      setRenderProgress(100);
    };

    mediaRecorder.start();

    const durationSec = Math.max(5, Math.ceil(currentTurn.text.length / 14));
    const totalFrames = durationSec * 24;
    let frame = 0;

    const renderLoop = () => {
      const t = frame / 24;
      const progress = t / durationSec;
      renderer.drawFrame(
        t,
        currentTurn,
        selectedTurnIndex,
        script.turns.length,
        hostA,
        hostB,
        currentTurn.visual_title,
        '9:16',
        true,
        { ...branding, subtitleStyle: 'karaoke' },
        'dialogue',
        progress
      );

      frame++;
      setRenderProgress(Math.round((frame / totalFrames) * 100));

      if (frame < totalFrames) {
        setTimeout(renderLoop, 1000 / 30);
      } else {
        mediaRecorder.stop();
      }
    };

    renderLoop();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 max-h-[92vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Exportador de Clips Verticales (9:16)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  YouTube Shorts • Reels • TikTok
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Subtítulos dinámicos de alto impacto, formato vertical nativo 720x1280 y avatares enfrentados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Canvas Preview 9:16 */}
          <div className="flex flex-col items-center">
            <div className="w-[240px] sm:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black relative">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              {isRenderingClip && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                  <p className="text-xs font-bold text-white">Renderizando Short ({renderProgress}%)...</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-150"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isRenderingClip}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'Pausar Prueba' : 'Previsualizar Audio'}</span>
              </button>
            </div>
          </div>

          {/* Controls & Turn Picker */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Seleccionar Turno / Momento Clave del Episodio:</span>
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {script.turns.map((turn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedTurnIndex(idx);
                      setDownloadUrl(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedTurnIndex === idx
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-amber-400">
                        Turno #{idx + 1} • {turn.speaker === 'Host_A' ? hostA.name : hostB.name}
                      </span>
                      <span className="text-[10px] text-slate-400 italic">[{turn.emotion}]</span>
                    </div>
                    <p className="text-xs line-clamp-2 text-slate-300">{turn.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-200">Exportar Clip Vertical Listo:</div>
              <p className="text-[11px] text-slate-400">
                Renderiza en segundos con los subtítulos Karaoke sincronizados, ideal para publicar como gancho en redes.
              </p>

              {!downloadUrl ? (
                <button
                  type="button"
                  onClick={handleRenderShort}
                  disabled={isRenderingClip}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isRenderingClip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generando Clip ({renderProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Renderizar Vídeo Short (9:16)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>¡Clip vertical renderizado con éxito!</span>
                  </div>
                  <a
                    href={downloadUrl}
                    download={`short_turno_${selectedTurnIndex + 1}.webm`}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Vídeo Short (.WebM / MP4)</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
