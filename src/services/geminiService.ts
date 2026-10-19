import { DialogueTurn, HostConfig, PodcastScript } from '../types';
import { GenerateOptions, generateContent, parseJsonResponse, responseText } from './gemini';
import {
  isHtmlArticle,
  parseTechnicalArticleHtml,
  buildScriptFromParsedArticle,
} from './articleParser';

const MAX_SOURCE_CHARS = 60000;

/** Quita estilos en línea y comentarios del HTML para no gastar tokens en CSS. */
function compactSource(sourceText: string): string {
  if (!isHtmlArticle(sourceText)) return sourceText.substring(0, MAX_SOURCE_CHARS);
  const compact = sourceText
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\s(?:style|class|width|height|align|valign|cellpadding|cellspacing|border)="[^"]*"/gi, '')
    .replace(/\s{2,}/g, ' ');
  return compact.substring(0, MAX_SOURCE_CHARS);
}

const SCRIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    episode_title: { type: 'STRING', description: 'Título atractivo del episodio estilo podcast de YouTube' },
    episode_summary: { type: 'STRING', description: 'Resumen conciso del episodio en 2-3 frases' },
    turns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          speaker: { type: 'STRING', enum: ['Host_A', 'Host_B'] },
          emotion: { type: 'STRING' },
          text: { type: 'STRING' },
          visual_title: { type: 'STRING' },
          visual_prompt: { type: 'STRING' },
          slideType: { type: 'STRING', enum: ['table', 'terminal', 'context_anime', 'standard'] },
          relevantText: { type: 'STRING' },
          sectionTitle: { type: 'STRING' },
          tableData: {
            type: 'OBJECT',
            properties: {
              headers: { type: 'ARRAY', items: { type: 'STRING' } },
              rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } },
            },
          },
          terminalData: {
            type: 'OBJECT',
            properties: {
              command: { type: 'STRING' },
              lines: { type: 'ARRAY', items: { type: 'STRING' } },
              title: { type: 'STRING' },
            },
          },
        },
        required: ['speaker', 'emotion', 'text', 'visual_title', 'visual_prompt'],
      },
    },
  },
  required: ['episode_title', 'episode_summary', 'turns'],
};

function buildSystemInstruction(
  hostA: HostConfig,
  hostB: HostConfig,
  tone: string,
  language: string,
  targetTurns: number,
  visualStyle: string
): string {
  return `Eres un productor y guionista de podcast de primer nivel, especializado en el formato conversacional de "NotebookLM Audio Overview".
Transforma el material fuente en un diálogo natural, fluido y riguroso entre dos locutores:
- Host_A (${hostA.name}): ${hostA.role}. Estilo: ${hostA.tone}.
- Host_B (${hostB.name}): ${hostB.role}. Estilo: ${hostB.tone}.

Directrices:
1. Idioma: ${language}. Tono: ${tone}.
2. Genera aproximadamente ${targetTurns} turnos bien desarrollados (no menos de 8).
3. Ritmo natural: interjecciones conversacionales ("Exacto", "Espera un segundo", "Mira esto"), analogías cotidianas y preguntas incisivas. Sin inventar datos que no estén en la fuente.
4. Emoción por turno: "curioso", "entusiasta", "analítico", "sorprendido", "reflexivo" o "divertido".
5. visual_title: título en pantalla de 5-7 palabras como máximo.
6. visual_prompt: descripción EN INGLÉS de una ilustración de fondo para ese momento, con estilo "${visualStyle}". Describe sujetos, entorno, composición e iluminación concretos del tema tratado (no genéricos). La imagen NO debe contener texto, letras, logotipos ni interfaces legibles.

REGLAS PARA ARTÍCULOS TÉCNICOS CON PUNTOS, TABLAS Y COMANDOS:
- Genera al menos una diapositiva por cada punto o sección del artículo, en el mismo orden.
- Cada TABLA va a una diapositiva independiente (slideType "table") con 'tableData' copiando headers y rows exactos.
- Cada bloque de COMANDOS (<pre>) va a una diapositiva independiente (slideType "terminal") con 'terminalData' (comando y líneas exactas).
- El resto de diapositivas son slideType "context_anime".
- Rellena siempre 'sectionTitle' con el título del punto del artículo y 'relevantText' con 2-4 ideas clave de esa parte para mostrarlas en pantalla.`;
}

/** Copia tablas, terminales y textos del parser local a los turnos que Gemini dejó sin ellos. */
function enrichWithParsedArticle(script: PodcastScript, sourceText: string, hostA: HostConfig, hostB: HostConfig) {
  if (!isHtmlArticle(sourceText)) return;
  const parsed = parseTechnicalArticleHtml(sourceText);
  if (parsed.sections.length === 0) return;

  const local = buildScriptFromParsedArticle(parsed, hostA.name, hostB.name);
  const hasTables = script.turns.some((t) => t.tableData || t.slideType === 'table');
  const hasTerminals = script.turns.some((t) => t.terminalData || t.slideType === 'terminal');

  local.turns.forEach((lTurn, idx) => {
    const target = script.turns[idx];
    if (!target) return;
    if (lTurn.tableData && !hasTables && !target.tableData) {
      target.tableData = lTurn.tableData;
      target.slideType = 'table';
    }
    if (lTurn.terminalData && !hasTerminals && !target.terminalData) {
      target.terminalData = lTurn.terminalData;
      target.slideType = 'terminal';
    }
    if (lTurn.relevantText && !target.relevantText) target.relevantText = lTurn.relevantText;
    if (lTurn.sectionTitle && !target.sectionTitle) target.sectionTitle = lTurn.sectionTitle;
  });
}

