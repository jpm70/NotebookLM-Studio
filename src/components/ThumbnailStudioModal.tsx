import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Sparkles,
  Eye,
  Type,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Flame,
  Zap,
  Sliders,
  Palette,
} from 'lucide-react';
import { DialogueTurn, HostConfig, PodcastScript, StudioSettings } from '../types';
import { DEFAULT_LOGO_BASE64 } from '../assets/logoData';

interface ThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: PodcastScript;
  hostA: HostConfig;
  hostB: HostConfig;
  settings: StudioSettings;
}

export const ThumbnailStudioModal: React.FC<ThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  script,
  hostA,
  hostB,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estados de diseño de la miniatura
  const [layoutMode, setLayoutMode] = useState<'duel' | 'concept' | 'anime' | 'chalkboard'>('duel');
  const [hookTitle, setHookTitle] = useState(
    script?.episode_title ? `¿EL FIN DE TODO? ${script.episode_title.slice(0, 35).toUpperCase()}` : 'EL DEBATE DEFINITIVO'
  );
  const [subtitleKicker, setSubtitleKicker] = useState('UN FANTASMA EN EL SISTEMA');
  const [badgeText, setBadgeText] = useState('🔥 DEBATE EXCLUSIVO');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [showHosts, setShowHosts] = useState(true);
  const [showVs, setShowVs] = useState(true);

  // Renderizar miniatura en canvas de 1280x720
  const drawThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1280;
    const h = 720;
    canvas.width = w;
    canvas.height = h;

    // 1. Fondos según el estilo visual
    if (layoutMode === 'anime') {
      // Fondo anime cinético
      const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#3b0764');
      grad.addColorStop(0.5, '#1e0836');
      grad.addColorStop(1, '#090117');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Líneas cinéticas de velocidad estilo manga
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.15)';
      ctx.lineWidth = 2.5;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(angle) * 160, h / 2 + Math.sin(angle) * 160);
        ctx.lineTo(w / 2 + Math.cos(angle) * 800, h / 2 + Math.sin(angle) * 800);
        ctx.stroke();
      }
    } else if (layoutMode === 'chalkboard') {
      // Pizarra académica oscura
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f241d');
      grad.addColorStop(0.5, '#132e25');
      grad.addColorStop(1, '#0a1713');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Rejilla técnica de tiza
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (layoutMode === 'concept') {
      // Fondo conceptual cinemático con imagen de turno si existe
      const bgImgUrl = settings?.branding?.turnBackgroundImages?.[0];
      if (bgImgUrl) {
        const img = new Image();
        img.src = bgImgUrl;
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0, w, h);
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Viñeta oscura de alto contraste
      const vignette = ctx.createLinearGradient(0, 0, 0, h);
      vignette.addColorStop(0, 'rgba(2, 6, 23, 0.75)');
      vignette.addColorStop(0.5, 'rgba(2, 6, 23, 0.45)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Modo Duelo (Predeterminado - Alto CTR YouTube)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#030712');
      grad.addColorStop(0.45, '#0f172a');
      grad.addColorStop(0.55, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Resplandor dividido: Azul en la izquierda, Ámbar en la derecha
      const leftGlow = ctx.createRadialGradient(250, 360, 40, 250, 360, 420);
      leftGlow.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
      leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, w / 2, h);

      const rightGlow = ctx.createRadialGradient(w - 250, 360, 40, w - 250, 360, 420);
      rightGlow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(w / 2, 0, w / 2, h);
    }

    // 2. Dibujar Avatares de Locutores si está activado
    if (showHosts && layoutMode === 'duel') {
      // Locutor A (Izquierda)
      ctx.save();
      ctx.beginPath();
      ctx.arc(260, 440, 140, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#60a5fa';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 110px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hostA.name[0] || 'A', 260, 440);

      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(hostA.name.toUpperCase(), 260, 615);
      ctx.restore();

      // Locutor B (Derecha)
      ctx.save();
      ctx.beginPath();
      ctx.arc(w - 260, 440, 140, 0, Math.PI * 2);
      ctx.fillStyle = '#78350f';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 110px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hostB.name[0] || 'B', w - 260, 440);

      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(hostB.name.toUpperCase(), w - 260, 615);
      ctx.restore();

      // Emblema "VS" Central enérgico
      if (showVs) {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(w / 2, 440, 56, 0, Math.PI * 2);
        ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
        ctx.shadowBlur = 30;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', w / 2, 442);
        ctx.restore();
      }
    }

    // 3. Badge Kicker Superior
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Badge de categoría o canal
    const badgeY = 65;
    ctx.fillStyle = accentColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 220, badgeY - 24, 440, 48, 24);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(badgeText.toUpperCase(), w / 2, badgeY + 1);
    ctx.restore();

    // 4. Título Gancho Masivo de Alto CTR (Tipografía extrabold con borde y sombra)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = hookTitle.split(' ');
    const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

    const titleFontSize = 66;
    ctx.font = `900 ${titleFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;

    const renderHookLine = (text: string, yPos: number, isAccentLine = false) => {
      // Trazo exterior negro para legibilidad
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 24;
      ctx.strokeText(text, w / 2, yPos);

      // Relleno interior
      ctx.fillStyle = isAccentLine ? accentColor : '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(text, w / 2, yPos);
    };

    if (line2) {
      renderHookLine(line1, 160, false);
      renderHookLine(line2, 235, true);
    } else {
      renderHookLine(line1, 185, true);
    }

    ctx.restore();

    // 5. Marca de agua de canal inferior
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(`🎙️ ${subtitleKicker} • YOUTUBE SPECIAL`, w / 2, h - 35);
    ctx.restore();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawThumbnail, 50);
    }
  }, [isOpen, layoutMode, hookTitle, subtitleKicker, badgeText, accentColor, showHosts, showVs]);

  const handleDownloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `miniatura-youtube-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">
              <Flame className="w-5 h-5 fill-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Generador & Editor Visual de Miniaturas (YouTube CTR)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 font-mono font-bold">
                  1280 × 720 HD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diseña portadas de alto impacto visual para maximizar el porcentaje de clics en YouTube y redes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Viewport + Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Canvas Viewport (Cols 1-7) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-3">
            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950">
              <canvas ref={canvasRef} className="w-full h-full object-contain block bg-slate-950" />
            </div>

            <button
              type="button"
              onClick={handleDownloadThumbnail}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Miniatura en Alta Definición (PNG)</span>
            </button>
          </div>

          {/* Controls (Cols 8-12) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Selector de Estilo de Miniatura */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block">
                Composición de Miniatura:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'duel', label: '⚔️ Duelo Locutores' },
                  { id: 'concept', label: '🎬 Cine Conceptual' },
                  { id: 'anime', label: '⚡ Estilo Anime' },
                  { id: 'chalkboard', label: '✏️ Pizarra Técnica' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLayoutMode(m.id as any)}
                    className={`py-2 px-2.5 rounded-lg border text-left font-semibold transition-all ${
                      layoutMode === m.id
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Textos del Título Gancho */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Título Gancho (Clickbait Limpio / CTR):
                </label>
                <textarea
                  rows={2}
                  value={hookTitle}
                  onChange={(e) => setHookTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-bold uppercase focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Insignia / Badge Superior:
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Firma / Canal:
                </label>
                <input
                  type="text"
                  value={subtitleKicker}
                  onChange={(e) => setSubtitleKicker(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>

            {/* 3. Colores y Opciones Visuales */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Color de Acento / Resalte:
                </label>
                <div className="flex items-center gap-2">
                  {['#f59e0b', '#ef4444', '#06b6d4', '#d946ef', '#10b981'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        accentColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {layoutMode === 'duel' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="text-slate-300 font-medium">Mostrar emblema VS:</label>
                  <input
                    type="checkbox"
                    checked={showVs}
                    onChange={(e) => setShowVs(e.target.checked)}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
