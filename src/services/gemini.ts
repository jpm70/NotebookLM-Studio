/**
 * Cliente de Gemini que se ejecuta íntegramente en el navegador (GitHub Pages, sin backend).
 * La clave del usuario se lee de localStorage y viaja solo a generativelanguage.googleapis.com
 * en la cabecera x-goog-api-key (nunca en la URL).
 *
 * Los nombres de modelo cambian con frecuencia, así que cada tipo de tarea tiene una lista de
 * candidatos preferidos y, si ninguno existe para la clave, se elige uno de la lista de modelos
 * que devuelve la propia API.
 */

import { getStoredApiKey } from './apiKeyStorage';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type ModelKind = 'text' | 'tts' | 'image';

const PREFERRED_MODELS: Record<ModelKind, string[]> = {
  text: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'],
  tts: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'],
  image: ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'],
};

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

interface ApiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

let modelListPromise: Promise<string[]> | null = null;
let modelListKey = '';
const resolvedModels: Partial<Record<ModelKind, string>> = {};

function requireKey(explicitKey?: string): string {
  const key = (explicitKey || getStoredApiKey()).trim();
  if (!key) {
    throw new GeminiError(
      'Falta la clave de API de Gemini. Configúrala en el botón "Configurar API Key" de la barra superior.'
    );
  }
  return key;
}

