import { DialogueTurn, HostConfig, PodcastScript, SlideTableData, SlideTerminalData } from '../types';
import { GenerateOptions, generateContent, parseJsonResponse, responseText } from './gemini';
import { isHtmlArticle, parseTechnicalArticleHtml } from './articleParser';

const MAX_SOURCE_CHARS = 60000;

interface PreparedSource {
  /** Texto limpio para el prompt, con tablas y comandos sustituidos por marcas [TABLA n] / [TERMINAL n]. */
  text: string;
  tables: SlideTableData[];
  terminals: SlideTerminalData[];
  points: number;
}

/**
 * Prepara el artículo para Gemini. Las tablas y bloques de comandos NO se le envían para que los
 * copie (al copiarlos entraba en bucles de repetición y tardaba minutos): se sustituyen por marcas
 * numeradas y la app pone después los datos exactos que extrae el parser.
 */
function prepareSource(sourceText: string): PreparedSource {
  if (!isHtmlArticle(sourceText) || typeof DOMParser === 'undefined') {
    return { text: sourceText.substring(0, MAX_SOURCE_CHARS), tables: [], terminals: [], points: 0 };
  }
  const parsed = parseTechnicalArticleHtml(sourceText);
  const tables = parsed.sections.flatMap((sec) => sec.tables);
  const terminals = parsed.sections.flatMap((sec) => sec.terminals);

  const doc = new DOMParser().parseFromString(sourceText, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  doc.querySelectorAll('table').forEach((tbl, i) => {
    const heads = Array.from(tbl.querySelectorAll('th'))
      .map((th) => th.textContent?.trim() || '')
      .filter(Boolean)
      .slice(0, 6);
    tbl.replaceWith(doc.createTextNode(`\n[TABLA ${i + 1}${heads.length ? `: columnas ${heads.join(', ')}` : ''}]\n`));
  });
  doc.querySelectorAll('pre').forEach((pre, i) => {
    const first = (pre.textContent || '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#')) || '';
    pre.replaceWith(doc.createTextNode(`\n[TERMINAL ${i + 1}: ${first.slice(0, 80)}]\n`));
  });
  doc.querySelectorAll('h1, h2, h3').forEach((h) => h.prepend(doc.createTextNode('\n## ')));
  doc.querySelectorAll('li').forEach((li) => li.prepend(doc.createTextNode('\n- ')));
  doc.querySelectorAll('p, div, h1, h2, h3, ul, ol').forEach((el) => el.append(doc.createTextNode('\n')));

  const text = (doc.body.textContent || '')
    .replace(/[ \t ]{2,}/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .substring(0, MAX_SOURCE_CHARS);
  const points = parsed.sections.filter((sec) => sec.number).length || parsed.sections.length;
  return { text, tables, terminals, points };
}

const SCRIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    episode_title: { type: 'STRING' },
    episode_summary: { type: 'STRING' },
    turns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          speaker: { type: 'STRING', enum: ['Host_A', 'Host_B'] },
          text: { type: 'STRING' },
          emotion: { type: 'STRING', enum: ['curioso', 'entusiasta', 'analítico', 'sorprendido', 'reflexivo', 'divertido'] },
          sectionTitle: { type: 'STRING' },
          visual_title: { type: 'STRING' },
          slideType: { type: 'STRING', enum: ['context_anime', 'table', 'terminal'] },
          tableNumber: { type: 'INTEGER' },
          terminalNumber: { type: 'INTEGER' },
          relevantText: { type: 'STRING' },
          visual_prompt: { type: 'STRING' },
        },
        required: ['speaker', 'text', 'emotion', 'sectionTitle', 'visual_title', 'slideType', 'relevantText', 'visual_prompt'],
        propertyOrdering: [
          'speaker',
          'text',
          'emotion',
          'sectionTitle',
          'visual_title',
          'slideType',
          'tableNumber',
          'terminalNumber',
          'relevantText',
          'visual_prompt',
        ],
      },
    },
  },
  required: ['episode_title', 'episode_summary', 'turns'],
  propertyOrdering: ['episode_title', 'episode_summary', 'turns'],
};

/** Variante del idioma con instrucciones concretas (el acento de las voces sigue al texto). */
function languageInstruction(language: string): string {
  if (/latino/i.test(language)) return 'español latinoamericano neutro';
  if (/^espa/i.test(language)) {
    return 'español de España (castellano peninsular): usa "vosotros", vocabulario y expresiones de España, y evita latinoamericanismos';
  }
  return language;
}

