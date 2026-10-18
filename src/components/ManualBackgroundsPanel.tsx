import React, { useRef, useState } from 'react';
import { Check, Copy, Download, Trash2, Upload, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { DialogueTurn } from '../types';
import {
  AnimeMood,
  BackgroundStyle,
  assignUploadsToSlides,
  buildManualPrompt,
  buildManualPromptList,
  fileToSlideImage,
} from '../services/imageService';

interface ManualBackgroundsPanelProps {
  turns: DialogueTurn[];
  episodeTitle: string;
  style: BackgroundStyle;
  mood: AnimeMood;
  aspectRatio: '16:9' | '9:16';
  backgrounds: Record<number, string>;
  onSetBackground: (index: number, imageUrl: string) => void;
  onRemoveBackground: (index: number) => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Reserva para navegadores sin permiso de portapapeles
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const slideLabel = (t: DialogueTurn) =>
  t.slideType === 'table' || t.tableData ? 'Tabla' : t.slideType === 'terminal' || t.terminalData ? 'Terminal' : 'Contexto';

/**
 * Modo manual: el usuario copia el prompt de cada diapositiva, genera la imagen en la app de
 * Gemini (donde su cuenta sí tiene cuota) y la sube aquí.
 */
export const ManualBackgroundsPanel: React.FC<ManualBackgroundsPanelProps> = ({
  turns,
  episodeTitle,
  style,
  mood,
  aspectRatio,
  backgrounds,
  onSetBackground,
  onRemoveBackground,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | 'all' | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const singleTargetRef = useRef<number>(0);

  const filled = turns.filter((_, i) => backgrounds[i]).length;

  const flashCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const handleCopyOne = async (i: number) => {
    if (await copyText(buildManualPrompt(turns[i], style, mood, aspectRatio, episodeTitle))) flashCopied(`p${i}`);
  };

  const handleCopyAll = async () => {
    if (await copyText(buildManualPromptList(turns, style, mood, aspectRatio, episodeTitle))) flashCopied('all');
  };

  const handleDownloadTxt = () => {
    const text = buildManualPromptList(turns, style, mood, aspectRatio, episodeTitle);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts-fondos.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const loadInto = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) return false;
    onSetBackground(index, await fileToSlideImage(file, aspectRatio));
    return true;
  };

  const handleBulk = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    const occupied = new Set(Object.keys(backgrounds).map(Number));
    const slots = assignUploadsToSlides(
      list.map((f) => f.name),
      turns.length,
      occupied
    );
    let placed = 0;
    const skipped: string[] = [];
    for (let k = 0; k < list.length; k++) {
      const slot = slots[k];
      if (slot === null) {
        skipped.push(list[k].name);
        continue;
      }
      if (await loadInto(slot, list[k])) placed++;
    }
    setNotice(
      `✓ ${placed} ${placed === 1 ? 'imagen colocada' : 'imágenes colocadas'}.` +
        (skipped.length ? ` Sin hueco libre para: ${skipped.join(', ')}.` : '') +
        ' Revisa el orden abajo; puedes cambiar cualquiera con su botón Subir.'
    );
  };

  const openSingle = (i: number) => {
    singleTargetRef.current = i;
    singleInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
        <p>
          <strong className="text-white">1.</strong> Copia el prompt de una diapositiva y pégalo en{' '}
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5"
          >
            Gemini <ExternalLink className="w-3 h-3" />
          </a>{' '}
          (mejor un prompt por mensaje).
        </p>
        <p>
          <strong className="text-white">2.</strong> Descarga la imagen y súbela con el botón <em>Subir</em> de esa diapositiva, o
          arrástrala encima.
        </p>
        <p>
          <strong className="text-white">3.</strong> ¿Varias a la vez? Usa <em>Subir varias</em>: si el archivo se llama{' '}
          <code className="text-amber-300">03.png</code> o <code className="text-amber-300">diapositiva-03.png</code> va a la
          diapositiva 3; si no, rellenan en orden los huecos libres.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyAll}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
        >
          {copied === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
          {copied === 'all' ? 'Copiados' : 'Copiar todos los prompts'}
        </button>
        <button
          type="button"
          onClick={handleDownloadTxt}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-purple-400" />
          Descargar prompts (.txt)
        </button>
        <button
          type="button"
          onClick={() => bulkInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('all');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            handleBulk(e.dataTransfer.files);
          }}
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            dragOver === 'all'
              ? 'bg-purple-500/30 border-purple-400 text-white'
              : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Subir varias
        </button>
        <span className="ml-auto self-center text-[11px] font-mono text-slate-400">
          {filled}/{turns.length} con imagen
        </span>
        <input
          ref={bulkInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleBulk(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={singleInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) await loadInto(singleTargetRef.current, file);
          }}
        />
      </div>

      {notice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-[11px] flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="px-1 text-emerald-300 hover:text-white" title="Cerrar aviso">
            ×
          </button>
        </div>
      )}

      <ol className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {turns.map((t, i) => {
          const img = backgrounds[i];
          const isOpen = expanded === i;
          return (
            <li
              key={i}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(null);
                const file = e.dataTransfer.files?.[0];
                if (file) await loadInto(i, file);
              }}
              className={`p-2.5 rounded-xl border transition-colors ${
                dragOver === i ? 'border-purple-400 bg-purple-500/10' : 'border-slate-800 bg-slate-950/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-20 h-[45px] rounded-md overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                  {img ? (
                    <img src={img} alt={`Fondo de la diapositiva ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">{String(i + 1).padStart(2, '0')}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {String(i + 1).padStart(2, '0')}. {t.sectionTitle || t.visual_title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span>{slideLabel(t)}</span>
                    <span>•</span>
                    {img ? <span className="text-emerald-400">con imagen</span> : <span className="text-amber-400">pendiente</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyOne(i)}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-500/50 text-[10px] font-semibold text-slate-200 flex items-center gap-1 shrink-0"
                  title="Copiar el prompt de esta diapositiva"
                >
                  {copied === `p${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied === `p${i}` ? 'Copiado' : 'Prompt'}
                </button>
                <button
                  type="button"
                  onClick={() => openSingle(i)}
                  className="px-2 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-[10px] font-bold text-white flex items-center gap-1 shrink-0"
                  title="Subir la imagen de esta diapositiva"
                >
                  <Upload className="w-3 h-3" />
                  Subir
                </button>
                {img && (
                  <button
                    type="button"
                    onClick={() => onRemoveBackground(i)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 shrink-0"
                    title="Quitar la imagen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white shrink-0"
                  title={isOpen ? 'Ocultar prompt' : 'Ver prompt'}
                >
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {isOpen && (
                <p className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono leading-relaxed select-all">
                  {buildManualPrompt(t, style, mood, aspectRatio, episodeTitle)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
