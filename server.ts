import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to instantiate Gemini client
function getGeminiClient(customApiKey?: string) {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('No se encontró clave de API de Gemini (GEMINI_API_KEY). Configúrala en la interfaz o en las variables de entorno.');
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint to verify API key
app.post('/api/verify-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Responde únicamente con la palabra OK.',
    });
    if (response.text) {
      return res.json({ success: true, message: 'Clave de API válida y conectada.' });
    }
    return res.status(400).json({ success: false, message: 'Respuesta vacía del modelo.' });
  } catch (error: any) {
    console.error('Error verificando API key:', error);
    return res.status(400).json({
      success: false,
      message: error?.message || 'Error validando la clave de API.',
    });
  }
});

// Endpoint to generate structured script
app.post('/api/generate-script', async (req, res) => {
  try {
    const { sourceText, hostA, hostB, tone, language, durationTurns, visualStyle = 'studio', clientApiKey } = req.body;

    if (!sourceText || sourceText.trim().length === 0) {
      return res.status(400).json({ error: 'El texto fuente o documento no puede estar vacío.' });
    }

    const ai = getGeminiClient(clientApiKey);

    const systemInstruction = `Eres un productor y guionista de audio podcast de clase mundial, especializado en el formato conversacional dinámico y adictivo de "NotebookLM Audio Overview".
Tu misión es transformar el material fuente proporcionado en un diálogo de podcast cautivador, natural y fluido entre dos locutores:
- Host_A: ${hostA?.name || 'Alex'} (${hostA?.role || 'Explicador técnico y analítico'})
- Host_B: ${hostB?.name || 'Sam'} (${hostB?.role || 'Curioso, hace preguntas incisivas y busca analogías cotidianas'})

Directrices de conversación:
1. Tono: ${tone || 'Divulgativo y ameno'}.
2. Idioma: ${language || 'Español'}.
3. Longitud estimada: Genera aproximadamente entre ${durationTurns || 8} y 14 turnos de diálogo bien desarrollados.
4. Ritmo y espontaneidad: Emplea muletillas naturales, interjecciones conversacionales (como "Exacto", "Totalmente", "Espera un segundo", "¿De verdad?", "Mira esto"), analogías frescas y contrastes de opinión constructivos.
5. Emociones asignables a cada turno: "curioso", "entusiasta", "analítico", "sorprendido", "reflexivo", "divertido".
6. Visual Title: Un título conciso en pantalla (máximo 5-7 palabras) que resume el concepto clave abordado en ese fragmento.
7. Visual Prompt: Un prompt temático descriptivo en inglés alineado con el estilo visual del proyecto ("${visualStyle}"). Debe incluir la descripción de sujetos, entorno e iluminación adaptado al estilo:
   - Si anime: incluye descriptores como "vibrant anime illustration, Makoto Shinkai aesthetic, luminous lighting, clean line art".
   - Si pizarra (whiteboard): incluye "clean educational chalkboard sketch, hand-drawn diagrams, chalk texture".
   - Si cinemático (studio): incluye "cinematic film still, 35mm photography, volumetric lighting, photorealistic textures, 8k".
   - Si minimalista (minimal): incluye "minimalist graphic design, clean geometric shapes, elegant negative space, Swiss style".
   - Si cyberpunk: incluye "cyberpunk digital art, neon lights, glowing cyan and magenta hologram elements".

REGLAS CRÍTICAS PARA ARTÍCULOS TÉCNICOS CON PUNTOS, TABLAS Y COMANDOS:
- Genera tantas diapositivas como puntos o secciones tenga el artículo.
- Cada TABLA debe ir a una diapositiva independiente (slideType: "table"), rellenando 'tableData' con sus headers y rows exactos.
- Cada pantalla de COMANDOS DE TERMINAL (<pre> o bloques bash) debe ir a una diapositiva independiente (slideType: "terminal"), rellenando 'terminalData' con el comando y sus líneas.
- El resto de diapositivas conceptuales tendrán slideType: "context_anime" y un visual_prompt descriptivo con estética anime.
- Incluye siempre en 'relevantText' un resumen o viñetas relevantes de esa parte del artículo para mostrar en pantalla.`;

    const prompt = `Analiza detenidamente el siguiente material fuente y genera el guion estructurado del episodio:

--- MATERIAL FUENTE ---
${sourceText.substring(0, 35000)}
--- FIN DEL MATERIAL ---

Genera el guion completo cumpliendo rigurosamente el esquema JSON solicitado, asegurando diapositivas independientes para cada tabla y terminal.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            episode_title: {
              type: Type.STRING,
              description: 'Título atractivo e intrigante del episodio estilo YouTube podcast',
            },
            episode_summary: {
              type: Type.STRING,
              description: 'Resumen conciso del episodio en 2-3 frases',
            },
            turns: {
              type: Type.ARRAY,
              description: 'Lista ordenada de turnos de diálogo alternados entre los locutores',
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: {
                    type: Type.STRING,
                    description: 'Identificador del locutor: estrictamente "Host_A" o "Host_B"',
                  },
                  emotion: {
                    type: Type.STRING,
                    description: 'Emoción predominante del turno (ej: curioso, entusiasta, analítico, sorprendido)',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'Diálogo completo, natural y fluido con ritmo de podcast',
                  },
                  visual_title: {
                    type: Type.STRING,
                    description: 'Título conceptual corto para aparecer en pantalla durante este segmento',
                  },
                  visual_prompt: {
                    type: Type.STRING,
                    description: 'Prompt temático descriptivo en inglés para apoyo visual (preferiblemente estilo anime)',
                  },
                  slideType: {
                    type: Type.STRING,
                    description: 'Tipo de diapositiva: "table", "terminal", "context_anime" o "standard"',
                  },
                  relevantText: {
                    type: Type.STRING,
                    description: 'Texto relevante o viñetas destacadas de esta sección del artículo',
                  },
                  sectionTitle: {
                    type: Type.STRING,
                    description: 'Título del punto o sección correspondiente en el artículo',
                  },
                  tableData: {
                    type: Type.OBJECT,
                    description: 'Datos estructurados si este turno es una tabla independiente',
                    properties: {
                      headers: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      rows: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                    },
                  },
                  terminalData: {
                    type: Type.OBJECT,
                    description: 'Datos de la consola si este turno es una pantalla de terminal independiente',
                    properties: {
                      command: { type: Type.STRING },
                      lines: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      title: { type: Type.STRING },
                    },
                  },
                },
                required: ['speaker', 'emotion', 'text', 'visual_title', 'visual_prompt'],
              },
            },
          },
          required: ['episode_title', 'episode_summary', 'turns'],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      return res.status(500).json({ error: 'No se recibió texto del modelo Gemini.' });
    }

    const scriptData = JSON.parse(outputText);
    return res.json(scriptData);
  } catch (error: any) {
    console.error('Error generando guion:', error);
    return res.status(500).json({
      error: error?.message || 'Error interno al comunicarse con el modelo Gemini.',
    });
  }
});

// Endpoint to fetch and extract readable text from a URL
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'La URL proporcionada no es válida.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return res.status(400).json({ error: 'Formato de URL no válido. Debe comenzar por http:// o https://' });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return res.status(400).json({ error: `No se pudo obtener la página (Código HTTP ${response.status})` });
    }

    const html = await response.text();

    // Extraer título desde og:title o <title> o <h1>
    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;
    }

    // Intentar extraer cuerpo principal si hay <article>, <main> o contenedor de artículo
    let targetHtml = html;
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const wikiMatch = html.match(/<div\b[^>]*class=["'][^"']*mw-parser-output[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    if (articleMatch && articleMatch[1].length > 400) {
      targetHtml = articleMatch[1];
    } else if (mainMatch && mainMatch[1].length > 400) {
      targetHtml = mainMatch[1];
    } else if (wikiMatch && wikiMatch[1].length > 400) {
      targetHtml = wikiMatch[1];
    }

    // Limpiar HTML: scripts, estilos, navigation, iframes, formularios, dialogos, svgs
    let clean = targetHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    // Decodificar entidades HTML comunes
    clean = clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–');

    // Normalizar espacios y saltos de línea
    clean = clean
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Limitar longitud para ingesta en el prompt
    const truncated = clean.substring(0, 40000);

    return res.json({
      title,
      text: truncated,
      url: parsedUrl.toString(),
    });
  } catch (error: any) {
    console.error('Error obteniendo URL:', error);
    return res.status(500).json({ error: error?.message || 'Error al conectar con la URL especificada.' });
  }
});

// Endpoint to analyze and extract information from an uploaded image (multimodal)
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', clientApiKey } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se recibió la imagen en formato base64.' });
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const ai = getGeminiClient(clientApiKey);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Analiza detalladamente esta imagen (puede ser una infografía, gráfico, captura de artículo, diagrama técnico o documento). Extrae todo el texto legible, los datos cuantitativos clave, las conclusiones principales y resume el contexto temático completo de forma estructurada para que sirva como fuente rica de un podcast conversacional.',
          },
        ],
      },
    });

    const outputText = response.text || '';
    return res.json({ text: outputText });
  } catch (error: any) {
    console.error('Error analizando imagen:', error);
    return res.status(500).json({ error: error?.message || 'Error procesando la imagen con Gemini.' });
  }
});

// Endpoint to synthesize audio using Gemini Neural TTS (studio grade)
app.post('/api/tts-synthesize', async (req, res) => {
  try {
    const { text, voiceName = 'Puck', emotion, clientApiKey } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'El texto a sintetizar no puede estar vacío.' });
    }

    const ai = getGeminiClient(clientApiKey);

    // Mapeo seguro a voces preconstruidas oficiales: Puck, Charon, Kore, Fenrir, Zephyr, Aoede, Leda, Orpheus
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Leda', 'Orpheus'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Puck';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return res.status(500).json({ error: 'No se generó pista de audio del modelo TTS.' });
    }

    return res.json({
      audioBase64,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error sintetizando audio con Gemini TTS:', error);
    return res.status(500).json({
      error: error?.message || 'Error generando voz con Gemini TTS.',
    });
  }
});

// Endpoint to extract YouTube video metadata and captions/transcript
app.post('/api/fetch-youtube-transcript', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'La URL de YouTube no es válida.' });
    }

    // Extraer ID de vídeo de YouTube
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    if (!match) {
      return res.status(400).json({ error: 'No se reconoció un ID de vídeo de YouTube válido en la URL.' });
    }
    const videoId = match[1];

    // Obtener la página del vídeo para extraer título, autor y subtítulos
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!ytRes.ok) {
      return res.status(400).json({ error: `No se pudo conectar con YouTube (HTTP ${ytRes.status})` });
    }

    const html = await ytRes.text();

    // Extraer título del vídeo
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `Vídeo de YouTube (${videoId})`;

    // Extraer autor/canal
    const authorMatch = html.match(/"author":\s*"([^"]+)"/i) || html.match(/"ownerChannelName":\s*"([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : 'Canal de YouTube';

    // Extraer descripción corta
    const descMatch = html.match(/"shortDescription":\s*"([^"]+)"/i);
    const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').substring(0, 3000) : '';

    let transcript = '';
    // Intentar extraer pista de subtítulos de ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/s);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          // Priorizar español ('es'), luego inglés ('en'), o la primera pista
          const selectedTrack =
            captionTracks.find((t: any) => t.languageCode?.startsWith('es')) ||
            captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
            captionTracks[0];

          if (selectedTrack?.baseUrl) {
            const trackRes = await fetch(selectedTrack.baseUrl, { signal: AbortSignal.timeout(10000) });
            if (trackRes.ok) {
              const xml = await trackRes.text();
              const textMatches = Array.from(xml.matchAll(/<text[^>]*start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi));
              if (textMatches.length > 0) {
                transcript = textMatches
                  .map((m) => {
                    const sec = Math.floor(parseFloat(m[1]));
                    const mins = Math.floor(sec / 60);
                    const remSec = sec % 60;
                    const timeTag = `[${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}]`;
                    const decodedText = m[2]
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&#39;/g, "'")
                      .replace(/&quot;/g, '"')
                      .replace(/\n/g, ' ')
                      .trim();
                    return `${timeTag} ${decodedText}`;
                  })
                  .filter((line) => line.length > 8)
                  .join('\n');
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error analizando playerResponse de YouTube:', e);
      }
    }

    const effectiveText = transcript || `Descripción y contenido del vídeo:\n${description}`;

    return res.json({
      videoId,
      title,
      author,
      url: ytUrl,
      transcript: transcript || null,
      fullText: effectiveText.substring(0, 35000),
      hasSubtitles: Boolean(transcript),
    });
  } catch (error: any) {
    console.error('Error extrayendo transcripción de YouTube:', error);
    return res.status(500).json({ error: error?.message || 'Error al obtener la información del vídeo de YouTube.' });
  }
});

// Endpoint to generate illustrated background for a turn (Image Gen / Conceptual AI Visual)
app.post('/api/generate-turn-image', async (req, res) => {
  try {
    const { visualPrompt, visualTitle = 'Concepto Clave', visualStyle = 'studio', clientApiKey } = req.body;
    if (!visualPrompt) {
      return res.status(400).json({ error: 'Se requiere visualPrompt.' });
    }

    const ai = getGeminiClient(clientApiKey);

    // Prompt configurado según el estilo visual predefinido del proyecto
    let styledPrompt = '';
    if (visualStyle === 'anime') {
      styledPrompt = `Vibrant Japanese anime style, Makoto Shinkai aesthetic, Studio Ghibli inspired, expressive anime colors, clean line art, luminous lighting: ${visualPrompt}. Masterpiece, highly detailed, without text or typography.`;
    } else if (visualStyle === 'whiteboard') {
      styledPrompt = `Clean educational whiteboard sketch illustration, chalkboard and marker drawing style, hand-drawn diagrams and doodles, clean instructional visual: ${visualPrompt}. High contrast, educational infographic style, no messy text.`;
    } else if (visualStyle === 'minimal' || visualStyle === 'minimalist') {
      styledPrompt = `Minimalist modern graphic design, Bauhaus and Swiss style, clean geometric shapes, limited sophisticated color palette, elegant negative space: ${visualPrompt}. Clean flat vector aesthetic, minimal and sleek, no text.`;
    } else if (visualStyle === 'cyberpunk') {
      styledPrompt = `Cyberpunk futuristic digital art, neon lights, glowing cyan and magenta hologram elements, high-tech dystopian atmosphere, octane render: ${visualPrompt}. Clean digital art without text.`;
    } else {
      // 'studio' o cinemático
      styledPrompt = `Cinematic movie still, dramatic 35mm film photography, volumetric lighting, photorealistic textures, 8k resolution, award-winning cinematography: ${visualPrompt}. Clean composition without text or logos.`;
    }

    // 1. Intentar con Imagen 3 si está disponible
    try {
      const imgRes = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: styledPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      });

      const base64Bytes = imgRes.generatedImages?.[0]?.image?.imageBytes;
      if (base64Bytes) {
        return res.json({
          imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
          source: 'imagen-3',
          appliedStyle: visualStyle,
        });
      }
    } catch (e: any) {
      console.log(`Imagen 3 no disponible o sin cuota (${e?.message}), procediendo con generador visual de diseño conceptual para estilo: ${visualStyle}`);
    }

    // 2. Generador de Arte Vectorial Conceptual adaptado al Estilo Visual
    const safeTitle = visualTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let svgIllustration = '';

    if (visualStyle === 'anime') {
      // Estilo Paisaje Cinemático Anime Makoto Shinkai / Studio Ghibli
      svgIllustration = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <radialGradient id="animeSky" cx="50%" cy="15%" r="90%">
            <stop offset="0%" stop-color="#1e1035" />
            <stop offset="35%" stop-color="#2d0b4e" />
            <stop offset="70%" stop-color="#4a0e4e" />
            <stop offset="100%" stop-color="#090514" />
          </radialGradient>
          <linearGradient id="horizonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f472b6" stop-opacity="0.3" />
            <stop offset="50%" stop-color="#c084fc" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.05" />
          </linearGradient>
          <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#animeSky)" />
        <rect y="320" width="1280" height="400" fill="url(#horizonGlow)" />
        
        <!-- Constelaciones y destellos anime celestiales -->
        <circle cx="210" cy="110" r="2.2" fill="#ffffff" opacity="0.95" />
        <circle cx="280" cy="160" r="3.5" fill="#f472b6" opacity="0.9" />
        <circle cx="340" cy="90" r="2" fill="#ffffff" opacity="0.8" />
        <circle cx="890" cy="80" r="3" fill="#38bdf8" opacity="0.85" />
        <circle cx="980" cy="140" r="4" fill="#ffffff" opacity="0.95" />
        <circle cx="1060" cy="100" r="2.5" fill="#c084fc" opacity="0.9" />
        <circle cx="740" cy="60" r="1.8" fill="#ffffff" opacity="0.75" />
        <circle cx="1180" cy="190" r="2.8" fill="#f472b6" opacity="0.8" />
        <circle cx="120" cy="220" r="3.2" fill="#38bdf8" opacity="0.8" />

        <!-- Luna celestial o nodo anime de energía -->
        <circle cx="1020" cy="180" r="120" fill="none" stroke="#f472b6" stroke-width="1.5" opacity="0.3" stroke-dasharray="14 10" />
        <circle cx="1020" cy="180" r="70" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.4" />
        <circle cx="1020" cy="180" r="45" fill="#ffffff" opacity="0.12" />

        <!-- Siluetas suaves de horizonte y montañas distantes -->
        <path d="M 0 540 Q 340 460 640 510 T 1280 480 L 1280 720 L 0 720 Z" fill="#0d081f" opacity="0.7" />
        <path d="M 0 590 Q 420 520 820 570 T 1280 540 L 1280 720 L 0 720 Z" fill="#06030c" opacity="0.85" />

        <!-- Destellos flotantes de sakura / partículas anime -->
        <circle cx="380" cy="420" r="3" fill="#f472b6" opacity="0.7" />
        <circle cx="440" cy="380" r="2" fill="#ffffff" opacity="0.8" />
        <circle cx="560" cy="460" r="2.5" fill="#c084fc" opacity="0.6" />
        <circle cx="720" cy="400" r="3.5" fill="#38bdf8" opacity="0.7" />
        <circle cx="860" cy="440" r="2" fill="#f472b6" opacity="0.6" />

        <!-- Badge discreto de entorno anime superior -->
        <g transform="translate(640, 52)">
          <rect x="-190" y="-18" width="380" height="36" rx="18" fill="#090514" fill-opacity="0.8" stroke="url(#neonCyan)" stroke-width="1.2" />
          <text x="0" y="5" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="800" fill="#f472b6" text-anchor="middle" letter-spacing="3">🎌 ANIME SCENERY • MAKOTO SHINKAI</text>
        </g>
      </svg>`;
    } else if (visualStyle === 'whiteboard') {
      // Estilo Pizarra Escolar / Masterclass TED
      svgIllustration = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <linearGradient id="chalkBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f291e" />
            <stop offset="50%" stop-color="#143527" />
            <stop offset="100%" stop-color="#0a1c14" />
          </linearGradient>
          <pattern id="chalkGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#34d399" stroke-width="0.8" opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#chalkBg)" />
        <rect width="100%" height="100%" fill="url(#chalkGrid)" />
        <!-- Marco de madera de pizarra -->
        <rect x="8" y="8" width="1264" height="704" fill="none" stroke="#92400e" stroke-width="12" opacity="0.5" />
        <!-- Bocetos y flechas de tiza -->
        <g stroke="#ffffff" stroke-width="2" fill="none" stroke-dasharray="6 4" opacity="0.4">
          <circle cx="340" cy="240" r="90" />
          <path d="M 430 240 Q 640 180 840 240" />
          <rect x="840" y="190" width="120" height="100" rx="8" />
          <path d="M 280 500 C 450 420 800 620 1020 480" />
        </g>
        <!-- Tarjeta Central de Pizarra -->
        <g transform="translate(640, 340)">
          <rect x="-260" y="-85" width="520" height="170" rx="16" fill="#061a12" fill-opacity="0.9" stroke="#34d399" stroke-width="2" stroke-dasharray="8 5" />
          <circle cx="-200" cy="0" r="34" fill="#10b981" fill-opacity="0.18" stroke="#34d399" stroke-width="2" />
          <text x="-200" y="8" font-family="sans-serif" font-size="28" font-weight="bold" fill="#34d399" text-anchor="middle">🎓</text>
          <text x="-140" y="-10" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#f0fdf4">${safeTitle}</text>
          <text x="-140" y="24" font-family="monospace, sans-serif" font-size="12" font-weight="700" fill="#34d399">PIZARRA MASTERCLASS • ESQUEMA DE TIZA</text>
        </g>
      </svg>`;
    } else if (visualStyle === 'minimal' || visualStyle === 'minimalist') {
      // Estilo Minimalista Cine / Bauhaus
      svgIllustration = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <linearGradient id="minBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#141417" />
            <stop offset="50%" stop-color="#1c1c22" />
            <stop offset="100%" stop-color="#0d0d10" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#minBg)" />
        <line x1="120" y1="180" x2="1160" y2="180" stroke="#ffffff" stroke-width="1" opacity="0.12" />
        <line x1="120" y1="540" x2="1160" y2="540" stroke="#ffffff" stroke-width="1" opacity="0.12" />
        <circle cx="640" cy="360" r="180" fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.15" />
        <g transform="translate(640, 360)">
          <rect x="-240" y="-75" width="480" height="150" rx="8" fill="#09090b" fill-opacity="0.9" stroke="#475569" stroke-width="1.5" />
          <text x="0" y="-8" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#f8fafc" text-anchor="middle">${safeTitle}</text>
          <text x="0" y="26" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" letter-spacing="4" text-anchor="middle">MINIMALIST DOCUMENTAL • SWISS LAYOUT</text>
        </g>
      </svg>`;
    } else if (visualStyle === 'cyberpunk') {
      // Estilo Cyberpunk Neón 2077
      svgIllustration = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <linearGradient id="cyberBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#030712" />
            <stop offset="50%" stop-color="#0b1736" />
            <stop offset="100%" stop-color="#010308" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyberBg)" />
        <!-- Rejilla en perspectiva 3D -->
        <g stroke="#06b6d4" stroke-width="1.5" opacity="0.25">
          <line x1="640" y1="360" x2="80" y2="720" />
          <line x1="640" y1="360" x2="280" y2="720" />
          <line x1="640" y1="360" x2="480" y2="720" />
          <line x1="640" y1="360" x2="800" y2="720" />
          <line x1="640" y1="360" x2="1000" y2="720" />
          <line x1="640" y1="360" x2="1200" y2="720" />
          <line x1="0" y1="460" x2="1280" y2="460" />
          <line x1="0" y1="540" x2="1280" y2="540" />
          <line x1="0" y1="630" x2="1280" y2="630" />
        </g>
        <!-- Tarjeta Cyberpunk -->
        <g transform="translate(640, 320)">
          <rect x="-260" y="-80" width="520" height="160" rx="16" fill="#030712" fill-opacity="0.9" stroke="#06b6d4" stroke-width="2" />
          <circle cx="-200" cy="0" r="32" fill="#06b6d4" fill-opacity="0.18" stroke="#22d3ee" stroke-width="2" />
          <text x="-200" y="8" font-family="sans-serif" font-size="26" font-weight="bold" fill="#22d3ee" text-anchor="middle">🤖</text>
          <text x="-140" y="-10" font-family="system-ui, monospace" font-size="22" font-weight="900" fill="#ffffff">${safeTitle}</text>
          <text x="-140" y="24" font-family="monospace" font-size="12" font-weight="700" fill="#06b6d4">CYBERPUNK MATRIX • REJILLA NEÓN 2077</text>
        </g>
      </svg>`;
    } else {
      // Estilo Cinemático / Studio Pro
      svgIllustration = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <radialGradient id="cineBg" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="55%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
          </radialGradient>
          <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.7" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cineBg)" />
        <circle cx="640" cy="340" r="280" fill="none" stroke="url(#goldLight)" stroke-width="2" opacity="0.35" stroke-dasharray="10 8" />
        <circle cx="640" cy="340" r="180" fill="#f59e0b" opacity="0.05" />
        <!-- Tarjeta Central Cinemática -->
        <g transform="translate(640, 320)">
          <rect x="-260" y="-80" width="520" height="160" rx="22" fill="#020617" fill-opacity="0.85" stroke="#f59e0b" stroke-width="2" />
          <circle cx="-200" cy="0" r="32" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="2" />
          <text x="-200" y="8" font-family="sans-serif" font-size="26" font-weight="bold" fill="#f59e0b" text-anchor="middle">🎬</text>
          <text x="-140" y="-8" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#f8fafc">${safeTitle}</text>
          <text x="-140" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#f59e0b" letter-spacing="1">CINEMÁTICO STUDIO PRO • 35MM VOLUMÉTRICO</text>
        </g>
      </svg>`;
    }

    const base64Svg = Buffer.from(svgIllustration).toString('base64');
    return res.json({
      imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
      source: 'conceptual-vector',
      appliedStyle: visualStyle,
    });
  } catch (error: any) {
    console.error('Error generando imagen de turno:', error);
    return res.status(500).json({ error: error?.message || 'Error al generar la imagen.' });
  }
});