async function listModels(key: string): Promise<string[]> {
  if (modelListPromise && modelListKey === key) return modelListPromise;
  modelListKey = key;
  for (const k of Object.keys(resolvedModels) as ModelKind[]) delete resolvedModels[k];
  modelListPromise = (async () => {
    const names: string[] = [];
    let pageToken = '';
    for (let page = 0; page < 5; page++) {
      const url = `${API_BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
      if (!res.ok) break;
      const data = await res.json();
      for (const m of (data.models || []) as ApiModel[]) {
        if (m.supportedGenerationMethods?.includes('generateContent')) {
          names.push(m.name.replace(/^models\//, ''));
        }
      }
      pageToken = data.nextPageToken || '';
      if (!pageToken) break;
    }
    return names;
  })().catch(() => []);
  return modelListPromise;
}

function versionOf(name: string): number {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Elige de la lista de la API los modelos que encajan con la tarea, del más deseable al menos. */
function pickFromListing(kind: ModelKind, names: string[]): string[] {
  const isTts = (n: string) => /tts/i.test(n);
  const isImage = (n: string) => /image/i.test(n) && !/imagen/i.test(n);
  const isSpecial = (n: string) => isTts(n) || isImage(n) || /embedding|aqa|live|native-audio|computer-use|robotics|thinking-exp/i.test(n);

  let pool: string[];
  if (kind === 'tts') pool = names.filter(isTts);
  else if (kind === 'image') pool = names.filter(isImage);
  else pool = names.filter((n) => n.startsWith('gemini') && !isSpecial(n));

  // Preferir "flash" (más rápido y con más cuota gratuita) y versiones más nuevas
  return pool.sort((a, b) => {
    const fa = /flash/.test(a) ? 0 : 1;
    const fb = /flash/.test(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return versionOf(b) - versionOf(a);
  });
}

async function candidatesFor(kind: ModelKind, key: string): Promise<string[]> {
  const cached = resolvedModels[kind];
  const listing = await listModels(key);
  const preferred = listing.length
    ? PREFERRED_MODELS[kind].filter((m) => listing.includes(m))
    : PREFERRED_MODELS[kind];
  const fromListing = pickFromListing(kind, listing);
  return Array.from(new Set([...(cached ? [cached] : []), ...preferred, ...fromListing]));
}

function parseRetryDelay(errJson: any): number | null {
  const details: any[] = errJson?.error?.details || [];
  for (const d of details) {
    if (typeof d?.retryDelay === 'string') {
      const secs = parseFloat(d.retryDelay);
      if (!Number.isNaN(secs)) return secs * 1000;
    }
  }
  return null;
}

function isZeroQuota(errJson: any): boolean {
  const msg: string = errJson?.error?.message || '';
  return /limit:\s*0\b/.test(msg) || /free_tier.*limit.*\b0\b/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cuota diaria (no tiene sentido esperar) frente a cuota por minuto (basta esperar unos segundos). */
function isDailyQuota(errJson: any): boolean {
  const details: any[] = errJson?.error?.details || [];
  const ids = details.flatMap((d) => (d?.violations || []).map((v: any) => `${v?.quotaId || ''} ${v?.quotaMetric || ''}`));
  return ids.some((id) => /per ?day/i.test(id)) || /per day|PerDay|daily/i.test(errJson?.error?.message || '');
}

/** Razonamiento corto para que respuestas largas (el guion) no tarden minutos; cada familia usa su parámetro. */
function thinkingConfigFor(model: string): Record<string, unknown> | null {
  if (/^gemini-[3-9]/.test(model)) return { thinkingLevel: 'low' };
  if (/^gemini-2\.5/.test(model) && !/pro/.test(model)) return { thinkingBudget: 1024 };
  return null;
}

export interface GenerateOptions {
  apiKey?: string;
  signal?: AbortSignal;
  /** Mensajes de progreso para la interfaz (modelo en uso, esperas por cuota…). */
  onStatus?: (message: string) => void;
  /** Tiempo máximo por petición (ms). */
  timeoutMs?: number;
  /** Pide razonamiento corto cuando el modelo lo admite. */
  fastThinking?: boolean;
}

const MAX_MODELS: Record<ModelKind, number> = { text: 4, tts: 4, image: 6 };

/**
 * Llama a generateContent probando modelos candidatos hasta que uno responda.
 * - 404 / modelo no soportado / tiempo agotado → siguiente candidato.
 * - 429 por minuto → espera el retryDelay que indica la API (con cuenta atrás) y reintenta hasta 2 veces.
 * - 429 diario o con cuota 0 → siguiente candidato sin esperar.
 */
export async function generateContent(
  kind: ModelKind,
  body: Record<string, unknown>,
  options: GenerateOptions = {}
): Promise<{ data: any; model: string }> {
  const { onStatus, signal, timeoutMs = 120000, fastThinking = false } = options;
  const key = requireKey(options.apiKey);
  const candidates = (await candidatesFor(kind, key)).slice(0, MAX_MODELS[kind]);
  if (candidates.length === 0) {
    throw new GeminiError(
      kind === 'image'
        ? 'Tu clave de API no tiene ningún modelo de generación de imágenes de Gemini disponible.'
        : kind === 'tts'
        ? 'Tu clave de API no tiene ningún modelo de voz (TTS) de Gemini disponible.'
        : 'Tu clave de API no tiene ningún modelo de texto de Gemini disponible.'
    );
  }

  let lastError: GeminiError | null = null;
  const zeroQuotaModels: string[] = [];
  const dailyQuotaModels: string[] = [];
  const kindLabel = kind === 'image' ? 'imágenes' : kind === 'tts' ? 'voz' : 'texto';
  const cancelled = () => signal?.aborted;

  for (const model of candidates) {
    let useThinking = fastThinking ? thinkingConfigFor(model) : null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (cancelled()) throw new GeminiError('Generación cancelada.');
      onStatus?.(attempt === 0 ? `Esperando la respuesta de ${model}…` : `Reintentando con ${model}…`);

      let requestBody = body;
      if (useThinking) {
        const gc = (body.generationConfig as Record<string, unknown>) || {};
        requestBody = { ...body, generationConfig: { ...gc, thinkingConfig: useThinking } };
      }

      // Tiempo límite por petición, combinado con la cancelación del usuario
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
      const onAbort = () => controller.abort('cancel');
      signal?.addEventListener('abort', onAbort);
      let res: Response;
      try {
        // La carrera con la señal garantiza que cancelar o agotar el tiempo corta la espera al instante
        const aborted = new Promise<never>((_, reject) =>
          controller.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
        );
        res = await Promise.race([
          fetch(`${API_BASE}/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }),
          aborted,
        ]);
      } catch (err: any) {
        if (cancelled()) throw new GeminiError('Generación cancelada.');
        if (controller.signal.aborted) {
          lastError = new GeminiError(
            `${model} no respondió en ${Math.round(timeoutMs / 1000)} s (Gemini puede estar saturado).`
          );
          break; // siguiente modelo
        }
        lastError = new GeminiError(`Error de red al llamar a ${model}: ${err?.message || err}`);
        break;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }

      if (res.ok) {
        resolvedModels[kind] = model;
        onStatus?.(`Respuesta recibida de ${model}.`);
        return { data: await res.json(), model };
      }

      const errJson = await res.json().catch(() => null);
      const apiMsg: string = errJson?.error?.message || `HTTP ${res.status}`;

      if (res.status === 400 && /api key not valid|API_KEY_INVALID/i.test(apiMsg)) {
        throw new GeminiError('La clave de API de Gemini no es válida.', 400);
      }
      if (res.status === 403) {
        throw new GeminiError(`Google ha rechazado la clave: ${apiMsg}`, 403);
      }
      // El modelo no admite el parámetro de razonamiento: repetir sin él
      if (res.status === 400 && useThinking && /thinking/i.test(apiMsg)) {
        useThinking = null;
        attempt--;
        continue;
      }

      if (res.status === 429) {
        if (isZeroQuota(errJson)) {
          zeroQuotaModels.push(model);
          onStatus?.(`${model} no tiene cuota gratuita; probando otro modelo…`);
          break;
        }
        if (isDailyQuota(errJson)) {
          dailyQuotaModels.push(model);
          onStatus?.(`Cuota diaria de ${model} agotada; probando otro modelo…`);
          break;
        }
        if (attempt < 2) {
          const wait = Math.min(parseRetryDelay(errJson) ?? 15000, 60000) + 500;
          const end = Date.now() + wait;
          while (Date.now() < end) {
            if (cancelled()) throw new GeminiError('Generación cancelada.');
            onStatus?.(`Límite por minuto de ${model}: reintento en ${Math.ceil((end - Date.now()) / 1000)} s…`);
            await sleep(Math.min(1000, end - Date.now()));
          }
          continue;
        }
        lastError = new GeminiError(`Cuota por minuto de ${model} agotada. Espera un minuto y vuelve a intentarlo.`, 429);
        break;
      }

      // Saturación ("high demand"): un reintento rápido y, si sigue, otro modelo en vez de insistir
      if (res.status >= 500 && attempt < 1) {
        onStatus?.(`${model} está saturado (HTTP ${res.status}); reintentando…`);
        await sleep(2500);
        continue;
      }
      if (res.status >= 500) {
        onStatus?.(`${model} sigue saturado; probando otro modelo…`);
        lastError = new GeminiError(`${model} está saturado ahora mismo (HTTP ${res.status}). Inténtalo en unos minutos.`, res.status);
        if (resolvedModels[kind] === model) delete resolvedModels[kind];
        break;
      }

      // 404 (modelo inexistente), 400 de modalidad no soportada, etc. → siguiente candidato
      lastError = new GeminiError(`${model}: ${apiMsg}`, res.status);
      if (resolvedModels[kind] === model) delete resolvedModels[kind];
      break;
    }
  }

  if (dailyQuotaModels.length > 0) {
    throw new GeminiError(
      `Has agotado la cuota diaria gratuita de Gemini (${kindLabel}) en: ${dailyQuotaModels.join(', ')}. ` +
        'Se renueva cada día; vuelve a intentarlo mañana o usa otra clave.' +
        (lastError ? ` Último error: ${lastError.message}` : ''),
      429
    );
  }
  if (zeroQuotaModels.length > 0 && (!lastError || zeroQuotaModels.length >= candidates.length - 1)) {
    throw new GeminiError(
      `Tu clave no tiene cuota gratuita para ningún modelo de ${kindLabel} de Gemini (probados: ${zeroQuotaModels.join(', ')}). ` +
        (kind === 'image'
          ? 'La generación de imágenes por API exige activar la facturación en Google AI Studio.'
          : 'Puede que ese modelo requiera activar la facturación en Google AI Studio.'),
      429
    );
  }
  throw lastError || new GeminiError('No se pudo completar la petición a Gemini.');
}

