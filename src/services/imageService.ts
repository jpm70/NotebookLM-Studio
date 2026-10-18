/**
 * Fondos de diapositiva, en el navegador. Tres orígenes:
 * - Gemini API (modelo de imagen nativo; por API exige facturación activada).
 * - Generador gratuito sin clave (Pollinations), limitado a 1 imagen cada 45 s.
 * - Manual: la app da el prompt de cada diapositiva y el usuario sube la imagen.
 * Si una generación falla se devuelve un fondo vectorial SVG para que el vídeo nunca quede sin fondo.
 */

import { DialogueTurn } from '../types';
import { generateContent, responseInlineData, GeminiError } from './gemini';

export type AnimeMood = 'shinkai' | 'cyberpunk' | 'ghibli';
export type BackgroundStyle = 'studio' | 'anime' | 'whiteboard' | 'cyberpunk' | 'minimal' | 'minimalist';

const STYLE_PROMPTS: Record<string, string> = {
  anime:
    'High-quality Japanese anime background art in the style of a modern anime feature film, luminous lighting, painterly clouds, clean line art, rich saturated colors',
  whiteboard:
    'Clean educational chalkboard illustration, hand-drawn chalk diagrams and doodles on a dark green board, subtle chalk texture',
  minimal:
    'Minimalist modern editorial illustration, Swiss design, clean geometric shapes, limited sophisticated palette, generous negative space, flat vector look',
  cyberpunk:
    'Cyberpunk digital art, neon cyan and magenta lights, holographic elements, rainy high-tech night atmosphere, cinematic depth',
  studio:
    'Cinematic film still, 35mm photography, volumetric lighting, photorealistic textures, shallow depth of field',
};

const MOOD_PROMPTS: Record<AnimeMood, string> = {
  shinkai: 'twilight palette of indigo, violet and magenta sky with cyan highlights and soft stars',
  cyberpunk: 'night palette of deep navy with neon cyan and pink reflections, Neo-Tokyo skyline',
  ghibli: 'warm daylight palette of soft greens and golden sunlight, gentle pastoral sky',
};

/** Prompt de fondo coherente para toda la presentación: mismo estilo y paleta en cada diapositiva. */
export function buildBackgroundPrompt(
  turn: DialogueTurn,
  style: BackgroundStyle = 'anime',
  mood: AnimeMood = 'shinkai',
  episodeTitle = ''
): string {
  const styleKey = style === 'minimalist' ? 'minimal' : style;
  const subject =
    turn.visual_prompt?.trim() ||
    `A conceptual scene illustrating "${turn.sectionTitle || turn.visual_title}"${episodeTitle ? ` in an episode about "${episodeTitle}"` : ''}`;
  const isData = turn.slideType === 'table' || turn.slideType === 'terminal' || turn.tableData || turn.terminalData;

  return [
    `${STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.anime}, ${MOOD_PROMPTS[mood]}.`,
    `Scene: ${subject}.`,
    isData
      ? 'Keep the center of the image calm, dark and uncluttered because a data panel will be overlaid on top; put the visual interest near the edges.'
      : 'Leave the central area slightly darker and less detailed because a text card will be overlaid on top.',
    'Wide cinematic background composition. Absolutely no text, letters, numbers, captions, watermarks, logos or readable user interfaces in the image.',
  ].join(' ');
}

/**
 * Reescala a la resolución del vídeo (recorte tipo "cover") y recomprime a JPEG para no cargar
 * PNG de varios MB en memoria. `cropBottom` recorta esa fracción inferior (marca de agua).
 */
