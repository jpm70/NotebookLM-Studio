/**
 * Catálogo de Voces Premium de Alta Definición
 * Modelos Neuronales con registros vocales clasificados (Barítono, Bajo, Tenor, Mezzosoprano, Soprano, Contralto)
 * y acentos regionales (Castellano España, Latino Neutro México, Rioplatense Argentina, Andino Colombia, Internacional).
 */

import { VoiceModelProfile } from '../types';

export const PREMIUM_VOICE_CATALOG: VoiceModelProfile[] = [
  // --- VOCES MASCULINAS GEMINI NEURAL STUDIO (HD) ---
  {
    id: 'gemini-puck',
    name: 'Puck Studio HD',
    engine: 'gemini',
    geminiVoiceId: 'Puck',
    edgeVoiceId: 'es-ES-AlvaroNeural',
    gender: 'male',
    vocalRegister: 'Barítono Cálido (Medio-Grave)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '🌐',
    description: 'Voz equilibrada, pedagógica y con gran energía. Ideal para explicar conceptos complejos de forma accesible.',
    bestArchetype: 'Explicador técnico y analítico',
    sampleText: '¡Hola! Soy la voz de estudio Puck. Explico conceptos científicos y tecnológicos con dinamismo y máxima claridad.',
    pitch: 1.0,
    speed: 1.0,
    isPremium: true,
  },
  {
    id: 'gemini-charon',
    name: 'Charon Broadcast',
    engine: 'gemini',
    geminiVoiceId: 'Charon',
    edgeVoiceId: 'es-ES-AlvaroNeural',
    gender: 'male',
    vocalRegister: 'Bajo Profundo (Grave Radiofónico)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '🎙️',
    description: 'Tono grave, sobrio y reflexivo con presencia radiofónica imponente. Perfecto para debates sesudos e investigaciones.',
    bestArchetype: 'Analista de fondo y rigor periodístico',
    sampleText: 'Saludos. Con la voz Charon aporto gravedad, profundidad reflexiva y una dicción analítica de calidad broadcast.',
    pitch: 0.84,
    speed: 0.98,
    isPremium: true,
  },
  {
    id: 'gemini-fenrir',
    name: 'Fenrir Documental',
    engine: 'gemini',
    geminiVoiceId: 'Fenrir',
    edgeVoiceId: 'es-MX-JorgeNeural',
    gender: 'male',
    vocalRegister: 'Barítono Firme (Autoritativo)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '🏛️',
    description: 'Cadencia autoritativa, formal y segura. Destaca en divulgación histórica, informes de mercado y documentales.',
    bestArchetype: 'Narrador documental y autoridad temática',
    sampleText: 'Esta es la voz Fenrir. Su cadencia firme y segura es idónea para análisis exhaustivos que requieren autoridad.',
    pitch: 0.92,
    speed: 1.0,
    isPremium: true,
  },
  {
    id: 'gemini-orpheus',
    name: 'Orpheus Storyteller',
    engine: 'gemini',
    geminiVoiceId: 'Orpheus',
    edgeVoiceId: 'es-AR-TomasNeural',
    gender: 'male',
    vocalRegister: 'Tenor Resonante (Narrativo / Envolvente)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '📖',
    description: 'Timbre melódico, envolvente y cercano. Excelente para ensayos sonoros, anécdotas inmersivas y storytelling.',
    bestArchetype: 'Storyteller y divulgador de historias',
    sampleText: 'Hola, soy Orpheus. Mi registro aporta calidez, empatía y una narración fluida que atrapa desde el primer instante.',
    pitch: 1.02,
    speed: 0.98,
    isPremium: true,
  },

  // --- VOCES FEMENINAS GEMINI NEURAL STUDIO (HD) ---
  {
    id: 'gemini-kore',
    name: 'Kore Studio HD',
    engine: 'gemini',
    geminiVoiceId: 'Kore',
    edgeVoiceId: 'es-ES-ElviraNeural',
    gender: 'female',
    vocalRegister: 'Mezzosoprano Conversacional (Cálida)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '✨',
    description: 'Expresiva, natural, rica en inflexiones y espontaneidad. Genera una complicidad inmediata con el oyente.',
    bestArchetype: 'Co-anfitriona curiosa y cuestionadora',
    sampleText: '¡Totalmente de acuerdo! Con la voz Kore consigo una conversación natural, expresiva y llena de preguntas incisivas.',
    pitch: 1.0,
    speed: 1.0,
    isPremium: true,
  },
  {
    id: 'gemini-zephyr',
    name: 'Zephyr Dinámica',
    engine: 'gemini',
    geminiVoiceId: 'Zephyr',
    edgeVoiceId: 'es-MX-DaliaNeural',
    gender: 'female',
    vocalRegister: 'Soprano Brillante (Ágil y Articulada)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '⚡',
    description: 'Timbre luminoso, ritmo rápido y dicción incisiva. Destaca al plantear contrapreguntas y analogías inesperadas.',
    bestArchetype: 'Debatiente ágil y divulgadora científica',
    sampleText: '¡Exacto! Soy Zephyr, aportando frescura, dinamismo y una entonación brillante idónea para debates con ritmo ágil.',
    pitch: 1.08,
    speed: 1.04,
    isPremium: true,
  },
  {
    id: 'gemini-aoede',
    name: 'Aoede Clásica',
    engine: 'gemini',
    geminiVoiceId: 'Aoede',
    edgeVoiceId: 'es-CO-SalomeNeural',
    gender: 'female',
    vocalRegister: 'Contralto Rica (Profunda y Elegante)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '🎶',
    description: 'Voz femenina profunda, aterciopelada y pausada. Proporciona una atmósfera culta, reflexiva y sosegada.',
    bestArchetype: 'Analista de fondo, arte y literatura',
    sampleText: 'Bienvenidos. La voz Aoede ofrece un timbre aterciopelado, elegante y sereno que eleva cualquier conversación sonora.',
    pitch: 0.94,
    speed: 0.96,
    isPremium: true,
  },
  {
    id: 'gemini-leda',
    name: 'Leda Empática',
    engine: 'gemini',
    geminiVoiceId: 'Leda',
    edgeVoiceId: 'es-ES-ElviraNeural',
    gender: 'female',
    vocalRegister: 'Soprano Suave (Intimista y Serena)',
    accent: 'Castellano / Internacional',
    accentCode: 'INTL',
    flag: '🌿',
    description: 'Suavidad, calidez emocional y escucha activa. Muy recomendable para entrevistas humanas y psicología.',
    bestArchetype: 'Entrevistadora empática y moderadora',
    sampleText: 'Hola, soy Leda. Mi voz transmite sosiego, cercanía y una conexión emocional transparente con la audiencia.',
    pitch: 1.03,
    speed: 0.98,
    isPremium: true,
  },

  // --- MODELOS REGIONALES Y MULTI-ACENTO ---
  {
    id: 'regional-alvaro-es',
    name: 'Álvaro Peninsular',
    engine: 'hybrid',
    geminiVoiceId: 'Puck',
    edgeVoiceId: 'es-ES-AlvaroNeural',
    gender: 'male',
    vocalRegister: 'Barítono Castellano (España)',
    accent: 'Castellano (España)',
    accentCode: 'ES',
    flag: '🇪🇸',
    description: 'Cadencia natural de Madrid / España central. Muy fluido, con timbre masculino estándar de podcasting ibérico.',
    bestArchetype: 'Divulgador y presentador peninsular',
    sampleText: 'Qué tal, soy Álvaro. Una locución castellana natural con entonación peninsular perfecta para audiencias en España.',
    pitch: 0.95,
    speed: 1.0,
    isPremium: true,
  },
  {
    id: 'regional-elvira-es',
    name: 'Elvira Peninsular',
    engine: 'hybrid',
    geminiVoiceId: 'Kore',
    edgeVoiceId: 'es-ES-ElviraNeural',
    gender: 'female',
    vocalRegister: 'Mezzosoprano Ibérica (España)',
    accent: 'Castellano (España)',
    accentCode: 'ES',
    flag: '🇪🇸',
    description: 'Modulación castellana viva, entusiasta y muy articulada. Excelente contraste para debatir con un anfitrión analítico.',
    bestArchetype: 'Co-presentadora y analista cultural ibérica',
    sampleText: 'Hola a todos. Soy Elvira, con acento castellano impecable, ágil y con un timbre sumamente expresivo.',
    pitch: 1.02,
    speed: 1.02,
    isPremium: true,
  },
  {
    id: 'regional-jorge-mx',
    name: 'Jorge Panamericano',
    engine: 'hybrid',
    geminiVoiceId: 'Puck',
    edgeVoiceId: 'es-MX-JorgeNeural',
    gender: 'male',
    vocalRegister: 'Barítono Latino Cálido (México)',
    accent: 'Latino Neutro (México)',
    accentCode: 'MX',
    flag: '🇲🇽',
    description: 'Acento neutro latinoamericano con calidez y amabilidad. Comprehensión óptima en todo el continente americano.',
    bestArchetype: 'Conductor panamericano y docente',
    sampleText: '¡Qué tal, amigos! Soy Jorge. Mi acento latino neutro es perfecto para audiencias de toda América Latina y el mundo.',
    pitch: 0.96,
    speed: 1.0,
    isPremium: true,
  },
  {
    id: 'regional-dalia-mx',
    name: 'Dalia Panamericana',
    engine: 'hybrid',
    geminiVoiceId: 'Zephyr',
    edgeVoiceId: 'es-MX-DaliaNeural',
    gender: 'female',
    vocalRegister: 'Soprano Suave Panamericana (México)',
    accent: 'Latino Neutro (México)',
    accentCode: 'MX',
    flag: '🇲🇽',
    description: 'Dulce, entusiasta y extraordinariamente clara. Ideal para guiones educativos, divulgación y tecnología amigable.',
    bestArchetype: 'Curiosa, conectora con el público y amena',
    sampleText: '¡Hola! Soy Dalia, con un registro latinoamericano fresco, amable y sumamente claro para todo tipo de público.',
    pitch: 1.06,
    speed: 1.02,
    isPremium: true,
  },
  {
    id: 'regional-tomas-ar',
    name: 'Tomás Rioplatense',
    engine: 'hybrid',
    geminiVoiceId: 'Orpheus',
    edgeVoiceId: 'es-AR-TomasNeural',
    gender: 'male',
    vocalRegister: 'Tenor Rioplatense (Argentina)',
    accent: 'Rioplatense (Argentina)',
    accentCode: 'AR',
    flag: '🇦🇷',
    description: 'Cadencia porteña / rioplatense, apasionada y muy conversacional. Gran fuerza expresiva y espontaneidad.',
    bestArchetype: 'Debate apasionado, opinión y crítica',
    sampleText: 'Buenas, ¿cómo están? Soy Tomás. Con entonación rioplatense directa, enérgica y llena de carácter.',
    pitch: 1.0,
    speed: 1.03,
    isPremium: true,
  },
  {
    id: 'regional-salome-co',
    name: 'Salomé Andina',
    engine: 'hybrid',
    geminiVoiceId: 'Aoede',
    edgeVoiceId: 'es-CO-SalomeNeural',
    gender: 'female',
    vocalRegister: 'Mezzosoprano Andina (Colombia)',
    accent: 'Andino (Colombia)',
    accentCode: 'CO',
    flag: '🇨🇴',
    description: 'Dicción colombiana de extraordinaria musicalidad y nitidez. Apreciada por su neutralidad y elegancia en doblaje.',
    bestArchetype: 'Divulgación científica rigurosa y elegancia',
    sampleText: 'Hola a todos, soy Salomé. La dicción colombiana es reconocida internacionalmente por su pulcritud, musicalidad y claridad.',
    pitch: 1.0,
    speed: 0.98,
    isPremium: true,
  },
];

