/**
 * Servicio de análisis y segmentación de artículos técnicos (HTML / Markdown).
 * Regla de negocio:
 * 1. Genera tantas diapositivas como puntos tenga el artículo.
 * 2. Cada tabla (<table>) va a una diapositiva independiente con datos estructurados.
 * 3. Cada pantalla de terminal (<pre>) va a una diapositiva independiente.
 * 4. El resto de diapositivas se ilustran con imágenes de contexto (estilo Anime) y texto relevante extraído del artículo.
 * 5. Extrae título, subtítulo y categoría para la Post-Intro animada.
 */

import { DialogueTurn, PodcastScript, SlideTableData, SlideTerminalData } from '../types';

export interface ParsedArticleSection {
  number?: string;
  title: string;
  rawHtml?: string;
  tables: SlideTableData[];
  terminals: SlideTerminalData[];
  paragraphs: string[];
  callouts: string[];
  bullets: string[];
}

export interface ParsedArticleResult {
  title: string;
  subtitle: string;
  category: string;
  sections: ParsedArticleSection[];
  totalExpectedSlides: number;
}

/**
 * Detecta si el texto proporcionado contiene etiquetas HTML estructuradas
 */
export function isHtmlArticle(content: string): boolean {
  if (!content) return false;
  return /<(?:div|table|pre|h1|h2|p)\b/i.test(content);
}

/**
 * Parsea el artículo en HTML estructurado
 */