export async function toVideoJpeg(src: string, width: number, height: number, cropBottom = 0): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight * (1 - cropBottom);
  const scale = Math.max(width / sw, height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(img, 0, 0, sw, sh, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return canvas.toDataURL('image/jpeg', 0.9);
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export interface BackgroundResult {
  imageUrl: string;
  source: 'gemini' | 'free' | 'svg-fallback';
  model?: string;
  error?: string;
}

export async function generateSlideBackground(
  turn: DialogueTurn,
  options: {
    style?: BackgroundStyle;
    mood?: AnimeMood;
    aspectRatio?: '16:9' | '9:16';
    episodeTitle?: string;
    index?: number;
  } = {}
): Promise<BackgroundResult> {
  const { style = 'anime', mood = 'shinkai', aspectRatio = '16:9', episodeTitle = '', index = 0 } = options;
  const [w, h] = aspectRatio === '9:16' ? [720, 1280] : [1280, 720];

  try {
    const { data, model } = await generateContent('image', {
      contents: [{ parts: [{ text: buildBackgroundPrompt(turn, style, mood, episodeTitle) }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    });
    const inline = responseInlineData(data);
    if (!inline) {
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
      throw new GeminiError(`Gemini no devolvió imagen${reason ? ` (motivo: ${reason})` : ''}.`);
    }
    return {
      imageUrl: await toVideoJpeg(`data:${inline.mimeType || 'image/png'};base64,${inline.data}`, w, h),
      source: 'gemini',
      model,
    };
  } catch (err: any) {
    // La falta de clave se propaga: no tiene sentido rellenar todo con SVG sin avisar
    if (err instanceof GeminiError && /Falta la clave/.test(err.message)) throw err;
    return {
      imageUrl: buildFallbackSvg(turn.visual_title || turn.sectionTitle || `Punto ${index + 1}`, style, mood, index, aspectRatio),
      source: 'svg-fallback',
      error: err?.message || String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Generador gratuito sin clave (Pollinations). Límite anónimo: 1 imagen cada 45 s por IP,
// con una pequeña marca de agua abajo a la derecha que se recorta al convertir.
// ---------------------------------------------------------------------------

const FREE_ENDPOINT = 'https://image.pollinations.ai/prompt/';
const FREE_MIN_INTERVAL_MS = 46000;
const FREE_WATERMARK_CROP = 0.08;
let lastFreeRequestAt = 0;

/** Límite anunciado por el servicio (el intervalo interno lleva 1 s de margen). */
export const FREE_SECONDS_PER_IMAGE = 45;

/** Semilla estable por presentación y diapositiva, para que regenerar dé la misma imagen. */
function seedFor(text: string, index: number): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 900000) + index;
}

async function waitWithCountdown(ms: number, onWait?: (secondsLeft: number) => void, cancel?: { cancelled: boolean }) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cancel?.cancelled) return;
    onWait?.(Math.ceil((end - Date.now()) / 1000));
    await new Promise((r) => setTimeout(r, Math.min(1000, end - Date.now())));
  }
}

export async function generateFreeBackground(
  turn: DialogueTurn,
  options: {
    style?: BackgroundStyle;
    mood?: AnimeMood;
    aspectRatio?: '16:9' | '9:16';
    episodeTitle?: string;
    index?: number;
    onWait?: (secondsLeft: number) => void;
    cancel?: { cancelled: boolean };
  } = {}
): Promise<BackgroundResult> {
  const { style = 'anime', mood = 'shinkai', aspectRatio = '16:9', episodeTitle = '', index = 0, onWait, cancel } = options;
  const [w, h] = aspectRatio === '9:16' ? [720, 1280] : [1280, 720];
  const prompt = buildBackgroundPrompt(turn, style, mood, episodeTitle);
  // Se pide algo más alta para que, tras recortar la marca de agua, quede la proporción del vídeo
  const reqW = aspectRatio === '9:16' ? 576 : 1024;
  const reqH = Math.round((aspectRatio === '9:16' ? 1024 : 576) / (1 - FREE_WATERMARK_CROP));
  const url =
    `${FREE_ENDPOINT}${encodeURIComponent(prompt)}` +
    `?width=${reqW}&height=${reqH}&nologo=true&model=flux&seed=${seedFor(episodeTitle + style + mood, index)}`;

  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const waitMs = lastFreeRequestAt + FREE_MIN_INTERVAL_MS - Date.now();
      if (waitMs > 0) await waitWithCountdown(waitMs, onWait, cancel);
      if (cancel?.cancelled) throw new Error('Generación detenida.');
      lastFreeRequestAt = Date.now();

      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) throw new Error('El generador gratuito no devolvió una imagen.');
        const imageUrl = await toVideoJpeg(await blobToDataUrl(blob), w, h, FREE_WATERMARK_CROP);
        return { imageUrl, source: 'free', model: 'Pollinations (Flux)' };
      }
      const text = await res.text().catch(() => '');
      if (res.status === 402 || res.status === 429) {
        // "Free limit reached: 1 image every 45 seconds per IP. Retry after 30s"
        const retry = parseInt(text.match(/after\s+(\d+)\s*s/i)?.[1] || '45', 10);
        lastFreeRequestAt = Date.now() + retry * 1000 - FREE_MIN_INTERVAL_MS;
        continue;
      }
      if (res.status === 403) {
        // Pollinations a veces exige un desafío anti-bots (Cloudflare Turnstile) que una app no puede resolver
        throw new Error(
          /turnstile/i.test(text)
            ? 'El generador gratuito ha pedido una verificación anti-bots (HTTP 403). Prueba más tarde o usa el modo manual con Gemini.'
            : 'El generador gratuito ha rechazado la petición (HTTP 403). Prueba más tarde o usa el modo manual con Gemini.'
        );
      }
      if (res.status >= 500 && attempt < 3) {
        await waitWithCountdown(5000, onWait, cancel);
        continue;
      }
      throw new Error(`El generador gratuito respondió HTTP ${res.status}.`);
    }
    throw new Error('El generador gratuito sigue limitando las peticiones; inténtalo más tarde.');
  } catch (err: any) {
    return {
      imageUrl: buildFallbackSvg(turn.visual_title || turn.sectionTitle || `Punto ${index + 1}`, style, mood, index, aspectRatio),
      source: 'svg-fallback',
      error: err?.message || String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Modo manual: prompts listos para pegar en la app de Gemini (Nano Banana Pro)
// ---------------------------------------------------------------------------

export function buildManualPrompt(
  turn: DialogueTurn,
  style: BackgroundStyle = 'anime',
  mood: AnimeMood = 'shinkai',
  aspectRatio: '16:9' | '9:16' = '16:9',
  episodeTitle = ''
): string {
  const orientation = aspectRatio === '9:16' ? '9:16 vertical (portrait)' : '16:9 horizontal (landscape)';
  return `Generate one ${orientation} image to be used as a video slide background. ${buildBackgroundPrompt(turn, style, mood, episodeTitle)}`;
}

/** Lista numerada de todos los prompts, para copiar o descargar como .txt. */
export function buildManualPromptList(
  turns: DialogueTurn[],
  style: BackgroundStyle,
  mood: AnimeMood,
  aspectRatio: '16:9' | '9:16',
  episodeTitle: string
): string {
  const header =
    `Prompts de fondos — ${episodeTitle}\n` +
    'Genera una imagen por prompt y guárdala con el número de la diapositiva en el nombre (por ejemplo, diapositiva-03.png).\n';
  return (
    header +
    turns
      .map((t, i) => {
        const n = String(i + 1).padStart(2, '0');
        return `\n=== Diapositiva ${n} — ${t.sectionTitle || t.visual_title} ===\n${buildManualPrompt(t, style, mood, aspectRatio, episodeTitle)}\n`;
      })
      .join('')
  );
}

/**
 * Reparte imágenes subidas entre diapositivas: usa el número del nombre del archivo
 * (diapositiva-03.png → diapositiva 3) y, si no lo hay o no encaja, las asigna en orden a los huecos libres.
 */
export function assignUploadsToSlides(fileNames: string[], totalSlides: number, occupied: Set<number>): (number | null)[] {
  const taken = new Set<number>();
  const result: (number | null)[] = fileNames.map((name) => {
    // Solo números explícitos: "03.png", "diapositiva-03.png", "slide 3.jpg" (los nombres que pone
    // la app de Gemini, tipo Gemini_Generated_Image_k3j9….png, llevan dígitos al azar y se ignoran)
    const base = name.replace(/\.[a-z0-9]+$/i, '').trim();
    const m = base.match(/^(?:.*?(?:diapositiva|diapo|slide|fondo)[\s_-]*)?(\d{1,3})$/i);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (n >= 1 && n <= totalSlides && !taken.has(n - 1)) {
      taken.add(n - 1);
      return n - 1;
    }
    return null;
  });
  let cursor = 0;
  return result.map((slot) => {
    if (slot !== null) return slot;
    while (cursor < totalSlides && (taken.has(cursor) || occupied.has(cursor))) cursor++;
    if (cursor >= totalSlides) return null;
    taken.add(cursor);
    return cursor++;
  });
}

export async function fileToSlideImage(file: File, aspectRatio: '16:9' | '9:16'): Promise<string> {
  const [w, h] = aspectRatio === '9:16' ? [720, 1280] : [1280, 720];
  return toVideoJpeg(await blobToDataUrl(file), w, h);
}

const MOOD_PALETTES: Record<AnimeMood, { top: string; mid: string; bot: string; glow: string; accent: string; stars: string }> = {
  shinkai: { top: '#130924', mid: '#3b0d5c', bot: '#6d1b7b', glow: '#f472b6', accent: '#38bdf8', stars: '#ffffff' },
  cyberpunk: { top: '#030712', mid: '#0f172a', bot: '#1e1b4b', glow: '#06b6d4', accent: '#ec4899', stars: '#38bdf8' },
  ghibli: { top: '#064e3b', mid: '#065f46', bot: '#047857', glow: '#fbbf24', accent: '#34d399', stars: '#fef08a' },
};

const STYLE_PALETTES: Record<string, { top: string; mid: string; bot: string; glow: string; accent: string; stars: string }> = {
  whiteboard: { top: '#0f291e', mid: '#143527', bot: '#0a1c14', glow: '#34d399', accent: '#f0fdf4', stars: '#ffffff' },
  minimal: { top: '#141417', mid: '#1c1c22', bot: '#0d0d10', glow: '#94a3b8', accent: '#475569', stars: '#e2e8f0' },
  cyberpunk: MOOD_PALETTES.cyberpunk,
  studio: { top: '#1e293b', mid: '#0f172a', bot: '#020617', glow: '#f59e0b', accent: '#3b82f6', stars: '#fde68a' },
};

/** Fondo vectorial de reserva, sin texto: el título ya lo dibuja el renderizador encima. */
export function buildFallbackSvg(
  _title: string,
  style: BackgroundStyle = 'anime',
  mood: AnimeMood = 'shinkai',
  i = 0,
  aspectRatio: '16:9' | '9:16' = '16:9'
): string {
  const styleKey = style === 'minimalist' ? 'minimal' : style;
  const p = styleKey === 'anime' ? MOOD_PALETTES[mood] : STYLE_PALETTES[styleKey] || MOOD_PALETTES[mood];
  const [W, H] = aspectRatio === '9:16' ? [720, 1280] : [1280, 720];
  const moonR = 60 + (i % 3) * 15;
  const moonX = (W * 0.25 + i * 140) % (W * 0.7) + W * 0.15;
  const m1 = H * 0.72 + ((i * 12) % 40);
  const m2 = H * 0.8 + ((i * 18) % 35);

  let stars = '';
  for (let s = 0; s < 14; s++) {
    const x = ((s * 97 + i * 53) % 100) / 100 * W;
    const y = ((s * 37 + i * 29) % 45) / 100 * H;
    const r = 1.6 + ((s + i) % 3);
    stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${s % 3 === 0 ? p.glow : s % 3 === 1 ? p.accent : p.stars}" opacity="0.8"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="sky" cx="50%" cy="20%" r="95%"><stop offset="0%" stop-color="${p.top}"/><stop offset="45%" stop-color="${p.mid}"/><stop offset="85%" stop-color="${p.bot}"/><stop offset="100%" stop-color="#040209"/></radialGradient>
<linearGradient id="hz" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${p.glow}" stop-opacity="0.28"/><stop offset="100%" stop-color="${p.accent}" stop-opacity="0.04"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#sky)"/>
<rect y="${H * 0.42}" width="${W}" height="${H * 0.58}" fill="url(#hz)"/>
${stars}
<circle cx="${moonX.toFixed(0)}" cy="${H * 0.22}" r="${moonR}" fill="none" stroke="${p.glow}" stroke-width="1.6" opacity="0.32" stroke-dasharray="14 10"/>
<circle cx="${moonX.toFixed(0)}" cy="${H * 0.22}" r="${moonR * 0.6}" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity="0.45"/>
<circle cx="${moonX.toFixed(0)}" cy="${H * 0.22}" r="${moonR * 0.35}" fill="${p.stars}" opacity="0.12"/>
<path d="M 0 ${m1} Q ${W * 0.28} ${m1 - 60} ${W * 0.55} ${m1} T ${W} ${m1 - 30} L ${W} ${H} L 0 ${H} Z" fill="#0d081f" opacity="0.65"/>
<path d="M 0 ${m2} Q ${W * 0.36} ${m2 - 50} ${W * 0.72} ${m2 + 10} T ${W} ${m2 - 20} L ${W} ${H} L 0 ${H} Z" fill="#05030a" opacity="0.88"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// Origen de los fondos elegido por el usuario (recordado en este navegador)
// ---------------------------------------------------------------------------

export type BackgroundSource = 'gemini' | 'free' | 'manual';
const SOURCE_KEY = 'notebooklm_background_source';

export function getStoredBackgroundSource(): BackgroundSource {
  try {
    const v = localStorage.getItem(SOURCE_KEY);
    if (v === 'gemini' || v === 'free' || v === 'manual') return v;
  } catch {
    // almacenamiento no disponible
  }
  return 'free';
}

export function storeBackgroundSource(source: BackgroundSource): void {
  try {
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    // almacenamiento no disponible
  }
}

/** Genera el fondo con el origen indicado ('manual' no genera: lo sube el usuario). */
export function generateBackgroundFromSource(
  source: Exclude<BackgroundSource, 'manual'>,
  turn: DialogueTurn,
  options: Parameters<typeof generateFreeBackground>[1] = {}
): Promise<BackgroundResult> {
  return source === 'gemini' ? generateSlideBackground(turn, options) : generateFreeBackground(turn, options);
}
