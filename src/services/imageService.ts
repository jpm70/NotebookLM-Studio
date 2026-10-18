/**
 * Fondos de diapositiva generados con el modelo de imagen nativo de Gemini, en el navegador.
 * Si la petición falla (sin cuota, modelo no disponible, contenido bloqueado) se devuelve
 * un fondo vectorial SVG generado localmente para que el vídeo nunca quede sin fondo.
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

/** Reescala a la resolución del vídeo y recomprime a JPEG para no cargar PNG de varios MB en memoria. */
async function toVideoJpeg(base64: string, mimeType: string, width: number, height: number): Promise<string> {
  const src = `data:${mimeType || 'image/png'};base64,${base64}`;
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  // Recorte tipo "cover" para respetar la proporción del vídeo
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export interface BackgroundResult {
  imageUrl: string;
  source: 'gemini' | 'svg-fallback';
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
    return { imageUrl: await toVideoJpeg(inline.data, inline.mimeType, w, h), source: 'gemini', model };
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