export function parseTechnicalArticleHtml(htmlContent: string): ParsedArticleResult {
  let title = 'Artículo Técnico';
  let subtitle = '';
  let category = 'unfantasmaenelsistema.com';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 1. Extraer título principal y subtítulo
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    const h1s = Array.from(doc.querySelectorAll('h1'));

    // Buscar títulos por estilo o posición
    let categoryFound = false;
    for (const p of paragraphs) {
      const style = p.getAttribute('style') || '';
      const text = p.textContent?.trim() || '';

      if (!text) continue;

      if (style.includes('font-size:24pt') || style.includes('font-size: 24pt') || (!title || title === 'Artículo Técnico') && text.endsWith(':')) {
        title = text.replace(/:$/, '').trim();
      } else if (style.includes('font-size:18pt') || style.includes('font-size: 18pt') || style.includes('#3FA34D')) {
        subtitle = text;
      } else if (
        !categoryFound &&
        text.includes('|') &&
        (text.includes('unfantasmaenelsistema') || style.includes('font-size:10pt'))
      ) {
        // La categoría es la de la cabecera (la primera); el pie del artículo también lleva "| unfantasmaenelsistema"
        category = text;
        categoryFound = true;
      }
    }

    if (!title || title === 'Artículo Técnico') {
      const firstH1 = h1s[0];
      if (firstH1) {
        title = firstH1.textContent?.trim() || title;
      }
    }

    // 2. Extraer secciones por H1 o encabezados numerados
    const sections: ParsedArticleSection[] = [];
    
    // Obtener todos los elementos directos del contenedor principal
    const mainContainer = doc.querySelector('div') || doc.body;
    const children = Array.from(mainContainer.children);

    let currentSection: ParsedArticleSection = {
      title: 'Introducción y Concepto Base',
      tables: [],
      terminals: [],
      paragraphs: [],
      callouts: [],
      bullets: [],
    };

    let hasStartedNumberedSection = false;

    for (const el of children) {
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';
      const style = el.getAttribute('style') || '';

      if (tagName === 'h1' || (tagName === 'h2' && /^\d+\./.test(text))) {
        // Guardar sección previa si tiene contenido
        if (hasStartedNumberedSection || currentSection.paragraphs.length > 0 || currentSection.tables.length > 0 || currentSection.terminals.length > 0) {
          sections.push({ ...currentSection });
        }
        hasStartedNumberedSection = true;

        const numMatch = text.match(/^(\d+)\.\s*(.*)/);
        currentSection = {
          number: numMatch ? numMatch[1] : undefined,
          title: text,
          tables: [],
          terminals: [],
          paragraphs: [],
          callouts: [],
          bullets: [],
        };
        continue;
      }

      // Buscar tablas
      const tablesInEl = Array.from(el.querySelectorAll('table'));
      if (tagName === 'table') tablesInEl.push(el as HTMLTableElement);

      if (tablesInEl.length > 0) {
        for (const tbl of tablesInEl) {
          const headers: string[] = [];
          const rows: string[][] = [];

          const ths = Array.from(tbl.querySelectorAll('th'));
          if (ths.length > 0) {
            headers.push(...ths.map((th) => th.textContent?.trim() || ''));
          }

          const trs = Array.from(tbl.querySelectorAll('tbody tr, tr'));
          for (const tr of trs) {
            const tds = Array.from(tr.querySelectorAll('td'));
            if (tds.length > 0) {
              rows.push(tds.map((td) => td.textContent?.trim() || ''));
            }
          }

          if (headers.length > 0 || rows.length > 0) {
            currentSection.tables.push({ headers, rows });
          }
        }
        continue;
      }

      // Buscar bloques de código/terminal <pre>
      const presInEl = Array.from(el.querySelectorAll('pre'));
      if (tagName === 'pre') presInEl.push(el as HTMLPreElement);

      if (presInEl.length > 0) {
        for (const pre of presInEl) {
          const rawCode = pre.textContent || '';
          const lines = rawCode
            .split('\n')
            .map((l) => l.trimEnd())
            .filter((l) => l.length > 0);

          // Extraer primer comando no-comentario como comando destacado
          const commandLine = lines.find((l) => !l.startsWith('#')) || lines[0] || '';

          currentSection.terminals.push({
            command: commandLine.trim(),
            lines,
            title: `Terminal: ${currentSection.title.replace(/^\d+\.\s*/, '')}`,
          });
        }
        continue;
      }

      // Buscar listas de viñetas (bullets)
      const lis = Array.from(el.querySelectorAll('li'));
      if (lis.length > 0) {
        currentSection.bullets.push(...lis.map((li) => li.textContent?.trim() || ''));
        continue;
      }

      // Buscar cajas de llamada (callouts con fondo de color)
      if (style.includes('background') && (style.includes('#EBF5FB') || style.includes('#EAFAF1') || style.includes('#FDEDEC'))) {
        if (text) currentSection.callouts.push(text);
        continue;
      }

      // Párrafos regulares
      if (tagName === 'p' && text.length > 15 && !text.includes('unfantasmaenelsistema.com')) {
        currentSection.paragraphs.push(text);
      }
    }

    // Añadir última sección
    if (currentSection.paragraphs.length > 0 || currentSection.tables.length > 0 || currentSection.terminals.length > 0) {
      sections.push(currentSection);
    }

    // Calcular total de diapositivas esperadas:
    // Por cada sección:
    // - Si tiene tablas, cada tabla es 1 diapositiva.
    // - Si tiene terminales, cada terminal es 1 diapositiva.
    // - Si no tiene tablas ni terminales (o tras ellas queda contenido conceptual), 1 diapositiva contextual Anime.
    let totalSlides = 0;
    for (const sec of sections) {
      const itemsCount = sec.tables.length + sec.terminals.length;
      if (itemsCount === 0) {
        totalSlides += 1;
      } else {
        totalSlides += itemsCount;
        // Si además tiene bullets o párrafos extensos (ej. alertas IDS), puede añadir una diapositiva contextual
        if (sec.bullets.length >= 3 && itemsCount === 0) {
          totalSlides += 1;
        }
      }
    }

    return {
      title,
      subtitle: subtitle || 'Análisis Técnico y Operativo',
      category: category || 'Redes inalámbricas | unfantasmaenelsistema.com',
      sections,
      totalExpectedSlides: Math.max(totalSlides, sections.length),
    };
  }

  // Fallback mediante Regex si no hay DOMParser disponible
  return fallbackRegexParse(htmlContent);
}

