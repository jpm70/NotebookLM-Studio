import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { GhostArtItem, ghostArtUrl, loadGhostArt, sinTildes } from '../services/ghostArtService';

interface GhostArtPickerProps {
  /** Cuántas imágenes se pueden elegir como máximo (1 = diapositiva concreta). */
  max: number;
  /** Texto con el que se abre el buscador (p. ej. el título de la diapositiva). */
  initialQuery?: string;
  title?: string;
  onCancel: () => void;
  onPick: (items: GhostArtItem[]) => void;
}

const LOTE = 60;

/** Selector de imágenes y GIF de la galería GhostArt. */
export const GhostArtPicker: React.FC<GhostArtPickerProps> = ({ max, initialQuery = '', title, onCancel, onPick }) => {
  const [items, setItems] = useState<GhostArtItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(initialQuery);
  const [gif, setGif] = useState(false);
  const [cat, setCat] = useState('');
  const [shown, setShown] = useState(LOTE);
  const [sel, setSel] = useState<GhostArtItem[]>([]);

  useEffect(() => {
    loadGhostArt()
      .then(setItems)
      .catch((e) => setError(String(e?.message || e)));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const delTipo = useMemo(() => (items || []).filter((i) => (i.k === 'gif') === gif), [items, gif]);
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    delTipo.forEach((i) => m.set(i.c, (m.get(i.c) || 0) + 1));
    return [...m.entries()].filter(([c]) => c).sort((a, b) => a[0].localeCompare(b[0]));
  }, [delTipo]);
  const lista = useMemo(() => {
    const words = sinTildes(q).split(/[\s,.:;¿?¡!()]+/).filter((w) => w.length >= 3);
    // Cada palabra que coincide suma: lo que las cumple todas sale primero, y el título de una
    // diapositiva (varias palabras) sigue encontrando algo aunque no coincidan todas.
    const puntos = (i: GhostArtItem) => {
      const hay = sinTildes(`${i.n} ${i.c}`).replace(/-/g, ' ');
      return words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
    };
    return delTipo
      .filter((i) => !cat || i.c === cat)
      .map((i) => [i, words.length ? puntos(i) : 0] as [GhostArtItem, number])
      .filter(([, n]) => !words.length || n > 0)
      .sort((a, b) => b[1] - a[1] || (b[0].d || '').localeCompare(a[0].d || '') || a[0].n.localeCompare(b[0].n))
      .map(([i]) => i);
  }, [delTipo, q, cat]);

  useEffect(() => setShown(LOTE), [q, cat, gif]);

  const toggle = (it: GhostArtItem) => {
    if (max === 1) return onPick([it]);
    setSel((s) => (s.includes(it) ? s.filter((x) => x !== it) : s.length < max ? [...s, it] : s));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3" onClick={onCancel}>
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-3 border-b border-slate-800">
          <h3 className="text-sm font-extrabold text-white flex-1">{title || 'Galería GhostArt'}</h3>
          <a
            href="https://unfantasmaenelsistema.github.io/GhostArt/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-amber-400 hover:text-amber-300"
          >
            Abrir galería
          </a>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-white" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-2 border-b border-slate-800">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-purple-500/60">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por tema: phishing, kerberos, wifi…"
                className="flex-1 bg-transparent py-2 text-xs text-white outline-none min-w-0"
              />
            </div>
            {(['Imágenes', 'GIFs'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setGif(l === 'GIFs');
                  setCat('');
                }}
                className={`px-3 rounded-xl text-xs font-bold border ${
                  gif === (l === 'GIFs') ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {([['', delTipo.length], ...cats] as [string, number][]).map(([c, n]) => (
                <button
                  key={c || 'todas'}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`px-2.5 py-1 rounded-full text-[10px] border ${
                    cat === c ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  {c ? c.replace(/-/g, ' ') : 'Todas'} <b className="opacity-60">{n}</b>
                </button>
              ))}
            </div>
          )}
          {gif && (
            <p className="text-[10px] text-amber-300">
              Los GIF se usan como imagen fija (su primer fotograma): el vídeo pinta fondos estáticos.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-[240px]">
          {error && <p className="text-xs text-rose-400">No se pudo cargar la galería: {error}</p>}
          {!items && !error && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando galería…
            </p>
          )}
          {items && !lista.length && <p className="text-xs text-slate-400">No hay resultados.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {lista.slice(0, shown).map((it) => {
              const on = sel.includes(it);
              return (
                <button
                  key={it.p}
                  type="button"
                  onClick={() => toggle(it)}
                  title={it.n.replace(/-/g, ' ')}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 bg-slate-950 ${
                    on ? 'border-purple-400' : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  <img src={ghostArtUrl(it.t)} alt={it.n} loading="lazy" className="w-full h-full object-cover" />
                  {on && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                      {sel.indexOf(it) + 1}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[9px] text-white bg-gradient-to-t from-black/80 to-transparent truncate text-left">
                    {it.n.replace(/-/g, ' ')}
                  </span>
                </button>
              );
            })}
          </div>
          {lista.length > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + LOTE)}
              className="mt-3 w-full py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 hover:border-purple-500/50"
            >
              Mostrar más ({lista.length - shown} restantes)
            </button>
          )}
        </div>

        {max > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center gap-3">
            <span className="text-[11px] text-slate-400 flex-1">
              {sel.length}/{max} elegidas · se colocan en orden en las diapositivas sin imagen
            </span>
            <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl text-xs text-slate-300 bg-slate-950 border border-slate-800">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!sel.length}
              onClick={() => onPick(sel)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Usar {sel.length || ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
