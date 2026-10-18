import { PodcastScript } from '../types';
import {
  SAMPLE_KISMET_ARTICLE_HTML,
  parseTechnicalArticleHtml,
  buildScriptFromParsedArticle,
} from '../services/articleParser';

export interface SampleTopicItem {
  id: string;
  title: string;
  desc: string;
  text: string;
  introTitle: string;
  introSubtitle: string;
  articleCategory: string;
  getScript: (hostAName?: string, hostBName?: string) => PodcastScript;
}

export const SAMPLE_TOPICS_CATALOG: SampleTopicItem[] = [
  {
    id: 'kismet-article',
    title: '🛡️ Artículo Técnico: Kismet',
    desc: 'Formato con Tablas, Comandos de Terminal y Puntos IDS (7 Diapositivas 1:1)',
    text: SAMPLE_KISMET_ARTICLE_HTML,
    introTitle: 'Kismet: Escuchar sin transmitir',
    introSubtitle: 'Ver mucho más que solo WiFi • Auditoría Pasiva de Radiofrecuencia',
    articleCategory: 'Redes inalámbricas | unfantasmaenelsistema.com',
    getScript: (hostAName = 'Alex', hostBName = 'Sam') => {
      const parsed = parseTechnicalArticleHtml(SAMPLE_KISMET_ARTICLE_HTML);
      return buildScriptFromParsedArticle(parsed, hostAName, hostBName);
    },
  },
  {
    id: 'agentic-ai-2026',
    title: '🚀 IA Agéntica 2026',
    desc: 'Modelos multimodales en tiempo real, latencia <200ms y memoria episódica',
    introTitle: 'La Revolución de la IA Agéntica y Multimodal en 2026',
    introSubtitle: 'De modelos conversacionales a agentes proactivos con razonamiento continuo',
    articleCategory: 'Inteligencia Artificial | unfantasmaenelsistema.com',
    text: `La inteligencia artificial en 2026 ha transitado de modelos puramente reactivos a sistemas agénticos con razonamiento profundo y multimodalidad omnidireccional nativa. Los modelos ahora pueden escuchar, razonar y hablar con latencias inferiores a 200 milisegundos, permitiendo conversaciones en tiempo real que capturan inflexiones emocionales, risas y pausas reflexivas.

Sin embargo, surgen nuevos desafíos: la alineación de objetivos a largo plazo, la necesidad de memoria episódica verificable y el coste energético de centros de datos hiperscalares refrigerados por inmersión líquida. Mientras algunos investigadores apuestan por arquitecturas híbridas neuro-simbólicas, otros defienden que el escalado de parámetros y datos sintéticos de alta fidelidad sigue sin haber tocado techo.`,
    getScript: (hostAName = 'Alex', hostBName = 'Sam') => ({
      episode_title: 'La Revolución de la IA Agéntica y Multimodal en 2026',
      episode_summary: `${hostAName} y ${hostBName} analizan el salto de los modelos conversacionales a agentes multimodales con razonamiento en tiempo real, latencias bajo 200ms y los desafíos térmicos de los centros de datos.`,
      turns: [
        {
          speaker: 'Host_A',
          emotion: 'entusiasta',
          text: `¡Bienvenidos a todos! Hoy tenemos sobre la mesa un documento que cambia por completo las reglas del juego: cómo la inteligencia artificial en 2026 ha dejado atrás el simple texto predictivo para convertirse en agentes proactivos con razonamiento continuo.`,
          visual_title: 'El Salto Agéntico 2026',
          visual_prompt: 'Cinematic laboratory with glowing holographic neural graphs and warm amber highlights, anime aesthetic',
        },
        {
          speaker: 'Host_B',
          emotion: 'curioso',
          text: `Es fascinante, ${hostAName}. Lo que más me llama la atención del informe es la latencia: bajar de los 200 milisegundos significa que la IA ya no "piensa" en diferido; percibe inflexiones, dudas y hasta interrupciones orgánicas como en una charla humana real.`,
          visual_title: 'Latencia Sub-200ms Nativa',
          visual_prompt: 'Audio waveforms turning into sparkling digital particles on a glass interface, anime cyber style',
        },
        {
          speaker: 'Host_A',
          emotion: 'analítico',
          text: `Exacto, ${hostBName}. Y el gran motor de ese salto es la multimodalidad omnidireccional nativa. Ya no hay transcodificación de voz a texto y de texto a voz: el modelo procesa audio crudo, señales visuales de cámara y código de forma simultánea en el mismo espacio latente.`,
          visual_title: 'Omnimodalidad en un solo espacio latente',
          visual_prompt: 'Futuristic AI neural core intertwining audio and visual light ribbons, anime sci-fi studio',
        },
        {
          speaker: 'Host_B',
          emotion: 'sorprendido',
          text: `Pero ojo al reverso de la moneda: el informe enfatiza el cuello de botella físico. La refrigeración por inmersión líquida en centros de datos se ha vuelto obligatoria para soportar matrices de cómputo que disipan gigavatios continuos.`,
          visual_title: 'Refrigeración por inmersión líquida',
          visual_prompt: 'High-tech server room with glowing cyan liquid cooling tanks and bubbling fluids, anime aesthetic',
        },
        {
          speaker: 'Host_A',
          emotion: 'reflexivo',
          text: `Totalmente. Y a nivel cognitivo, el reto ya no es generar respuestas brillantes en el instante, sino la memoria episódica verificable: que el agente recuerde decisiones de hace tres semanas sin sufrir alucinaciones de contexto acumulado.`,
          visual_title: 'Memoria Episódica Verificable',
          visual_prompt: 'Holographic memory library with crystalline data cubes floating in a serene atmosphere, anime art',
        },
        {
          speaker: 'Host_B',
          emotion: 'divertido',
          text: `¡Claro! Nadie quiere un copiloto agéntico que te programe una app impecable el lunes y el viernes haya olvidado la arquitectura base que definió. La persistencia es el nuevo Santo Grial.`,
          visual_title: 'Persistencia de Contexto',
          visual_prompt: 'Animated anime engineers collaborating around an interactive glowing terminal architecture',
        },
        {
          speaker: 'Host_A',
          emotion: 'analítico',
          text: `Y las arquitecturas neuro-simbólicas están ganando terreno como salvaguarda: combinan la fluidez intuitiva de los grandes transformadores con verificadores formales matemáticos que impiden fallos catastróficos en producción.`,
          visual_title: 'Arquitecturas Híbridas Neuro-Simbólicas',
          visual_prompt: 'Geometric logic trees merging with organic neural synapses in deep blue and gold, anime style',
        },
        {
          speaker: 'Host_B',
          emotion: 'entusiasta',
          text: `En conclusión: 2026 marca el momento en que la IA dejó de ser una caja de texto para convertirse en compañeros de trabajo activos y autónomos. ¡Una época apasionante para estar vivos!`,
          visual_title: 'La Era de los Colegas Sintéticos',
          visual_prompt: 'Warm sunset view from a futuristic office window with friendly silhouettes contemplating AI diagrams, anime film style',
        },
      ],
    }),
  },
  {
    id: 'fermi-paradox',
    title: '🌌 Paradoja de Fermi',
    desc: 'Filtros evolutivos, hipótesis del Bosque Oscuro y firmas tecnológicas',
    introTitle: 'La Paradoja de Fermi: ¿Dónde está todo el mundo?',
    introSubtitle: 'El Gran Filtro, la hipótesis del Bosque Oscuro y la búsqueda de tecnomarcadores',
    articleCategory: 'Astrofísica y Filosofía | unfantasmaenelsistema.com',
    text: `Si el universo es tan antiguo y alberga billones de galaxias con planetas en zonas habitables, ¿dónde están todas las civilizaciones extraterrestres? Esta es la conocida Paradoja de Fermi. Entre las hipótesis más discutidas se encuentran el 'Gran Filtro'—una barrera evolutiva casi infranqueable entre la química prebiótica y una especie interestelar—y la hipótesis del 'Bosque Oscuro', donde las civilizaciones avanzadas ocultan activamente su presencia por supervivencia. 

Recientes telescopios espaciales y programas de radioastronomía analizan atmósferas exoplanetarias en busca de tecnomarcadores como clorofluorocarbonos o calor residual de esferas de Dyson, planteando interrogantes fascinantes sobre nuestro propio futuro como especie.`,
    getScript: (hostAName = 'Alex', hostBName = 'Sam') => ({
      episode_title: 'La Paradoja de Fermi: El Gran Filtro y el Bosque Oscuro',
      episode_summary: `${hostAName} y ${hostBName} debaten la inquietante ausencia de civilizaciones extraterrestres: el dilema del Gran Filtro, la teoría del Bosque Oscuro y la búsqueda de esferas de Dyson.`,
      turns: [
        {
          speaker: 'Host_A',
          emotion: 'reflexivo',
          text: `Enrico Fermi miró al cielo estrellado en 1950 y lanzó una pregunta demoledora: "¿Dónde está todo el mundo?". Con catorce mil millones de años de historia cósmica y trillones de planetas rocosos, una sola civilización expansionista debería haber colonizado la Vía Láctea entera en un par de millones de años.`,
          visual_title: '¿Dónde está todo el mundo?',
          visual_prompt: 'A solitary astronomer gazing at a colossal spiral galaxy under a star-strewn sky, anime Makoto Shinkai style',
        },
        {
          speaker: 'Host_B',
          emotion: 'curioso',
          text: `Es el gran enigma existencial, ${hostAName}. Y la respuesta más perturbadora es el concepto del Gran Filtro ideado por Robin Hanson: la idea de que existe una barrera probabilística casi infranqueable en la evolución cósmica.`,
          visual_title: 'El Concepto del Gran Filtro',
          visual_prompt: 'An imposing glowing monolith in cosmic deep space separating primordial matter from starships, anime epic art',
        },
        {
          speaker: 'Host_A',
          emotion: 'analítico',
          text: `Exacto. El dilema crucial es si ese Gran Filtro está detrás de nosotros —por ejemplo, el milagro de la abiogénesis o la transición de procariotas a eucariotas complejas— o si está por delante de nosotros, esperando en forma de colapso tecnológico o autodestrucción por armas energéticas.`,
          visual_title: '¿Detrás o delante de la Humanidad?',
          visual_prompt: 'Split timeline illustration: primordial ocean cells on the left, futuristic space megastructures on the right, anime digital painting',
        },
        {
          speaker: 'Host_B',
          emotion: 'sorprendido',
          text: `Y luego tenemos la teoría del Bosque Oscuro formulada por Liu Cixin: el cosmos concebido como una jungla nocturna donde cada civilización es un cazador armado que no se atreve a emitir un sonido por miedo a ser detectado y aniquilado de forma preventiva.`,
          visual_title: 'La Hipótesis del Bosque Oscuro',
          visual_prompt: 'Vast dark cosmic nebula with stealthy geometric starships silently lurking among shadows, cinematic anime sci-fi',
        },
        {
          speaker: 'Host_A',
          emotion: 'curioso',
          text: `Sin embargo, la astronomía moderna ha cambiado de estrategia: en lugar de esperar mensajes de radio voluntarios, buscamos tecnomarcadores pasivos, como la radiación infrarroja residual que emitiría una megaestructura como una Esfera de Dyson al atrapar la energía de una estrella.`,
          visual_title: 'Búsqueda de Esferas de Dyson',
          visual_prompt: 'Gigantic glowing swarm of solar collector rings encircling a golden star in deep space, anime space opera style',
        },
        {
          speaker: 'Host_B',
          emotion: 'reflexivo',
          text: `Tanto si estamos verdaderamente solos como si el cosmos está abarrotado de inteligencias silenciosas, ambas posibilidades son sobrecogedoras. Mirar arriba nos obliga a valorar la frágil llama consciente de nuestro propio planeta.`,
          visual_title: 'La Fragilidad de la Conciencia',
          visual_prompt: 'Planet Earth glowing like a blue jewel against the infinite cosmic abyss, beautiful anime cinematic lighting',
        },
      ],
    }),
  },
  {
    id: 'sleep-neuroscience',
    title: '🧬 Neurociencia del Sueño',
    desc: 'Ondas delta lentas, drenaje del sistema glinfático y terapia emocional nocturna',
    introTitle: 'La Neurociencia del Sueño: Limpieza Cerebral y Salud Celular',
    introSubtitle: 'El sistema glinfático, las ondas delta profundas y el papel reparador de la fase REM',
    articleCategory: 'Neurociencia y Biología | unfantasmaenelsistema.com',
    text: `El sueño no es un estado pasivo del organismo, sino el proceso neurobiológico más activo y reparador del cerebro humano. Durante las fases de sueño profundo no-REM (ondas delta lentas), el sistema glinfático incrementa su flujo hasta diez veces, drenando toxinas acumuladas como las proteínas beta-amiloides y tau, directamente asociadas a enfermedades neurodegenerativas. 

Asimismo, la fase REM actúa como una terapia nocturna: consolida memorias emocionales, desactiva la reactividad de la amígdala y potencia la creatividad conectando ideas inconexas. Investigaciones recientes demuestran que optimizar la temperatura de la habitación (18°C), restringir la luz azul antes de dormir y mantener horarios circadianos consistentes añade años de salud cognitiva y física.`,
    getScript: (hostAName = 'Alex', hostBName = 'Sam') => ({
      episode_title: 'La Neurociencia del Sueño: El Taller Nocturno del Cerebro',
      episode_summary: `${hostAName} y ${hostBName} exploran el descubrimiento revolucionario del sistema glinfático: cómo el sueño profundo lava literalmente las toxinas neuronales y por qué la fase REM cura nuestras heridas emocionales.`,
      turns: [
        {
          speaker: 'Host_A',
          emotion: 'entusiasta',
          text: `Solemos pensar que dormir es simplemente apagar el interruptor biológico para descansar, pero la neurociencia de los últimos años ha demostrado justo lo contrario: mientras dormimos, el cerebro ejecuta sus protocolos metabólicos más complejos y vitales.`,
          visual_title: 'El Mito del Cerebro Apagado',
          visual_prompt: 'A person sleeping peacefully while a radiant glowing network of neural synapses lights up the brain, anime soft glow aesthetic',
        },
        {
          speaker: 'Host_B',
          emotion: 'curioso',
          text: `¡Totalmente, ${hostAName}! Y el descubrimiento estrella de la doctora Maiken Nedergaard fue el sistema glinfático: una red hidráulica microscópica que se activa casi exclusivamente durante el sueño profundo no-REM.`,
          visual_title: 'El Descubrimiento del Sistema Glinfático',
          visual_prompt: 'Microscopic view of luminous blue cerebrospinal fluid washing over intricate neural dendrites, anime biology style',
        },
        {
          speaker: 'Host_A',
          emotion: 'analítico',
          text: `Es literal: durante las ondas delta lentas, las células gliales se encogen hasta un sesenta por ciento, ensanchando los canales intersticiales para que el líquido cefalorraquídeo fluya diez veces más rápido y barra residuos metabólicos como la beta-amiloide y la proteína tau.`,
          visual_title: 'Drenaje de Proteínas Tóxicas',
          visual_prompt: 'Crystalline fluid flushing away dark protein clusters around glowing nerve cells, high-tech anime science visual',
        },
        {
          speaker: 'Host_B',
          emotion: 'sorprendido',
          text: `Es decir, que no dormir bien no es solo estar cansado al día siguiente: es dejar el cerebro inundado de residuos bioquímicos que a largo plazo están estrechamente ligados al deterioro cognitivo y al alzhéimer.`,
          visual_title: 'Impacto Cognitivo y Longevidad',
          visual_prompt: 'Comparison of a clear energetic neural network versus a congested clouded network, anime informative diagram',
        },
        {
          speaker: 'Host_A',
          emotion: 'reflexivo',
          text: `Y luego llega la fase REM, el auténtico diván del psicólogo nocturno. Mientras soñamos, el cerebro reactiva memorias con alto contenido traumático o estresante, pero en un entorno químico donde la noradrenalina está en mínimos absolutos.`,
          visual_title: 'Fase REM: Terapia Emocional',
          visual_prompt: 'Dreamy surreal landscape with flying clocks and floating origami memories in soft violet dusk, anime Ghibli aesthetic',
        },
        {
          speaker: 'Host_B',
          emotion: 'entusiasta',
          text: `¡Desconectamos la carga de dolor de la memoria! Recordamos lo sucedido, pero sin la respuesta física de pánico o taquicardia que causaba originalmente. El sueño REM nos sana emocionalmente cada noche.`,
          visual_title: 'Desactivación de la Amígdala',
          visual_prompt: 'An amygdala center cooling down from fiery crimson to serene sapphire blue, anime conceptual neuroscience',
        },
        {
          speaker: 'Host_A',
          emotion: 'analítico',
          text: `Y las pautas prácticas son clarísimas: temperatura fresca en el dormitorio alrededor de dieciocho grados centígrados, oscuridad total sin fuentes de luz azul noventa minutos antes y una consistencia horaria rigurosa.`,
          visual_title: 'Protocolo de Higiene Circadiana',
          visual_prompt: 'A modern cozy minimalist bedroom with dark warm amber bedside light and an open window with starry night, anime slice-of-life',
        },
        {
          speaker: 'Host_B',
          emotion: 'divertido',
          text: `Dormir ocho horas no es una pérdida de tiempo productivo: es la mejor inversión en longevidad, claridad mental y salud cerebral que el dinero no puede comprar. ¡A descansar con orgullo esta noche!`,
          visual_title: 'Dormir: El Superpoder Biológico',
          visual_prompt: 'Happy anime character waking up revitalized with warm morning sunlight streaming across the room, uplifting anime style',
        },
      ],
    }),
  },
];