function fallbackRegexParse(htmlContent: string): ParsedArticleResult {
  const titleMatch = htmlContent.match(/font-size:\s*24pt[^>]*>([^<]+)<\/p>/i);
  const subtitleMatch = htmlContent.match(/font-size:\s*18pt[^>]*>([^<]+)<\/p>/i);
  const categoryMatch = htmlContent.match(/Redes\s+inalámbricas[^<]*/i);

  const title = titleMatch ? titleMatch[1].replace(/:$/, '').trim() : 'Kismet';
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : 'escuchar sin transmitir, y ver mucho más que solo WiFi';
  const category = categoryMatch ? categoryMatch[0].trim() : 'Redes inalámbricas | unfantasmaenelsistema.com';

  return {
    title,
    subtitle,
    category,
    sections: [],
    totalExpectedSlides: 8,
  };
}

/**
 * Convierte un artículo analizado en un PodcastScript completo cumpliendo todas las reglas:
 * 1. Diapositiva independiente para cada Tabla.
 * 2. Diapositiva independiente para cada Terminal.
 * 3. Diapositivas de contexto para el resto con fondos Anime y texto relevante.
 */
export function buildScriptFromParsedArticle(
  parsed: ParsedArticleResult,
  hostAName = 'Alex',
  hostBName = 'Sam'
): PodcastScript {
  const turns: DialogueTurn[] = [];
  let turnCounter = 0;

  for (let sIdx = 0; sIdx < parsed.sections.length; sIdx++) {
    const sec = parsed.sections[sIdx];
    const secTitleClean = sec.title.replace(/^\d+\.\s*/, '');

    // Caso A: La sección contiene TABLAS -> Cada tabla va a una diapositiva independiente
    if (sec.tables.length > 0) {
      sec.tables.forEach((tbl, tblIdx) => {
        const isHostA = turnCounter % 2 === 0;
        const speaker = isHostA ? 'Host_A' : 'Host_B';
        const speakerName = isHostA ? hostAName : hostBName;

        // Construir texto de diálogo adaptado a la tabla
        const colNames = tbl.headers.join(', ');
        const rowSummary = tbl.rows.slice(0, 3).map((r) => `${r[0]}: ${r[1]}`).join('; ');
        const dialogText = isHostA
          ? `Fijaos en esta tabla comparativa sobre ${secTitleClean}. La gran diferencia radica en que ${tbl.rows[0]?.[0] || 'la operación'} en Kismet es ${tbl.rows[0]?.[1] || 'completamente pasiva'}, mientras que en otros entornos es activa.`
          : `Exacto, ${hostAName}. Mirando la tabla de ${secTitleClean}, lo que más me impresiona es cómo clasifica ${tbl.rows[1]?.[0] || 'la visibilidad'}: mientras una herramienta inyecta y se delata, aquí pasamos inadvertidos.`;

        // Extraer texto relevante de la sección
        const relevantText = sec.paragraphs[0] || tbl.rows.map((r) => `• ${r[0]}: ${r[1]}`).join('\n');

        turns.push({
          speaker,
          emotion: 'analítico',
          text: dialogText,
          visual_title: `Tabla: ${secTitleClean}${sec.tables.length > 1 ? ` (${tblIdx + 1})` : ''}`,
          visual_prompt: `High-tech cybersecurity data table interface, comparison matrix with glowing holographic rows, deep indigo and cyan accents, clean anime tech HUD aesthetic`,
          slideType: 'table',
          tableData: tbl,
          sectionTitle: sec.title,
          articlePointNumber: sIdx + 1,
          relevantText: relevantText.substring(0, 280),
        });

        turnCounter++;
      });
    }

    // Caso B: La sección contiene TERMINALES -> Cada bloque <pre> va a una diapositiva independiente
    if (sec.terminals.length > 0) {
      sec.terminals.forEach((term, termIdx) => {
        const isHostA = turnCounter % 2 === 0;
        const speaker = isHostA ? 'Host_A' : 'Host_B';

        const dialogText = isHostA
          ? `Pasemos a la terminal. Para ${secTitleClean.toLowerCase()}, ejecutamos \`${term.command}\`. Kismet levanta el modo monitor en segundo plano sin que tengamos que lidiar con airmon-ng.`
          : `¡Y ojo a ese parámetro! Al lanzar \`${term.command}\`, podemos capturar múltiples fuentes a la vez o canalizarlo a un túnel seguro. Todo limpio desde la línea de comandos.`;

        const relevantText = sec.paragraphs[0] || term.lines.slice(0, 4).join('\n');

        turns.push({
          speaker,
          emotion: 'entusiasta',
          text: dialogText,
          visual_title: `Comandos: ${secTitleClean}${sec.terminals.length > 1 ? ` (Paso ${termIdx + 1})` : ''}`,
          visual_prompt: `Futuristic developer terminal screen, Linux bash console glowing with syntax highlighted commands, anime hacker room background with ambient purple lighting`,
          slideType: 'terminal',
          terminalData: term,
          sectionTitle: sec.title,
          articlePointNumber: sIdx + 1,
          relevantText: relevantText.substring(0, 280),
        });

        turnCounter++;
      });
    }

    // Caso C: No hay tablas ni terminales en este punto (ej. Alertas IDS, Explicación teórica, Conclusión)
    // -> Diapositiva contextual ilustrada con estilo Anime + texto relevante extraído del artículo
    if (sec.tables.length === 0 && sec.terminals.length === 0) {
      const isHostA = turnCounter % 2 === 0;
      const speaker = isHostA ? 'Host_A' : 'Host_B';

      let promptDesc = `Japanese anime cyber surveillance station, radar spectrum analyzer with holographic radio waves, Makoto Shinkai luminous aesthetic, anime hacker analyzing wireless anomalies`;
      if (sec.title.toLowerCase().includes('conclusi')) {
        promptDesc = `Reflective anime tech studio, cybersecurity analyst looking at futuristic network topology map at sunset, Makoto Shinkai style glowing city horizon, high detail`;
      }

      // Texto relevante con viñetas o párrafo destacado
      let relevantText = '';
      if (sec.bullets.length > 0) {
        relevantText = sec.bullets.map((b) => `• ${b}`).join('\n');
      } else if (sec.callouts.length > 0) {
        relevantText = sec.callouts[0];
      } else {
        relevantText = sec.paragraphs.slice(0, 2).join(' ');
      }

      const dialogText = isHostA
        ? `Llegamos a un punto crucial: ${secTitleClean}. No se trata solo de registrar paquetes, sino de cómo el sistema vigila el entorno e identifica de inmediato anomalías y ataques.`
        : `Totalmente. Al analizar ${secTitleClean.toLowerCase()}, lo diferencial es la capacidad de operar como un IDS continuo sin emitir ni un solo paquete revelador.`;

      turns.push({
        speaker,
        emotion: sec.title.toLowerCase().includes('conclusi') ? 'reflexivo' : 'sorprendido',
        text: dialogText,
        visual_title: secTitleClean,
        visual_prompt: promptDesc,
        slideType: 'context_anime',
        sectionTitle: sec.title,
        articlePointNumber: sIdx + 1,
        relevantText: relevantText.substring(0, 320),
      });

      turnCounter++;
    }
  }

  return {
    episode_title: `${parsed.title}: ${parsed.subtitle}`,
    episode_summary: `Análisis exhaustivo punto por punto de ${parsed.title}. Repaso interactivo de tablas comparativas, sintaxis en terminal de comandos y detección de intrusiones inalámbricas.`,
    turns,
  };
}

