/**
 * Catálogo de Avatares Predeterminados para Locutores
 * Diseñados en SVG de alta resolución con estética de estudio de podcast, anime, cyberpunk y académico.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  category: 'podcast' | 'scifi' | 'anime' | 'academic';
  gender: 'male' | 'female' | 'neutral';
  icon: string;
  description: string;
  svgDataUrl: string;
}

const createSvgDataUrl = (svgContent: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  // --- 1. PODCAST & LOCUTORES PRO ---
  {
    id: 'alex-podcast-pro',
    name: 'Alex Pro (Studio Host)',
    category: 'podcast',
    gender: 'male',
    icon: '🎙️',
    description: 'Locutor masculino profesional con auriculares supraaurales y estilo moderno.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="bgAlex" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="skinAlex" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbcfe8"/>
            <stop offset="100%" stop-color="#f472b6"/>
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="76" fill="url(#bgAlex)" stroke="#3b82f6" stroke-width="4"/>
        <!-- Torso -->
        <path d="M 32 152 C 32 120 54 112 80 112 C 106 112 128 120 128 152 Z" fill="#2563eb"/>
        <!-- Cuello y Cabeza -->
        <rect x="70" y="90" width="20" height="26" fill="#fbcfe8" rx="4"/>
        <ellipse cx="80" cy="74" rx="28" ry="32" fill="#fbcfe8"/>
        <!-- Pelo -->
        <path d="M 52 70 C 52 46 64 38 80 38 C 96 38 108 46 108 70 C 104 56 94 48 80 48 C 66 48 56 56 52 70 Z" fill="#1e293b"/>
        <!-- Ojos y Sonrisa -->
        <circle cx="69" cy="72" r="3.5" fill="#0f172a"/>
        <circle cx="91" cy="72" r="3.5" fill="#0f172a"/>
        <path d="M 72 86 Q 80 94 88 86" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <!-- Auriculares Profesionales -->
        <path d="M 44 74 C 44 42 116 42 116 74" fill="none" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
        <rect x="38" y="66" width="12" height="22" rx="6" fill="#1d4ed8" stroke="#93c5fd" stroke-width="2"/>
        <rect x="110" y="66" width="12" height="22" rx="6" fill="#1d4ed8" stroke="#93c5fd" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: 'sam-creative-producer',
    name: 'Sam Tech (Analista & Host)',
    category: 'podcast',
    gender: 'female',
    icon: '🎧',
    description: 'Locutora creativa con gafas de diseñador, auriculares de estudio y mirada analítica.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="bgSam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="76" fill="url(#bgSam)" stroke="#f59e0b" stroke-width="4"/>
        <!-- Torso -->
        <path d="M 32 152 C 32 120 54 112 80 112 C 106 112 128 120 128 152 Z" fill="#d97706"/>
        <!-- Cuello y Cabeza -->
        <rect x="71" y="90" width="18" height="26" fill="#fed7aa" rx="4"/>
        <ellipse cx="80" cy="74" rx="27" ry="30" fill="#fed7aa"/>
        <!-- Pelo estilizado -->
        <path d="M 50 82 C 46 50 62 40 80 40 C 98 40 114 50 110 82 C 114 92 110 110 106 116 C 98 72 90 48 80 48 C 70 48 62 72 54 116 C 50 110 46 92 50 82 Z" fill="#451a03"/>
        <!-- Gafas modernas -->
        <rect x="60" y="66" width="16" height="14" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
        <rect x="84" y="66" width="16" height="14" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
        <line x1="76" y1="73" x2="84" y2="73" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="68" cy="73" r="2.5" fill="#0f172a"/>
        <circle cx="92" cy="73" r="2.5" fill="#0f172a"/>
        <!-- Sonrisa -->
        <path d="M 73 88 Q 80 94 87 88" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Auriculares -->
        <path d="M 46 72 C 46 42 114 42 114 72" fill="none" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
        <rect x="40" y="64" width="11" height="20" rx="5" fill="#b45309" stroke="#fef08a" stroke-width="2"/>
        <rect x="109" y="64" width="11" height="20" rx="5" fill="#b45309" stroke="#fef08a" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: 'marcus-broadcaster',
    name: 'Marcus (Veterano de Radio)',
    category: 'podcast',
    gender: 'male',
    icon: '📻',
    description: 'Periodista y comunicador con barba cuidada y porte radiofónico clásico.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#1e1e24" stroke="#64748b" stroke-width="4"/>
        <path d="M 32 152 C 32 116 54 110 80 110 C 106 110 128 116 128 152 Z" fill="#334155"/>
        <rect x="71" y="90" width="18" height="24" fill="#fde047" opacity="0.8" rx="4"/>
        <ellipse cx="80" cy="72" rx="26" ry="28" fill="#fbcfe8"/>
        <!-- Barba -->
        <path d="M 58 76 C 58 98 70 104 80 104 C 90 104 102 98 102 76 C 96 90 88 94 80 94 C 72 94 64 90 58 76 Z" fill="#475569"/>
        <circle cx="68" cy="68" r="3" fill="#0f172a"/>
        <circle cx="92" cy="68" r="3" fill="#0f172a"/>
        <!-- Pelo grisáceo -->
        <path d="M 54 62 C 54 44 66 38 80 38 C 94 38 106 44 106 62 C 102 50 92 46 80 46 C 68 46 58 50 54 62 Z" fill="#94a3b8"/>
      </svg>
    `),
  },
  {
    id: 'elena-journalist',
    name: 'Elena (Periodista de Investigación)',
    category: 'podcast',
    gender: 'female',
    icon: '📝',
    description: 'Reportera sagaz y perspicaz con corte bob y pendientes dorados.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#141e1b" stroke="#10b981" stroke-width="4"/>
        <path d="M 32 152 C 32 118 54 112 80 112 C 106 112 128 118 128 152 Z" fill="#047857"/>
        <rect x="71" y="90" width="18" height="26" fill="#fed7aa" rx="4"/>
        <ellipse cx="80" cy="74" rx="26" ry="28" fill="#fed7aa"/>
        <!-- Pelo Bob oscuro -->
        <path d="M 50 78 C 50 48 62 40 80 40 C 98 40 110 48 110 78 C 114 96 104 104 104 104 C 98 80 92 50 80 50 C 68 50 62 80 56 104 C 56 104 46 96 50 78 Z" fill="#18181b"/>
        <circle cx="68" cy="72" r="3" fill="#0f172a"/>
        <circle cx="92" cy="72" r="3" fill="#0f172a"/>
        <path d="M 74 86 Q 80 90 86 86" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Pendiente dorado -->
        <circle cx="51" cy="80" r="3.5" fill="#f59e0b"/>
      </svg>
    `),
  },

  // --- 2. IA & SCI-FI / CYBERPUNK ---
  {
    id: 'cyber-ghost-ai',
    name: 'Cyber Ghost (Entidad Sintética)',
    category: 'scifi',
    gender: 'neutral',
    icon: '👻',
    description: 'Androide translúcido holográfico con visor neón y auriculares cibernéticos.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <defs>
          <linearGradient id="cyberG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="76" fill="#030712" stroke="url(#cyberG)" stroke-width="4"/>
        <!-- Halo de red neuronal -->
        <circle cx="80" cy="74" r="38" fill="none" stroke="#06b6d4" stroke-width="1.5" opacity="0.4" stroke-dasharray="4 3"/>
        <!-- Cuerpo estilizado -->
        <path d="M 36 152 C 36 122 56 116 80 116 C 104 116 124 122 124 152 Z" fill="#0f172a" stroke="#06b6d4" stroke-width="2"/>
        <!-- Cabeza androide -->
        <rect x="54" y="46" width="52" height="58" rx="24" fill="#0b1329" stroke="url(#cyberG)" stroke-width="3"/>
        <!-- Visor holográfico -->
        <rect x="58" y="64" width="44" height="14" rx="7" fill="#030712"/>
        <line x1="64" y1="71" x2="96" y2="71" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/>
        <circle cx="80" cy="71" r="5" fill="#f43f5e"/>
        <!-- Cascos cyber -->
        <rect x="46" y="60" width="8" height="22" rx="4" fill="#06b6d4"/>
        <rect x="106" y="60" width="8" height="22" rx="4" fill="#8b5cf6"/>
      </svg>
    `),
  },
  {
    id: 'nexus-robot',
    name: 'Nexus Core (IA Autónoma)',
    category: 'scifi',
    gender: 'neutral',
    icon: '🤖',
    description: 'Cerebro mecatrónico de alta precisión con luces cuánticas y nodos de cómputo.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#050814" stroke="#3b82f6" stroke-width="4"/>
        <!-- Chasis -->
        <rect x="50" y="48" width="60" height="64" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
        <!-- Ojos LED -->
        <rect x="60" y="62" width="16" height="10" rx="3" fill="#38bdf8"/>
        <rect x="84" y="62" width="16" height="10" rx="3" fill="#38bdf8"/>
        <!-- Antena -->
        <line x1="80" y1="48" x2="80" y2="34" stroke="#38bdf8" stroke-width="3"/>
        <circle cx="80" cy="32" r="5" fill="#f59e0b"/>
        <!-- Medidor acústico -->
        <rect x="64" y="86" width="32" height="6" rx="3" fill="#0284c7"/>
      </svg>
    `),
  },

  // --- 3. ANIME & MANGA ---
  {
    id: 'shonen-anime-host',
    name: 'Kenji (Anime Protagonista)',
    category: 'anime',
    gender: 'male',
    icon: '🎌',
    description: 'Personaje anime dinámico con cabello puntiagudo y mirada enérgica.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#180728" stroke="#d946ef" stroke-width="4"/>
        <!-- Torso con sudadera -->
        <path d="M 32 152 C 32 120 54 114 80 114 C 106 114 128 120 128 152 Z" fill="#701a75"/>
        <!-- Cuello y Rostro anime anguloso -->
        <polygon points="70,90 90,90 80,108" fill="#fce7f3"/>
        <polygon points="56,60 104,60 94,96 80,106 66,96" fill="#fce7f3"/>
        <!-- Pelo anime picudo -->
        <polygon points="50,60 38,36 60,42 70,24 84,38 100,22 108,44 124,36 112,64" fill="#a21caf"/>
        <!-- Ojos grandes anime con brillo -->
        <ellipse cx="68" cy="74" rx="6" ry="8" fill="#4a044e"/>
        <circle cx="67" cy="72" r="2.5" fill="#ffffff"/>
        <ellipse cx="92" cy="74" rx="6" ry="8" fill="#4a044e"/>
        <circle cx="91" cy="72" r="2.5" fill="#ffffff"/>
        <!-- Sonrisa segura -->
        <path d="M 74 90 Q 80 96 86 90" fill="none" stroke="#701a75" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: 'manga-analyst-host',
    name: 'Yuki (Analista Manga)',
    category: 'anime',
    gender: 'female',
    icon: '🌸',
    description: 'Heroína anime intelectual con horquillas y ojos expresivos.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#1f1124" stroke="#ec4899" stroke-width="4"/>
        <path d="M 32 152 C 32 120 54 114 80 114 C 106 114 128 120 128 152 Z" fill="#be185d"/>
        <polygon points="70,90 90,90 80,106" fill="#fdf2f8"/>
        <polygon points="58,62 102,62 92,94 80,104 68,94" fill="#fdf2f8"/>
        <!-- Pelo largo fucsia con flequillo -->
        <path d="M 52 64 C 48 40 60 34 80 34 C 100 34 112 40 108 64 C 114 80 116 114 112 122 C 102 70 96 50 80 50 C 64 50 58 70 48 122 C 44 114 46 80 52 64 Z" fill="#db2777"/>
        <!-- Ojos anime violetas -->
        <ellipse cx="70" cy="74" rx="5.5" ry="7.5" fill="#831843"/>
        <circle cx="69" cy="72" r="2" fill="#ffffff"/>
        <ellipse cx="90" cy="74" rx="5.5" ry="7.5" fill="#831843"/>
        <circle cx="89" cy="72" r="2" fill="#ffffff"/>
        <circle cx="58" cy="54" r="3" fill="#fef08a"/>
      </svg>
    `),
  },

  // --- 4. ACADÉMICO & TED ---
  {
    id: 'prof-clara-science',
    name: 'Dra. Clara (Científica & TED)',
    category: 'academic',
    gender: 'female',
    icon: '🎓',
    description: 'Investigadora y divulgadora científica con gafas redondas y estilo sobrio.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#0f172a" stroke="#10b981" stroke-width="4"/>
        <path d="M 32 152 C 32 120 54 114 80 114 C 106 114 128 120 128 152 Z" fill="#065f46"/>
        <rect x="71" y="90" width="18" height="26" fill="#fde68a" opacity="0.9" rx="4"/>
        <ellipse cx="80" cy="74" rx="26" ry="29" fill="#fde68a" opacity="0.9"/>
        <!-- Pelo recogido -->
        <circle cx="80" cy="38" r="16" fill="#334155"/>
        <path d="M 54 68 C 54 48 64 42 80 42 C 96 42 106 48 106 68 C 102 56 94 50 80 50 C 66 50 58 56 54 68 Z" fill="#334155"/>
        <!-- Gafas redondas de investigadora -->
        <circle cx="68" cy="72" r="9" fill="none" stroke="#10b981" stroke-width="2.5"/>
        <circle cx="92" cy="72" r="9" fill="none" stroke="#10b981" stroke-width="2.5"/>
        <line x1="77" y1="72" x2="83" y2="72" stroke="#10b981" stroke-width="2"/>
        <circle cx="68" cy="72" r="2.5" fill="#0f172a"/>
        <circle cx="92" cy="72" r="2.5" fill="#0f172a"/>
      </svg>
    `),
  },
  {
    id: 'dr-tomas-philosopher',
    name: 'Prof. Tomás (Pensador & Ensayista)',
    category: 'academic',
    gender: 'male',
    icon: '📚',
    description: 'Académico reflexivo con cuello cisne y expresión analítica.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r="76" fill="#18181b" stroke="#f59e0b" stroke-width="4"/>
        <path d="M 32 152 C 32 120 54 114 80 114 C 106 114 128 120 128 152 Z" fill="#09090b"/>
        <!-- Cuello cisne negro -->
        <rect x="68" y="86" width="24" height="28" fill="#18181b" rx="6"/>
        <ellipse cx="80" cy="72" rx="26" ry="28" fill="#fcd34d" opacity="0.85"/>
        <circle cx="69" cy="70" r="3" fill="#0f172a"/>
        <circle cx="91" cy="70" r="3" fill="#0f172a"/>
        <path d="M 74 86 Q 80 89 86 86" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
        <!-- Cabello ondulado -->
        <path d="M 52 64 C 52 42 66 36 80 36 C 94 36 108 42 108 64 C 104 52 92 46 80 46 C 68 46 56 52 52 64 Z" fill="#52525b"/>
      </svg>
    `),
  },
];

export const getAvatarPresetById = (id?: string): AvatarPreset | undefined => {
  return AVATAR_PRESETS.find((p) => p.id === id);
};

export const DEFAULT_HOST_A_AVATAR = AVATAR_PRESETS[0]; // Alex Pro
export const DEFAULT_HOST_B_AVATAR = AVATAR_PRESETS[1]; // Sam Tech