// Endpoint para generar en lote fondos anime con estética consistente para todas las diapositivas
app.post('/api/generate-anime-batch', async (req, res) => {
  try {
    const { turns, animeMood = 'shinkai', episodeTitle = 'Podcast', clientApiKey } = req.body;
    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de turnos válida.' });
    }

    const ai = getGeminiClient(clientApiKey);
    const backgrounds: Record<number, string> = {};

    // Paletas consistentes por estilo anime
    const moodPalettes = {
      shinkai: {
        skyTop: '#130924',
        skyMid: '#3b0d5c',
        skyBot: '#6d1b7b',
        glow: '#f472b6',
        accent: '#38bdf8',
        starsColor: '#ffffff',
        tag: '🎌 SHINKAI TWILIGHT • ANIME CINEMATIC',
      },
      cyberpunk: {
        skyTop: '#030712',
        skyMid: '#0f172a',
        skyBot: '#1e1b4b',
        glow: '#06b6d4',
        accent: '#ec4899',
        starsColor: '#38bdf8',
        tag: '🌃 CYBERPUNK NEO-TOKYO • ANIME 2077',
      },
      ghibli: {
        skyTop: '#064e3b',
        skyMid: '#065f46',
        skyBot: '#047857',
        glow: '#fbbf24',
        accent: '#34d399',
        starsColor: '#fef08a',
        tag: '🌿 GHIBLI TECH GARDEN • ANIME PASTORAL',
      },
    };

    const palette = moodPalettes[animeMood as keyof typeof moodPalettes] || moodPalettes.shinkai;

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const title = turn.visualTitle || turn.sectionTitle || `Punto ${i + 1}`;
      const prompt = turn.visualPrompt || `Anime scenery for ${title}`;
      let imageUrl = '';

      // Intentar Imagen 3 con prompt consistente si la clave lo soporta
      try {
        const unifiedPrompt = `Consistent Makoto Shinkai anime aesthetic, award-winning anime scenery art direction, ${palette.tag}, twilight sky with indigo, magenta and cyan volumetric clouds, glowing particles, beautiful anime landscape without text: ${prompt}. Masterpiece, 4k resolution.`;
        const imgRes = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: unifiedPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
          },
        });
        const base64Bytes = imgRes.generatedImages?.[0]?.image?.imageBytes;
        if (base64Bytes) {
          imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
        }
      } catch {
        // Fallback al generador de paisajes vectoriales anime armónicos
      }

      if (!imageUrl) {
        // Generador de paisajes escénicos con coherencia visual garantizada
        const moonRadius = 60 + (i % 3) * 15;
        const moonX = 300 + (i * 140) % 700;
        const mountainH1 = 520 + (i * 12) % 40;
        const mountainH2 = 570 + (i * 18) % 35;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
          <defs>
            <radialGradient id="skyGrad${i}" cx="50%" cy="20%" r="95%">
              <stop offset="0%" stop-color="${palette.skyTop}" />
              <stop offset="45%" stop-color="${palette.skyMid}" />
              <stop offset="85%" stop-color="${palette.skyBot}" />
              <stop offset="100%" stop-color="#040209" />
            </radialGradient>
            <linearGradient id="horizonGrad${i}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.28" />
              <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#skyGrad${i})" />
          <rect y="300" width="1280" height="420" fill="url(#horizonGrad${i})" />

          <!-- Estrellas y constelaciones -->
          <circle cx="150" cy="80" r="2.2" fill="${palette.starsColor}" opacity="0.9" />
          <circle cx="280" cy="140" r="3.2" fill="${palette.glow}" opacity="0.85" />
          <circle cx="390" cy="95" r="2.5" fill="${palette.starsColor}" opacity="0.8" />
          <circle cx="720" cy="65" r="3.5" fill="${palette.accent}" opacity="0.9" />
          <circle cx="880" cy="115" r="2.8" fill="${palette.starsColor}" opacity="0.95" />
          <circle cx="1020" cy="70" r="4.0" fill="${palette.glow}" opacity="0.9" />
          <circle cx="1140" cy="150" r="2.4" fill="${palette.starsColor}" opacity="0.8" />
          <circle cx="620" cy="180" r="1.8" fill="${palette.starsColor}" opacity="0.75" />

          <!-- Astro o nodo celestial anime -->
          <circle cx="${moonX}" cy="160" r="${moonRadius}" fill="none" stroke="${palette.glow}" stroke-width="1.6" opacity="0.32" stroke-dasharray="14 10" />
          <circle cx="${moonX}" cy="160" r="${moonRadius * 0.6}" fill="none" stroke="${palette.accent}" stroke-width="1.2" opacity="0.45" />
          <circle cx="${moonX}" cy="160" r="${moonRadius * 0.35}" fill="${palette.starsColor}" opacity="0.12" />

          <!-- Montañas y siluetas con profundidad de niebla -->
          <path d="M 0 ${mountainH1} Q 360 ${mountainH1 - 60} 700 ${mountainH1} T 1280 ${mountainH1 - 30} L 1280 720 L 0 720 Z" fill="#0d081f" opacity="0.65" />
          <path d="M 0 ${mountainH2} Q 460 ${mountainH2 - 50} 920 ${mountainH2 + 10} T 1280 ${mountainH2 - 20} L 1280 720 L 0 720 Z" fill="#05030a" opacity="0.88" />

          <!-- Partículas sakura / chispas luminosas flotantes -->
          <circle cx="220" cy="440" r="2.8" fill="${palette.glow}" opacity="0.75" />
          <circle cx="480" cy="390" r="3.2" fill="${palette.accent}" opacity="0.8" />
          <circle cx="680" cy="450" r="2.2" fill="${palette.starsColor}" opacity="0.7" />
          <circle cx="890" cy="380" r="3.6" fill="${palette.glow}" opacity="0.7" />
          <circle cx="1080" cy="430" r="2.5" fill="${palette.accent}" opacity="0.65" />

          <!-- Badge temático superior -->
          <g transform="translate(640, 48)">
            <rect x="-210" y="-16" width="420" height="32" rx="16" fill="#080410" fill-opacity="0.85" stroke="${palette.accent}" stroke-width="1.2" />
            <text x="0" y="5" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="800" fill="${palette.glow}" text-anchor="middle" letter-spacing="3">${palette.tag}</text>
          </g>
        </svg>`;

        imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }

      backgrounds[i] = imageUrl;
    }

    return res.json({
      success: true,
      appliedMood: animeMood,
      totalGenerated: Object.keys(backgrounds).length,
      backgrounds,
    });
  } catch (error: any) {
    console.error('Error generando lote de fondos anime:', error);
    return res.status(500).json({ error: error?.message || 'Error al generar lote de fondos anime.' });
  }
});

// Endpoint to generate YouTube SEO metadata (Titles, Description with Chapters, Tags)
app.post('/api/generate-youtube-seo', async (req, res) => {
  try {
    const { episodeTitle, episodeSummary, turns, clientApiKey } = req.body;
    const ai = getGeminiClient(clientApiKey);

    // Calcular marcas de tiempo aproximadas
    let currentSeconds = 3; // intro
    const chapters = (turns || []).map((t: any, idx: number) => {
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const approxDuration = Math.max(5, Math.ceil((t.text?.length || 50) / 18));
      currentSeconds += approxDuration + 1;
      return {
        timestamp: timeStr,
        seconds: currentSeconds - approxDuration,
        title: t.visual_title || `Turno ${idx + 1}: ${t.speaker}`,
        speaker: t.speaker,
      };
    });

    const prompt = `Actúa como un experto en Marketing de Vídeo y SEO de YouTube especializado en podcasts técnicos y divulgativos para el canal "Un Fantasma en el Sistema" (web oficial: https://www.unfantasmaenelsistema.com/).
Genera un kit de publicación para YouTube basado en este episodio:
Título: ${episodeTitle}
Resumen: ${episodeSummary}
Turnos totales: ${turns?.length || 0}

Devuelve un JSON con:
1. "titles": array de 3 títulos altamente atractivos con buen CTR (uno en formato pregunta intrigante, uno con afirmación contundente y otro estilo documental).
2. "description": descripción completa de YouTube incluyendo gancho inicial, resumen en 2 párrafos, la lista de capítulos con marcas de tiempo (timestamps) exactamente en el formato "00:00 [Título]", llamada a la acción suscribiéndose a "Un Fantasma en el Sistema" y enlace a https://www.unfantasmaenelsistema.com/, y hashtags recomendados (#Podcast #NotebookLM #IA #Tecnologia).
3. "tags": array de 18-22 etiquetas SEO clave para el algoritmo de YouTube.
4. "bestShort": objeto con { "recommendedTurnIndex": number (índice 0-based del turno más polémico o revelador), "hookReason": string (por qué este turno triunfará en YouTube Shorts / TikTok) }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const output = response.text;
    if (!output) {
      throw new Error('No se recibió respuesta de Gemini.');
    }

    const data = JSON.parse(output);
    return res.json({
      ...data,
      chapters,
    });
  } catch (error: any) {
    console.error('Error generando SEO de YouTube:', error);
    return res.status(500).json({ error: error?.message || 'Error generando metadatos de YouTube.' });
  }
});


// Production static file serving or Vite middleware in dev
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`NotebookLM Studio Server running on port ${PORT}`);
  });
}

startServer();
