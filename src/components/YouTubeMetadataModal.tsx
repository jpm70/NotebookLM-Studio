import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Share2,
  Clock,
  Tag,
  FileText,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { HostConfig, PodcastScript, VideoBrandingSettings } from '../types';
import { getStoredApiKey } from '../services/apiKeyStorage';

interface YouTubeMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: PodcastScript;
  hostA: HostConfig;
  hostB: HostConfig;
  branding: VideoBrandingSettings;
}

export const YouTubeMetadataModal: React.FC<YouTubeMetadataModalProps> = ({
  isOpen,
  onClose,
  script,
  hostA,
  hostB,
  branding,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState(script.episode_title);
  const [description, setDescription] = useState('');
  const [chapters, setChapters] = useState<{ timestamp: string; title: string; speaker: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Generar marcas de tiempo inmediatas basadas en los turnos
    let currentSeconds = branding.includeIntro ? (branding.introDuration || 3) : 0;
    const computedChapters: { timestamp: string; title: string; speaker: string }[] = [
      { timestamp: '00:00', title: 'Introducción y Apertura', speaker: hostA.name },
    ];

    (script.turns || []).forEach((t, i) => {
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      computedChapters.push({
        timestamp: timeStr,
        title: t.visual_title || `Turno ${i + 1}: ${t.speaker === 'Host_A' ? hostA.name : hostB.name}`,
        speaker: t.speaker === 'Host_A' ? hostA.name : hostB.name,
      });
      const approxDuration = Math.max(6, Math.ceil(t.text.length / 17));
      currentSeconds += approxDuration + 1;
    });

    if (branding.includeOutro) {
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      computedChapters.push({
        timestamp: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        title: 'Conclusiones y Cierre',
        speaker: 'Ambos',
      });
    }

    setChapters(computedChapters);

    // Valores por defecto
    setTitles([
      `¿Es este el FUTURO? ${script.episode_title}`,
      `${script.episode_title} | Debate en Profundidad (NotebookLM Audio)`,
      `La Verdad sobre ${script.episode_title} que Nadie te Está Contando`,
    ]);
    setSelectedTitle(script.episode_title);

    // Formatear descripción inicial con capítulos
    const chapterText = computedChapters.map((c) => `${c.timestamp} - ${c.title}`).join('\n');
    const fullDesc = `${script.episode_summary}\n\n` +
      `⏱️ MARCAS DE TIEMPO / CAPÍTULOS:\n${chapterText}\n\n` +
      `🎙️ Locutores:\n` +
      `- ${hostA.name}: ${hostA.role} (${hostA.tone})\n` +
      `- ${hostB.name}: ${hostB.role} (${hostB.tone})\n\n` +
      `🔗 Canal Oficial y Recursos:\n` +
      `Sitio web: ${branding.websiteUrl || 'https://www.unfantasmaenelsistema.com/'}\n` +
      `Generado con NotebookLM Studio Video Generator\n\n` +
      `#Podcast #NotebookLM #IA #Tecnologia #UnFantasmaEnElSistema`;

    setDescription(fullDesc);
    setTags([
      'podcast',
      'notebooklm',
      'inteligencia artificial',
      'tecnologia',
      'un fantasma en el sistema',
      'debate',
      'resumen',
      'audio overview',
      'gemini',
      hostA.name.toLowerCase(),
      hostB.name.toLowerCase(),
    ]);

    // Redibujar la miniatura en el canvas
    setTimeout(drawThumbnail, 100);
  }, [isOpen, script]);

  // Generar con Gemini AI SEO Kit
  const handleGenerateAiSeo = async () => {
    try {
      setIsLoading(true);
      const apiKey = getStoredApiKey() || undefined;

      const response = await fetch('/api/generate-youtube-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeTitle: script.episode_title,
          episodeSummary: script.episode_summary,
          turns: script.turns,
          clientApiKey: apiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.titles && Array.isArray(data.titles)) {
          setTitles(data.titles);
          setSelectedTitle(data.titles[0]);
        }
        if (data.description) {
          setDescription(data.description);
        }
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags);
        }
        setTimeout(drawThumbnail, 100);
      }
    } catch (e) {
      console.error('Error generando SEO:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const drawThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1280;
    const h = 720;
    canvas.width = w;
    canvas.height = h;

    // Fondo degradado profundo
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Resplandor cálido
    ctx.save();
    ctx.filter = 'blur(120px)';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.45, 320, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Badge de encabezado
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🎙️ UN FANTASMA EN EL SISTEMA', 80, 110);

    // Título de la miniatura de alto impacto
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Plus Jakarta Sans", sans-serif';
    const words = selectedTitle.split(' ');
    const lines: string[] = [];
    let curLine = '';
    for (const wd of words) {
      if ((curLine + ' ' + wd).trim().length <= 28) {
        curLine = (curLine + ' ' + wd).trim();
      } else {
        if (curLine) lines.push(curLine);
        curLine = wd;
      }
    }
    if (curLine) lines.push(curLine);

    let startY = 190;
    lines.slice(0, 3).forEach((line) => {
      // Sombra oscura
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 12;
      ctx.fillText(line, 80, startY);
      startY += 65;
    });
    ctx.shadowBlur = 0;

    // Badge inferior "NOTEBOOKLM AUDIO"
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(80, startY + 20, 360, 48, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('▶ DEBATE COMPLETO EN ESPAÑOL', 105, startY + 52);

    // Avatares a la derecha
    const drawThumbAvatar = (x: number, y: number, name: string, color: string, letter: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 95, 0, Math.PI * 2);
      ctx.fillStyle = color === '#3b82f6' ? '#1e3a8a' : '#78350f';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 75px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, x, y);

      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(name, x, y + 130);
      ctx.restore();
    };

    drawThumbAvatar(w - 380, h * 0.48, hostA.name, '#3b82f6', hostA.name[0]);
    drawThumbAvatar(w - 180, h * 0.54, hostB.name, '#f59e0b', hostB.name[0]);

    // Logo o marca de agua en la esquina superior derecha
    if (branding.logoUrl) {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = branding.logoUrl;
      logoImg.onload = () => {
        ctx.drawImage(logoImg, w - 160, 50, 90, 90);
      };
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `miniatura_youtube_${selectedTitle.replace(/\s+/g, '_').substring(0, 30)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 sm:p-8 max-h-[92vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold">
              YT
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Kit de Publicación y SEO para YouTube
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Canal: Un Fantasma en el Sistema
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Capítulos automáticos, títulos de alto CTR, descripción y miniatura oficial 1280x720.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiSeo}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Optimizando con Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimizar SEO con IA</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto space-y-6 pt-5 pr-1">
          {/* 1. Títulos recomendados (CTR) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Títulos de Alto Impacto / CTR Recomendados:</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {titles.map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedTitle(t);
                    setTimeout(drawThumbnail, 50);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedTitle === t
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold">{t}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(t, `title_${idx}`);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-amber-400 transition-colors"
                      title="Copiar título"
                    >
                      {copiedKey === `title_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Miniatura 1280x720 */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-500" />
                <span>Miniatura de YouTube (1280x720 HD)</span>
              </label>
              <button
                type="button"
                onClick={downloadThumbnail}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Miniatura (.PNG)</span>
              </button>
            </div>
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-black flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* 3. Marcas de tiempo de capítulos */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Capítulos Sincronizados de YouTube ({chapters.length}):</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(chapters.map((c) => `${c.timestamp} - ${c.title}`).join('\n'), 'chapters')
                }
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-300 flex items-center gap-1"
              >
                {copiedKey === 'chapters' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copiar Capítulos</span>
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {chapters.map((chap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-amber-400 font-bold">{chap.timestamp}</span>
                    <span className="text-slate-200">{chap.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">[{chap.speaker}]</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Descripción completa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Descripción para la Caja de YouTube:</span>
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(description, 'desc')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 hover:border-slate-700"
              >
                {copiedKey === 'desc' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copiar Descripción</span>
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
            />
          </div>

          {/* 5. Etiquetas SEO (Tags) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-400" />
                <span>Etiquetas SEO (Tags):</span>
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(tags.join(', '), 'tags')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 hover:border-slate-700"
              >
                {copiedKey === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Tags</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/50 text-[11px] text-purple-300 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