/**
 * Busca un perfil de voz por su ID interno
 */
export function getVoiceProfileById(id: string): VoiceModelProfile | undefined {
  return PREMIUM_VOICE_CATALOG.find((v) => v.id === id);
}

/**
 * Encuentra el mejor perfil a partir de un ID de voz, nombre de voz de Gemini o género
 */
export function getVoiceProfileByGeminiName(
  voiceIdOrName?: string,
  gender: 'male' | 'female' = 'male'
): VoiceModelProfile {
  if (voiceIdOrName) {
    // 1. Coincidencia exacta por ID de perfil (ej: 'gemini-charon', 'regional-alvaro-es')
    const byId = PREMIUM_VOICE_CATALOG.find((v) => v.id === voiceIdOrName);
    if (byId) return byId;

    // 2. Coincidencia por nombre exacto
    const byName = PREMIUM_VOICE_CATALOG.find(
      (v) => v.name.toLowerCase() === voiceIdOrName.toLowerCase()
    );
    if (byName) return byName;

    // 3. Coincidencia por geminiVoiceId (Puck, Charon, etc.)
    const byGemini = PREMIUM_VOICE_CATALOG.find(
      (v) => v.geminiVoiceId?.toLowerCase() === voiceIdOrName.toLowerCase()
    );
    if (byGemini) return byGemini;
  }
  // Fallback por defecto según género
  return gender === 'male'
    ? PREMIUM_VOICE_CATALOG[0] // Puck
    : PREMIUM_VOICE_CATALOG[4]; // Kore
}

/**
 * Filtra el catálogo por criterios combinados
 */
export function filterVoiceCatalog(filters: {
  gender?: 'all' | 'male' | 'female';
  accent?: string;
  register?: string;
  search?: string;
}): VoiceModelProfile[] {
  return PREMIUM_VOICE_CATALOG.filter((voice) => {
    // Filtro por género
    if (filters.gender && filters.gender !== 'all') {
      if (voice.gender !== filters.gender) return false;
    }

    // Filtro por acento
    if (filters.accent && filters.accent !== 'all') {
      if (voice.accentCode !== filters.accent) return false;
    }

    // Filtro por registro vocal
    if (filters.register && filters.register !== 'all') {
      if (!voice.vocalRegister.toLowerCase().includes(filters.register.toLowerCase())) {
        return false;
      }
    }

    // Búsqueda por texto libre
    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      const searchable = `${voice.name} ${voice.vocalRegister} ${voice.accent} ${voice.bestArchetype} ${voice.description}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}