/** Normaliza lo que devuelve el modelo para que el renderizador no reciba estructuras vacías. */
function sanitizeTurns(turns: DialogueTurn[]): DialogueTurn[] {
  return turns
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .map((t) => {
      const turn: DialogueTurn = { ...t, speaker: t.speaker === 'Host_B' ? 'Host_B' : 'Host_A' };
      if (turn.tableData && (!Array.isArray(turn.tableData.headers) || !turn.tableData.headers.length || !Array.isArray(turn.tableData.rows))) {
        delete turn.tableData;
        if (turn.slideType === 'table') turn.slideType = 'context_anime';
      }
      if (turn.terminalData && !Array.isArray(turn.terminalData.lines)) {
        turn.terminalData = { ...turn.terminalData, lines: [] };
      }
      if (turn.terminalData && !turn.terminalData.command && turn.terminalData.lines.length === 0) {
        delete turn.terminalData;
        if (turn.slideType === 'terminal') turn.slideType = 'context_anime';
      }
      return turn;
    });
}

export async function generateScriptWithGemini(
  sourceText: string,
  hostA: HostConfig,
  hostB: HostConfig,
  tone: string,
  language: string,
  targetTurns: number = 10,
  userApiKey?: string,
  visualStyle: string = 'anime',
  options: Pick<GenerateOptions, 'onStatus' | 'signal'> = {}
): Promise<PodcastScript> {
  const { data } = await generateContent(
    'text',
    {
      systemInstruction: {
        parts: [{ text: buildSystemInstruction(hostA, hostB, tone, language, targetTurns, visualStyle) }],
      },
      contents: [
        {
          parts: [
            {
              text: `Analiza el siguiente material fuente y genera el guion completo cumpliendo el esquema JSON, con diapositivas independientes para cada tabla y terminal.\n\n--- MATERIAL FUENTE ---\n${compactSource(sourceText)}\n--- FIN DEL MATERIAL ---`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 32768,
        responseMimeType: 'application/json',
        responseSchema: SCRIPT_SCHEMA,
      },
    },
    { apiKey: userApiKey, onStatus: options.onStatus, signal: options.signal, fastThinking: true }
  );
  options.onStatus?.('Montando las diapositivas…');

  const script = parseJsonResponse<PodcastScript>(data);
  if (!Array.isArray(script.turns) || script.turns.length === 0) {
    throw new Error('Gemini devolvió un guion sin turnos de diálogo.');
  }
  script.turns = sanitizeTurns(script.turns);
  enrichWithParsedArticle(script, sourceText, hostA, hostB);
  return script;
}

/** Extrae el contenido de una imagen (infografía, captura, diagrama) para usarlo como fuente. */
export async function analyzeImageWithGemini(dataUrl: string, mimeType: string): Promise<string> {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const { data } = await generateContent('text', {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } },
          {
            text: 'Analiza detalladamente esta imagen (infografía, gráfico, captura de artículo, diagrama técnico o documento). Extrae todo el texto legible, los datos clave y las conclusiones, y resume el contexto de forma estructurada para que sirva como fuente de un podcast conversacional.',
          },
        ],
      },
    ],
  });
  return responseText(data).trim() || 'Sin texto extraído de la imagen.';
}

export interface YoutubeSeoKit {
  titles: string[];
  description: string;
  tags: string[];
  bestShort?: { recommendedTurnIndex: number; hookReason: string };
}

/**
 * Genera títulos, descripción y etiquetas de YouTube.
 * Los capítulos se pasan ya calculados con las duraciones reales (o estimadas) de cada turno.
 */
export async function generateYoutubeSeo(
  script: PodcastScript,
  chapters: { timestamp: string; title: string }[],
  websiteUrl = 'https://www.unfantasmaenelsistema.com/'
): Promise<YoutubeSeoKit> {
  const chapterList = chapters.map((c) => `${c.timestamp} ${c.title}`).join('\n');
  const prompt = `Actúa como experto en SEO de YouTube para podcasts técnicos del canal "Un Fantasma en el Sistema" (web: ${websiteUrl}).
Episodio: ${script.episode_title}
Resumen: ${script.episode_summary}
Puntos tratados:
${script.turns.map((t, i) => `${i}. ${t.sectionTitle || t.visual_title}`).join('\n')}

Capítulos con marcas de tiempo (úsalos TAL CUAL, sin cambiar los tiempos):
${chapterList}

Devuelve un JSON con:
1. "titles": 3 títulos atractivos con buen CTR (uno pregunta, uno afirmación contundente, uno documental), máximo 95 caracteres cada uno.
2. "description": descripción completa: gancho inicial, resumen en 2 párrafos, la lista de capítulos anterior, llamada a suscribirse a "Un Fantasma en el Sistema", enlace a ${websiteUrl} y 4-6 hashtags.
3. "tags": 15-20 etiquetas SEO.
4. "bestShort": { "recommendedTurnIndex": número (índice del turno más revelador), "hookReason": por qué funcionaría como Short }.`;

  const { data } = await generateContent('text', {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  });
  return parseJsonResponse<YoutubeSeoKit>(data);
}