/**
 * Artículo de ejemplo de Kismet proporcionado por el usuario
 */
export const SAMPLE_KISMET_ARTICLE_HTML = `<!-- ==========================================================
     Kismet: escuchar sin transmitir, y ver mucho más que solo WiFi
     Pegar este bloque completo como "HTML personalizado" en WordPress
     ========================================================== -->
<div style="max-width:820px;margin:0 auto;font-family:Arial, Helvetica, sans-serif;color:#1a1a1a;background:#ffffff;line-height:1.6;">
<p style="text-align:center;font-size:24pt;font-weight:bold;color:#1A1A2E;margin:0;">Kismet:</p>
<p style="text-align:center;font-size:18pt;font-weight:bold;color:#3FA34D;margin:0 0 8px;">escuchar sin transmitir, y ver mucho más que solo WiFi</p>
<p style="text-align:center;font-size:10pt;color:#7F8C8D;margin:0 0 24px;">Redes inalámbricas&nbsp;&nbsp;|&nbsp;&nbsp;unfantasmaenelsistema.com</p>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Aircrack-ng necesita, en algún momento, transmitir algo: al menos un paquete de deautenticación para forzar el handshake que quiere capturar. Kismet parte de una premisa distinta y, en cierto modo, más incómoda de asumir: se puede aprender muchísimo de una red inalámbrica sin emitir jamás una sola señal. Es un sniffer completamente pasivo —solo escucha, nunca transmite— y, a diferencia de la mayoría de herramientas de auditoría WiFi, no se limita a 802.11: en el mismo panel cataloga también Bluetooth, tráfico de radiofrecuencia genérico vía SDR y dispositivos Zigbee.</p>
<div style="background:#EBF5FB;border:1px solid #AED6F1;border-radius:6px;padding:14px 16px;margin:0 0 16px;"><p style="margin:0 0 6px;font-size:11pt;font-weight:bold;color:#1A5276;">Qué aprenderás en este artículo</p><p style="margin:0;font-size:10.5pt;color:#1a1a1a;">Por qué ser puramente pasivo es la diferencia de fondo entre Kismet y Aircrack-ng, no un detalle menor · Qué protocolos captura además de WiFi, y con qué hardware · Cómo se arranca con una o varias fuentes de captura a la vez · Qué ofrece su interfaz web y cómo acceder a ella de forma segura en remoto · Qué alertas dispara automáticamente como IDS inalámbrico: rogue APs, evil twins, deautenticación</p></div>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">1. Pasivo, no activo: la diferencia que lo cambia todo</h1>
<div style="overflow-x:auto;margin:0 0 16px;"><table style="width:100%;border-collapse:collapse;border:1px solid #333333;"><thead><tr><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Aspecto</th><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Kismet</th><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Aircrack-ng</th></tr></thead><tbody><tr><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Operación</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Pasiva — solo escucha</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Activa — inyecta paquetes (deauth, etc.)</td></tr><tr><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Visibilidad para el objetivo</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Indetectable</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Detectable (el propio ataque genera tráfico)</td></tr><tr><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Objetivo típico</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Catalogación, IDS, detección de anomalías</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Auditoría de contraseñas WPA/WPA2</td></tr><tr><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Protocolos</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">WiFi, Bluetooth, SDR genérico, Zigbee</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Solo WiFi 802.11</td></tr></tbody></table></div>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Esa pasividad no es solo una curiosidad técnica: es lo que permite dejar un Kismet corriendo horas o días en un entorno sin alterar en nada lo que hay alrededor, algo que ningún ataque de deautenticación puede ofrecer.</p>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">2. Más que WiFi: un solo panel para varios protocolos</h1>
<div style="overflow-x:auto;margin:0 0 16px;"><table style="width:100%;border-collapse:collapse;border:1px solid #333333;"><thead><tr><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Protocolo</th><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Qué captura</th><th style="background:#1A1A2E;color:#ffffff;font-size:10pt;font-weight:bold;text-align:center;padding:9px 10px;border:1px solid #333333;">Hardware típico</th></tr></thead><tbody><tr><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">WiFi 802.11 (a/b/g/n/ac/ax)</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Beacons, probe requests, frames de gestión; detecta redes con SSID oculto</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Alfa AWUS036ACS/ACH, Alfa AWUS036NHA</td></tr><tr><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Bluetooth / BTLE</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Dispositivos Classic y Low Energy, servicios anunciados</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Adaptador Bluetooth Linux estándar, o Ubertooth One para Classic completo</td></tr><tr><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">RF genérico vía SDR</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">ADS-B (aviones), TPMS (sensores de presión de neumáticos), estaciones meteorológicas</td><td style="background:#F2F3F4;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Dongle RTL-SDR (RTL2832U)</td></tr><tr><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Zigbee / Z-Wave</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">Tráfico de dispositivos IoT sobre estos protocolos</td><td style="background:#FDFEFE;font-size:10pt;padding:9px 10px;border:1px solid #333333;vertical-align:top;">TI CC2531 con firmware específico</td></tr></tbody></table></div>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Con un receptor GPS activo vía gpsd, Kismet además geolocaliza cada dispositivo detectado y puede exportar el resultado a KML — la base técnica de cualquier ejercicio de wardriving.</p>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">3. Puesta en marcha</h1>
<div style="overflow-x:auto;margin:0 0 16px;"><pre style="background:#0D1117;color:#79C0FF;font-family:'Courier New', Consolas, monospace;font-size:9pt;line-height:1.5;padding:14px 16px;border-radius:6px;margin:0;white-space:pre;overflow-x:auto;"># Instalacion y permisos (el usuario necesita pertenecer al grupo kismet)
sudo apt install kismet -y
sudo usermod -aG kismet $USER && newgrp kismet
&nbsp;
# Arranque basico sobre una interfaz
kismet -c wlan0
&nbsp;
# Varias fuentes de captura a la vez (por ejemplo, dos adaptadores WiFi)
kismet -c wlan0 -c wlan1
&nbsp;
# Fuente con nombre y canales fijos, en lugar de saltar de canal en canal
kismet -c "wlan0:name=alfa_24,channels=1,6,11"</pre></div>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">A diferencia del flujo con Aircrack-ng, Kismet gestiona el modo monitor de la interfaz automáticamente: no hace falta pasar por airmon-ng antes de arrancarlo.</p>
<div style="overflow-x:auto;margin:0 0 16px;"><pre style="background:#0D1117;color:#79C0FF;font-family:'Courier New', Consolas, monospace;font-size:9pt;line-height:1.5;padding:14px 16px;border-radius:6px;margin:0;white-space:pre;overflow-x:auto;"># Ejecutar en segundo plano, guardando la captura con un prefijo concreto
kismet -c wlan0 --daemonize --log-prefix /tmp/kismet/survey
&nbsp;
# Detener la instancia en segundo plano
kismet --kill</pre></div>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">4. La interfaz web</h1>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Kismet expone un panel web en el puerto 2501 (http://localhost:2501 por defecto) con cuatro vistas principales: dispositivos detectados (SSID, BSSID, canal, cifrado, potencia, número de clientes), clientes asociados, estadísticas de paquetes y un registro de alertas en vivo.</p>
<div style="overflow-x:auto;margin:0 0 16px;"><pre style="background:#0D1117;color:#79C0FF;font-family:'Courier New', Consolas, monospace;font-size:9pt;line-height:1.5;padding:14px 16px;border-radius:6px;margin:0;white-space:pre;overflow-x:auto;"># Acceder de forma segura a una instancia que corre en otro equipo,
# sin exponer el puerto 2501 directamente a la red
ssh -L 2501:localhost:2501 usuario@servidor_kismet</pre></div>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Los datos capturados se guardan simultáneamente en varios formatos según la configuración: una base propia (kismetdb), pcapng estándar compatible con Wireshark, JSON para procesado automatizado, y KML cuando hay geolocalización de por medio.</p>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">5. Como IDS inalámbrico: qué dispara una alerta</h1>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">El uso más interesante de Kismet, más allá del reconocimiento puntual, es dejarlo corriendo de forma continua como sistema de detección de intrusiones inalámbrico. Genera alertas automáticas para patrones muy concretos.</p>
<ul style="font-size:11pt;padding-left:22px;margin:0 0 10pt;"><li style="margin:0 0 4pt;"><strong>Rogue Access Points</strong>: puntos de acceso con BSSID o características que no coinciden con la infraestructura legítima conocida</li><li style="margin:0 0 4pt;"><strong>Evil Twins</strong>: redes que anuncian el mismo SSID que una legítima pero desde un BSSID distinto</li><li style="margin:0 0 4pt;"><strong>Ataques de deautenticación</strong>: frames de deauth no autorizados, exactamente el tipo de tráfico que genera una herramienta como aireplay-ng</li><li style="margin:0 0 4pt;"><strong>Cifrado WEP detectado</strong>: presencia de una red con un protocolo roto desde hace más de una década</li><li style="margin:0 0 4pt;"><strong>Flood de beacons</strong>: una tasa anómala de beacons, típica de ciertos ataques de denegación de servicio o de saturación deliberada</li></ul>
<div style="background:#EAFAF1;border:1px solid #A9DFBF;border-radius:6px;padding:14px 16px;margin:0 0 16px;"><p style="margin:0 0 6px;font-size:11pt;font-weight:bold;color:#1E8449;">El caso de uso que más lo justifica</p><p style="margin:0;font-size:10.5pt;color:#1a1a1a;">Un Kismet corriendo de fondo en una oficina o en un evento detecta, sin que nadie lo note, el momento exacto en que aparece un punto de acceso no autorizado o alguien lanza un ataque de deautenticación contra la red legítima — información que sin un IDS pasivo así solo se descubre después del incidente, si se descubre</p></div>
<div style="background:#FDEDEC;border:1px solid #F5B7B1;border-radius:6px;padding:14px 16px;margin:0 0 16px;"><p style="margin:0 0 6px;font-size:11pt;font-weight:bold;color:#922B21;">Encuadre legal</p><p style="margin:0;font-size:10.5pt;color:#1a1a1a;">Aunque Kismet no transmite nada, capturar e interceptar comunicaciones inalámbricas de terceros sin su consentimiento sigue estando dentro del ámbito del artículo 197 del Código Penal. Su uso legítimo es la auditoría de tu propia infraestructura o un laboratorio de radiofrecuencia con autorización expresa, no la vigilancia de redes ajenas.</p></div>
<h1 style="font-family:Arial, Helvetica, sans-serif;font-size:18pt;font-weight:bold;color:#1A1A2E;margin:18pt 0 9pt;">Conclusión</h1>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Kismet no compite con Aircrack-ng por ser mejor en lo mismo: hace algo distinto de raíz. Donde Aircrack-ng necesita provocar tráfico para conseguir su objetivo, Kismet se limita a escuchar y catalogar todo lo que ya está en el aire, en varios protocolos a la vez, sin que nada se entere.</p>
<p style="text-align:justify;font-size:11pt;margin:4pt 0 8pt;">Esa pasividad lo convierte en la herramienta natural para todo lo que Aircrack-ng no puede hacer bien: vigilancia continua, detección de dispositivos no autorizados, y un WIDS que sigue funcionando exactamente igual tanto si nadie lo intenta como si alguien está, en ese momento, lanzando un ataque contra la red que vigila.</p>
<div style="background:#EAFAF1;border:1px solid #A9DFBF;border-radius:6px;padding:18px 20px;margin:0 0 16px;text-align:center;"><p style="margin:0 0 8px;font-size:12pt;font-weight:bold;color:#1E8449;">Practica esto en el laboratorio guiado de GhostAcademy</p><p style="margin:0 0 14px;font-size:10.5pt;color:#1a1a1a;">GhostAcademy dedica una guía completa a Kismet: instalación, hardware compatible por protocolo, configuración de fuentes de captura, la interfaz web y laboratorios prácticos de wardriving y detección de intrusiones inalámbricas.</p><a href="https://ghostacademy.unfantasmaenelsistema.com/04_Guided-Labs/06_Traffic_Analysis/Kismet.html" target="_blank" rel="noopener" style="display:inline-block;background:#1E8449;color:#ffffff;font-weight:bold;font-size:10.5pt;text-decoration:none;padding:10px 22px;border-radius:4px;">Abrir la guía de Kismet &rarr;</a></div>
<div style="background:#EAFAF1;border:1px solid #A9DFBF;border-radius:6px;padding:14px 16px;margin:0 0 16px;"><p style="margin:0 0 6px;font-size:11pt;font-weight:bold;color:#1E8449;">Referencias</p><p style="margin:0;font-size:10.5pt;color:#1a1a1a;">La guía interactiva de Kismet de GhostAcademy, con configuración completa y laboratorios de wardriving e IDS inalámbrico · Un artículo de esta serie recorre Aircrack-ng, el enfoque activo que Kismet complementa desde el lado puramente pasivo · Otro artículo de esta serie profundiza en sistemas WIDS/WIPS de detección inalámbrica a nivel de infraestructura, más allá de una sola herramienta</p></div>
<p style="text-align:center;font-style:italic;font-size:9pt;color:#95A5A6;margin:24px 0 0;">unfantasmaenelsistema.com  |  Seguridad, sistemas y todo lo que no debería funcionar (pero funciona)</p>
</div>`;
