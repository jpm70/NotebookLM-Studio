/**
 * Servicio auxiliar para extracción y procesamiento de contenido web (URLs)
 * y su formateo como contexto estructurado para el prompt de Gemini.
 */

export interface ExtractedWebContent {
  url: string;
  title: string;
  text: string;
  charCount: number;
  wordCount: number;
  domain: string;
  extractedAt: string;
}

/**
 * Valida si un string tiene estructura de URL válida.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normaliza una URL asegurando que tenga prefijo https://
 */
export function normalizeUrl(urlString: string): string {
  const trimmed = urlString.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isYouTubeUrl(urlString: string): boolean {
  if (!urlString) return false;
  return /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i.test(urlString);
}

/**
 * Extrae el contenido principal de texto desde una página web o vídeo de YouTube
 * a través de la API backend con fallback defensivo.
 */
export async function extractTextFromUrl(rawUrl: string): Promise<ExtractedWebContent> {
  const url = normalizeUrl(rawUrl);

  if (!isValidUrl(url)) {
    throw new Error('La dirección URL introducida no es válida. Debe incluir un dominio como https://ejemplo.com');
  }

  const domain = new URL(url).hostname;

  // Detección especial para URLs de YouTube (Transcripciones y metadatos)
  if (isYouTubeUrl(url)) {
    const response = await fetch('/api/fetch-youtube-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error HTTP ${response.status} al consultar vídeo de YouTube`);
    }

    const data = await response.json();
    const cleanText = (data.transcript || data.fullText || '').trim();
    if (!cleanText) {
      throw new Error('No se encontraron subtítulos o transcripción en el vídeo indicado.');
    }

    return {
      url: data.url || url,
      title: `${data.title} (${data.author})`,
      text: cleanText,
      charCount: cleanText.length,
      wordCount: cleanText.split(/\s+/).length,
      domain: 'youtube.com',
      extractedAt: new Date().toLocaleTimeString(),
    };
  }

  // 1. Invocar el endpoint backend dedicado /api/fetch-url para páginas web generales
  const response = await fetch('/api/fetch-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `No se pudo obtener la página (Código HTTP ${response.status})`);
  }

  const data = await response.json();

  if (!data.text || data.text.trim().length === 0) {
    throw new Error('No se detectó contenido de texto legible en la página web analizada.');
  }

  const cleanText = data.text.trim();
  const wordCount = cleanText.split(/\s+/).length;

  return {
    url: data.url || url,
    title: data.title || domain,
    text: cleanText,
    charCount: cleanText.length,
    wordCount,
    domain,
    extractedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Formatea el contenido web extraído con encabezados y metadatos claros
 * para inyectarlo en el contexto del prompt de Gemini.
 */
export function formatWebContentForPrompt(extracted: ExtractedWebContent): string {
  return [
    `\n==================================================`,
    `[DOCUMENTO FUENTE: PÁGINA WEB / ARTÍCULO EN LÍNEA]`,
    `Título: ${extracted.title}`,
    `Dominio: ${extracted.domain}`,
    `URL Original: ${extracted.url}`,
    `Palabras extraídas: ${extracted.wordCount} (${extracted.charCount} caracteres)`,
    `==================================================`,
    extracted.text,
    `==================================================\n`,
  ].join('\n');
}