function buildSystemInstruction(
  hostA: HostConfig,
  hostB: HostConfig,
  tone: string,
  language: string,
  turnRange: [number, number],
  visualStyle: string,
  source: PreparedSource
): string {
  const [minTurns, maxTurns] = turnRange;
  const markers =
    source.tables.length || source.terminals.length
      ? `\n- El material tiene ${source.tables.length} tablas marcadas [TABLA n] y ${source.terminals.length} bloques de comandos marcados [TERMINAL n]. Cada uno va en su propia diapositiva: slideType "table" con tableNumber n, o slideType "terminal" con terminalNumber n. NO copies su contenido: la app lo añade.`
      : '';
  return `Eres un guionista de podcast de primer nivel, especializado en el formato conversacional de "NotebookLM Audio Overview".
Convierte el material fuente en un diálogo natural, fluido y riguroso entre dos locutores:
- Host_A (${hostA.name}): ${hostA.role}. Estilo: ${hostA.tone}.
- Host_B (${hostB.name}): ${hostB.role}. Estilo: ${hostB.tone}.

Directrices:
- Idioma: ${languageInstruction(language)}. Tono: ${tone}.
- Genera entre ${minTurns} y ${maxTurns} turnos, al menos uno por cada punto (##) del material y en el mismo orden. Cada intervención de 40 a 90 palabras, conversacional, sin inventar datos que no estén en la fuente.
- sectionTitle: el título del punto del material al que corresponde el turno.
- visual_title: título en pantalla de 7 palabras como máximo.
- relevantText: 2-4 ideas clave breves de esa parte, separadas por punto y coma (máximo 200 caracteres en total).
- visual_prompt: UNA frase en inglés (máximo 30 palabras) que describa una ilustración de fondo concreta para ese momento, con estilo "${visualStyle}". Sin texto, letras, logotipos ni interfaces legibles en la imagen.${markers}
- El resto de diapositivas son slideType "context_anime".`;
}

/** Recorta campos desbocados (bucles de repetición del modelo) y pone los datos exactos de tablas y terminales. */
function finalizeTurns(turns: any[], source: PreparedSource): DialogueTurn[] {
  // Sin las marcas "##" de los puntos que se le pasan como contexto, ni negritas de markdown
  const clip = (v: unknown, max: number) =>
    typeof v === 'string' ? v.replace(/^\s*#{1,6}\s*/gm, '').replace(/\*\*/g, '').trim().slice(0, max) : '';
  return turns
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .map((t) => {
      const turn: DialogueTurn = {
        speaker: t.speaker === 'Host_B' ? 'Host_B' : 'Host_A',
        text: clip(t.text, 1500),
        emotion: clip(t.emotion, 30) || 'reflexivo',
        visual_title: clip(t.visual_title, 90),
        visual_prompt: clip(t.visual_prompt, 400),
        sectionTitle: clip(t.sectionTitle, 120) || undefined,
        relevantText: clip(t.relevantText, 400) || undefined,
        slideType: 'context_anime',
      };
      const tableIdx = Number(t.tableNumber) - 1;
      const termIdx = Number(t.terminalNumber) - 1;
      if (t.slideType === 'table' && source.tables[tableIdx]) {
        turn.slideType = 'table';
        turn.tableData = source.tables[tableIdx];
      } else if (t.slideType === 'terminal' && source.terminals[termIdx]) {
        turn.slideType = 'terminal';
        turn.terminalData = source.terminals[termIdx];
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
  const source = prepareSource(sourceText);
  // Dos turnos por punto del artículo (pregunta y respuesta), con un mínimo razonable
  const minTurns = Math.max(10, source.points * 2, Math.min(targetTurns, 30));
  const turnRange: [number, number] = [minTurns, minTurns + 6];

  const { data } = await generateContent(
    'text',
    {
      systemInstruction: {
        parts: [{ text: buildSystemInstruction(hostA, hostB, tone, language, turnRange, visualStyle, source) }],
      },
      contents: [{ parts: [{ text: `MATERIAL FUENTE:\n${source.text}` }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: SCRIPT_SCHEMA,
      },
    },
    { apiKey: userApiKey, onStatus: options.onStatus, signal: options.signal, fastThinking: true }
  );
  options.onStatus?.('Montando las diapositivas…');

  const raw = parseJsonResponse<any>(data);
  if (!Array.isArray(raw.turns) || raw.turns.length === 0) {
    throw new Error('Gemini devolvió un guion sin turnos de diálogo.');
  }
  return {
    episode_title: String(raw.episode_title || '').slice(0, 150),
    episode_summary: String(raw.episode_summary || '').slice(0, 600),
    turns: finalizeTurns(raw.turns, source),
  };
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
