/**
 * Galería GhostArt: ilustraciones y GIF propios (https://unfantasmaenelsistema.github.io/GhostArt/).
 * Se lee su manifest.json (lo regenera la Action del repo cuando se sube algo, también desde los repos
 * «almacén»), así que cualquier imagen nueva aparece aquí sin tocar la app.
 */
import { blobToDataUrl, toVideoJpeg } from './imageService';

export const GHOSTART_BASE = 'https://unfantasmaenelsistema.github.io/GhostArt/';

export interface GhostArtItem {
  /** Ruta o URL absoluta de la imagen completa. */
  p: string;
  /** Miniatura. */
  t: string;
  /** Categoría (carpeta). */
  c: string;
  /** Nombre. */
  n: string;
  /** 'gif' para los GIF. */
  k?: string;
  w?: number;
  h?: number;
  d?: string;
}

export const ghostArtUrl = (p: string) => new URL(p, GHOSTART_BASE).href;

let cache: Promise<GhostArtItem[]> | null = null;

export function loadGhostArt(): Promise<GhostArtItem[]> {
  if (!cache) {
    cache = fetch(GHOSTART_BASE + 'manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error(`GhostArt respondió ${r.status}`);
        return r.json();
      })
      .then((m) => m.images as GhostArtItem[])
      .catch((e) => {
        cache = null; // permite reintentar
        throw e;
      });
  }
  return cache;
}

export const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Descarga la imagen y la deja como fondo de diapositiva.
 * - Imagen: JPEG del tamaño del vídeo.
 * - GIF: se conserva tal cual (data URL image/gif); el renderizador decodifica sus fotogramas y lo anima en bucle.
 */
export async function ghostArtToSlideImage(item: GhostArtItem, aspectRatio: '16:9' | '9:16'): Promise<string> {
  const r = await fetch(ghostArtUrl(item.p));
  if (!r.ok) throw new Error(`No se pudo descargar «${item.n}» (${r.status})`);
  const blob = await r.blob();
  if (item.k === 'gif') return blobToDataUrl(blob.type === 'image/gif' ? blob : new Blob([blob], { type: 'image/gif' }));
  const [w, h] = aspectRatio === '9:16' ? [720, 1280] : [1280, 720];
  return toVideoJpeg(await blobToDataUrl(blob), w, h);
}
