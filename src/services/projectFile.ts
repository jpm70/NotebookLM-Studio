/**
 * Guardar / Abrir proyecto: un .zip con todo el trabajo para retomarlo otro día u otro equipo.
 *
 * project.json  -> texto fuente, guion (con la colocación de cajas), locutores, ajustes y voces
 * assets/NNN.*  -> imágenes y audios que en el estado van como data URL (fondos, logo, avatares
 *                  personalizados, música propia y las voces ya generadas por Gemini)
 *
 * En project.json cada data URL grande se sustituye por "asset:NNN.ext" y se restaura al abrir.
 */

import JSZip from 'jszip';
import { HostConfig, PodcastScript, StudioSettings } from '../types';
import { browserTTS } from './ttsService';
import { DEFAULT_LOGO_BASE64 } from '../assets/logoData';

const APP_ID = 'NotebookLM-Studio';
const FORMAT_VERSION = 1;
const ASSET_PREFIX = 'asset:';

export interface ProjectState {
  sourceText: string;
  hostA: HostConfig;
  hostB: HostConfig;
  settings: StudioSettings;
  script: PodcastScript | null;
}

interface ProjectJson extends ProjectState {
  app: string;
  version: number;
  savedAt: string;
  /** Voces ya sintetizadas: clave de caché (voz + texto) -> audio */
  voices: Record<string, string>;
  /** Tipo MIME de cada recurso de assets/ */
  assets: Record<string, string>;
}

export interface OpenedProject extends ProjectState {
  savedAt: string;
  voiceCount: number;
  backgroundCount: number;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = dataUrl.match(/^data:([^;,]+)(;[^,]*)?,(.*)$/s);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const isBase64 = /;base64/i.test(m[2] || '');
  const payload = m[3];
  if (isBase64) {
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime, bytes };
  }
  return { mime, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Recorre un valor JSON y aplica `fn` a cada cadena (devuelve una copia). */
function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn);
    return out;
  }
  return value;
}

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'proyecto'
  );
}

export function projectFileName(state: ProjectState): string {
  return `${slugify(state.settings.branding.introTitle || state.script?.episode_title || 'proyecto')}.nlmstudio.zip`;
}

/** Empaqueta el estado actual y las voces ya generadas en un .zip. */
export async function saveProject(state: ProjectState): Promise<{ blob: Blob; voices: number; assets: number }> {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets')!;
  const assets: Record<string, string> = {};
  const seen = new Map<string, string>(); // data URL -> nombre (evita duplicados)
  let counter = 0;

  const extract = (s: string): string => {
    // El logo por defecto ya va dentro de la app: no hace falta guardarlo
    if (!s.startsWith('data:') || s.length < 2048 || s === DEFAULT_LOGO_BASE64) return s;
    const existing = seen.get(s);
    if (existing) return ASSET_PREFIX + existing;
    const parsed = dataUrlToBytes(s);
    if (!parsed) return s;
    counter++;
    const name = `${String(counter).padStart(3, '0')}.${EXT_BY_MIME[parsed.mime] || 'bin'}`;
    assetsFolder.file(name, parsed.bytes, { compression: 'STORE' });
    assets[name] = parsed.mime;
    seen.set(s, name);
    return ASSET_PREFIX + name;
  };

  const voices: Record<string, string> = {};
  browserTTS.getAudioCache().forEach((url, key) => {
    voices[key] = url;
  });

  const project = mapStrings(
    {
      app: APP_ID,
      version: FORMAT_VERSION,
      savedAt: new Date().toISOString(),
      sourceText: state.sourceText,
      hostA: state.hostA,
      hostB: state.hostB,
      settings: state.settings,
      script: state.script,
      voices,
    },
    extract
  ) as ProjectJson;
  project.assets = assets;

  zip.file('project.json', JSON.stringify(project, null, 1));
  zip.file(
    'LEEME.txt',
    'Proyecto de NotebookLM Studio (https://jpm70.github.io/NotebookLM-Studio/).\n' +
      'Ábrelo con el botón "Abrir proyecto" de la app para continuar donde lo dejaste.\n'
  );
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, voices: Object.keys(voices).length, assets: counter };
}

/** Lee un .zip de proyecto, restaura las voces en la caché y devuelve el estado. */
export async function openProject(file: File): Promise<OpenedProject> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('El archivo no es un proyecto válido (no se puede leer como .zip).');
  }
  const entry = zip.file('project.json');
  if (!entry) throw new Error('El archivo no contiene project.json: no es un proyecto de NotebookLM Studio.');

  let raw: ProjectJson;
  try {
    raw = JSON.parse(await entry.async('string'));
  } catch {
    throw new Error('project.json está dañado.');
  }
  if (raw.app !== APP_ID) throw new Error('Este archivo no es un proyecto de NotebookLM Studio.');
  if (raw.version > FORMAT_VERSION) {
    throw new Error('El proyecto se guardó con una versión más nueva de la app. Recarga la página (Ctrl+F5) y vuelve a intentarlo.');
  }

  // Cargar los recursos referenciados
  const dataUrls = new Map<string, string>();
  for (const [name, mime] of Object.entries(raw.assets || {})) {
    const f = zip.file(`assets/${name}`);
    if (!f) continue;
    dataUrls.set(name, bytesToDataUrl(await f.async('uint8array'), mime));
  }
  const restore = (s: string) => (s.startsWith(ASSET_PREFIX) ? dataUrls.get(s.slice(ASSET_PREFIX.length)) || '' : s);
  const project = mapStrings(raw, restore) as ProjectJson;

  // Voces: a la caché, para que la grabación solo pida las que falten
  const cache = browserTTS.getAudioCache();
  let voiceCount = 0;
  for (const [key, url] of Object.entries(project.voices || {})) {
    if (url && url.startsWith('data:audio/')) {
      cache.set(key, url);
      voiceCount++;
    }
  }

  const backgroundCount = Object.values(project.settings?.branding?.turnBackgroundImages || {}).filter(Boolean).length;
  return {
    sourceText: project.sourceText || '',
    hostA: project.hostA,
    hostB: project.hostB,
    settings: project.settings,
    script: project.script,
    savedAt: project.savedAt,
    voiceCount,
    backgroundCount,
  };
}