/** Extrae el texto concatenado de la primera respuesta candidata. */
export function responseText(data: any): string {
  const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
}

/** Devuelve la primera parte binaria (audio o imagen) de la respuesta. */
export function responseInlineData(data: any): { mimeType: string; data: string } | null {
  const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline?.data) {
      return { mimeType: inline.mimeType || inline.mime_type || '', data: inline.data };
    }
  }
  return null;
}

export function parseJsonResponse<T = any>(data: any): T {
  const raw = responseText(data).trim();
  if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new GeminiError('La respuesta de Gemini se cortó por longitud. Prueba con un artículo más corto o menos turnos.');
  }
  if (!raw) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    throw new GeminiError(`Gemini no devolvió contenido${reason ? ` (motivo: ${reason})` : ''}.`);
  }
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiError('No se pudo interpretar el JSON devuelto por Gemini.');
  }
}

/** Comprueba la clave con una petición mínima. */
export async function verifyApiKey(apiKey: string): Promise<{ model: string }> {
  const { model } = await generateContent(
    'text',
    {
      contents: [{ parts: [{ text: 'Responde únicamente con la palabra OK.' }] }],
      generationConfig: { maxOutputTokens: 16 },
    },
    { apiKey }
  );
  return { model };
}

/** Valida la clave para el modal de configuración. */
export async function validateApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { success: false, message: 'La clave de API no puede estar vacía.' };
  }
  try {
    const { model } = await verifyApiKey(trimmed);
    return { success: true, message: `Clave válida: conectada a ${model}.` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'No se pudo verificar la clave con Google.' };
  }
}
