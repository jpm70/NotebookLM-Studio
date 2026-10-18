import { HostConfig, PodcastScript } from '../types';
import { getStoredApiKey } from './apiKeyStorage';
import {
  isHtmlArticle,
  parseTechnicalArticleHtml,
  buildScriptFromParsedArticle,
} from './articleParser';

export async function generateScriptWithGemini(
  sourceText: string,
  hostA: HostConfig,
  hostB: HostConfig,
  tone: string,
  language: string,
  targetTurns: number = 10,
  userApiKey?: string,
  visualStyle: string = 'anime'
): Promise<PodcastScript> {
  const effectiveKey = userApiKey || getStoredApiKey();

  // Si es un artículo HTML estructurado, podemos parsearlo para extraer puntos, tablas y terminales
  const isArticle = isHtmlArticle(sourceText);
  let parsedArticle = isArticle ? parseTechnicalArticleHtml(sourceText) : null;

  // 1. Intentar a través del servidor backend (cuando se ejecuta en AI Studio o localmente con Express)
  try {
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceText,
        hostA,
        hostB,
        tone,
        language,
        durationTurns: targetTurns,
        visualStyle,
        clientApiKey: effectiveKey || undefined,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.turns && Array.isArray(data.turns)) {
        // Enriquecer con datos de tablas y terminales parseados si el modelo no los devolvió completos
        if (parsedArticle && parsedArticle.sections.length > 0) {
          const localScript = buildScriptFromParsedArticle(parsedArticle, hostA.name, hostB.name);
          // Si el script generado tiene menos diapositivas de tablas/terminales que las encontradas, combinar inteligentemente
          const hasTables = data.turns.some((t: any) => t.tableData || t.slideType === 'table');
          const hasTerminals = data.turns.some((t: any) => t.terminalData || t.slideType === 'terminal');
          
          if (!hasTables || !hasTerminals) {
            // Unir datos de tablas y terminales a los turnos correspondientes
            localScript.turns.forEach((lTurn, idx) => {
              if (data.turns[idx]) {
                if (lTurn.tableData) {
                  data.turns[idx].tableData = lTurn.tableData;
                  data.turns[idx].slideType = 'table';
                }
                if (lTurn.terminalData) {
                  data.turns[idx].terminalData = lTurn.terminalData;
                  data.turns[idx].slideType = 'terminal';
                }
                if (lTurn.relevantText && !data.turns[idx].relevantText) {
                  data.turns[idx].relevantText = lTurn.relevantText;
                }
                if (lTurn.sectionTitle && !data.turns[idx].sectionTitle) {
                  data.turns[idx].sectionTitle = lTurn.sectionTitle;
                }
              }
            });
          }
        }
        return data as PodcastScript;
      }
    }
  } catch {
    // Continuar al cliente estático si el backend no responde
  }

  // Si es un artículo HTML estructurado y no hay clave de API configurada, podemos construir el guion directamente con el parser
  if (!effectiveKey && parsedArticle && parsedArticle.sections.length > 0) {
    return buildScriptFromParsedArticle(parsedArticle, hostA.name, hostB.name);
  }

  // 2. Ejecución directa en navegador para GitHub Pages (sin servidor intermediario)
  if (!effectiveKey) {
    throw new Error(
      'Se requiere una clave de API de Gemini para generar el guion. Configúrala en el botón "Clave de API" en la barra superior.'
    );
  }

  const systemInstruction = `Actúa como productor y guionista de audio senior, emulando el formato conversacional de "NotebookLM Audio Overview".
Crea una conversación de podcast cautivadora, natural y dinámica entre dos interlocutores:
- Host_A (${hostA.name}): ${hostA.role}. Estilo: ${hostA.tone}.
- Host_B (${hostB.name}): ${hostB.role}. Estilo: ${hostB.tone}.

Parámetros:
- Idioma: ${language}
- Tono: ${tone}
- Turnos aproximados: ${targetTurns}
- Usa muletillas conversacionales fluidas, pausas naturales, preguntas incisivas y anécdotas explicativas.
- Por cada turno asigna una emoción ("curioso", "entusiasta", "analítico", "sorprendido", "reflexivo", "divertido"), un 'visual_title' breve (máximo 6 palabras) y un 'visual_prompt' descriptivo en inglés con estética anime ("${visualStyle}").
- REGLA DE ARTÍCULO: Si el texto contiene tablas o comandos de terminal, cada tabla y terminal debe ir a una diapositiva independiente con slideType="table" o "terminal".
- Devuelve estrictamente el esquema JSON indicado.`;

  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${effectiveKey}`;

  const schema = {
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
            emotion: { type: 'STRING' },
            text: { type: 'STRING' },
            visual_title: { type: 'STRING' },
            visual_prompt: { type: 'STRING' },
            slideType: { type: 'STRING', enum: ['table', 'terminal', 'context_anime', 'standard'] },
            relevantText: { type: 'STRING' },
            sectionTitle: { type: 'STRING' },
          },
          required: ['speaker', 'emotion', 'text', 'visual_title', 'visual_prompt'],
        },
      },
    },
    required: ['episode_title', 'episode_summary', 'turns'],
  };

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Por favor transforma el siguiente documento o texto fuente en un guion estructurado de podcast:\\n\\n=== TEXTO FUENTE ===\\n${sourceText.substring(0, 35000)}\\n=== FIN ===`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.75,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  };

  const directRes = await fetch(directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!directRes.ok) {
    const errorJson = await directRes.json().catch(() => null);
    throw new Error(
      errorJson?.error?.message || `Error al conectar con Gemini API (código ${directRes.status}).`
    );
  }

  const resultData = await directRes.json();
  const rawText = resultData?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('La respuesta de Gemini no contiene texto estructurado.');
  }

  try {
    const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const parsedData = JSON.parse(cleaned) as PodcastScript;

    // Enriquecer con tablas y terminales locales si aplica
    if (parsedArticle && parsedArticle.sections.length > 0) {
      const localScript = buildScriptFromParsedArticle(parsedArticle, hostA.name, hostB.name);
      localScript.turns.forEach((lTurn, idx) => {
        if (parsedData.turns[idx]) {
          if (lTurn.tableData && !parsedData.turns[idx].tableData) {
            parsedData.turns[idx].tableData = lTurn.tableData;
            parsedData.turns[idx].slideType = 'table';
          }
          if (lTurn.terminalData && !parsedData.turns[idx].terminalData) {
            parsedData.turns[idx].terminalData = lTurn.terminalData;
            parsedData.turns[idx].slideType = 'terminal';
          }
          if (lTurn.relevantText && !parsedData.turns[idx].relevantText) {
            parsedData.turns[idx].relevantText = lTurn.relevantText;
          }
          if (lTurn.sectionTitle && !parsedData.turns[idx].sectionTitle) {
            parsedData.turns[idx].sectionTitle = lTurn.sectionTitle;
          }
        }
      });
    }

    return parsedData;
  } catch (err) {
    throw new Error('No se pudo decodificar el formato JSON devuelto por el modelo.');
  }
}
