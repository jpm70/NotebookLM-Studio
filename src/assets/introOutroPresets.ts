/**
 * Presets de Logos vectoriales, Efectos Visuales y Sonidos para Pantallas de Intro y Outro
 * Optimizado para renderizado instantáneo en Canvas y compatibilidad total sin dependencias externas.
 */

export interface LogoPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  svgDataUrl: string;
}

export interface AnimationPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  recommendedDuration: number;
}

// Generador de SVG Data URLs ultraligeros y de altísima nitidez
const createSvgDataUrl = (svgContent: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
};

export const LOGO_PRESETS: LogoPreset[] = [
  {
    id: 'ghost-cyberpunk',
    name: 'Fantasma Cyberpunk (Oficial)',
    category: 'Branding Canal',
    icon: '👻',
    description: 'Emblema distintivo de Un Fantasma en el Sistema con auriculares neón y visor holográfico.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="ghostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Glow halo -->
        <circle cx="100" cy="100" r="88" fill="#020617" stroke="url(#ghostGrad)" stroke-width="4" filter="url(#neonGlow)"/>
        <!-- Ghost Body -->
        <path d="M 60 110 C 60 65 140 65 140 110 C 140 145 130 155 120 145 C 110 135 100 150 90 140 C 80 150 70 138 60 145 Z" fill="url(#ghostGrad)" opacity="0.95"/>
        <!-- Eyes / Visor -->
        <rect x="76" y="90" width="48" height="14" rx="7" fill="#020617"/>
        <circle cx="88" cy="97" r="4.5" fill="#38bdf8"/>
        <circle cx="112" cy="97" r="4.5" fill="#f59e0b"/>
        <!-- Headphones -->
        <path d="M 52 105 C 52 60 148 60 148 105" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
        <rect x="46" y="96" width="12" height="26" rx="6" fill="#38bdf8"/>
        <rect x="142" y="96" width="12" height="26" rx="6" fill="#f59e0b"/>
      </svg>
    `),
  },
  {
    id: 'studio-mic',
    name: 'Micrófono Studio Pro',
    category: 'Podcast Profesional',
    icon: '🎙️',
    description: 'Micrófono de condensador de radiodifusión con cápsula dorada y ondas acústicas.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
        <!-- Mic Grille -->
        <rect x="82" y="45" width="36" height="58" rx="18" fill="url(#goldGrad)"/>
        <line x1="82" y1="65" x2="118" y2="65" stroke="#78350f" stroke-width="2"/>
        <line x1="82" y1="80" x2="118" y2="80" stroke="#78350f" stroke-width="2"/>
        <!-- U-Mount -->
        <path d="M 68 85 C 68 128 132 128 132 85" fill="none" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>
        <line x1="100" y1="128" x2="100" y2="155" stroke="#e2e8f0" stroke-width="6"/>
        <line x1="75" y1="155" x2="125" y2="155" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
        <!-- Sound Waves -->
        <path d="M 50 85 C 44 95 44 105 50 115" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
        <path d="M 150 85 C 156 95 156 105 150 115" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: 'soundwave-quantum',
    name: 'Onda Cuántica Holográfica',
    category: 'Tech & Futuro',
    icon: '🎧',
    description: 'Ecualizador de ondas cuánticas con iluminación de espectro cian y violeta.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="50%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="#090d16" stroke="url(#waveGrad)" stroke-width="3"/>
        <!-- Wave Bars -->
        <g fill="url(#waveGrad)">
          <rect x="42" y="85" width="8" height="30" rx="4"/>
          <rect x="56" y="70" width="8" height="60" rx="4"/>
          <rect x="70" y="55" width="8" height="90" rx="4"/>
          <rect x="84" y="45" width="8" height="110" rx="4"/>
          <rect x="98" y="35" width="8" height="130" rx="4"/>
          <rect x="112" y="48" width="8" height="104" rx="4"/>
          <rect x="126" y="60" width="8" height="80" rx="4"/>
          <rect x="140" y="72" width="8" height="56" rx="4"/>
          <rect x="154" y="88" width="8" height="24" rx="4"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'retro-cassette',
    name: 'Casete Neón 80s',
    category: 'Retro Synthwave',
    icon: '📼',
    description: 'Cinta analógica vintage con estética ochentera neón para podcasts de cultura y debate.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="tapeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f43f5e"/>
            <stop offset="50%" stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="#020617" stroke="url(#tapeGrad)" stroke-width="3"/>
        <!-- Cassette Shell -->
        <rect x="45" y="65" width="110" height="70" rx="10" fill="#0f172a" stroke="url(#tapeGrad)" stroke-width="4"/>
        <!-- Label -->
        <rect x="55" y="73" width="90" height="32" rx="4" fill="url(#tapeGrad)"/>
        <!-- Tape Reels -->
        <circle cx="75" cy="112" r="14" fill="#020617" stroke="#ffffff" stroke-width="2"/>
        <circle cx="125" cy="112" r="14" fill="#020617" stroke="#ffffff" stroke-width="2"/>
        <rect x="85" y="105" width="30" height="14" rx="2" fill="#1e293b"/>
      </svg>
    `),
  },
  {
    id: 'lightning-bolt',
    name: 'Rayo de Alto Impacto',
    category: 'Energía & Dinamismo',
    icon: '⚡',
    description: 'Descarga eléctrica dorada para inicios contundentes, noticias urgentes y novedades.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="40%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#ea580c"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="#0a0a0f" stroke="#f59e0b" stroke-width="3"/>
        <path d="M 108 35 L 62 108 L 98 108 L 88 165 L 142 92 L 106 92 Z" fill="url(#boltGrad)" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: 'brain-agent',
    name: 'Cerebro Agéntico 2026',
    category: 'IA & Ciencia',
    icon: '🌐',
    description: 'Red neuronal sináptica interconectada que simboliza agentes autónomos y LLMs.',
    svgDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" fill="#030712" stroke="#38bdf8" stroke-width="3"/>
        <!-- Network Lines -->
        <line x1="70" y1="80" x2="100" y2="60" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="130" y1="80" x2="100" y2="60" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="70" y1="80" x2="80" y2="125" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="130" y1="80" x2="120" y2="125" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="80" y1="125" x2="100" y2="145" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="120" y1="125" x2="100" y2="145" stroke="#38bdf8" stroke-width="3" opacity="0.6"/>
        <line x1="100" y1="60" x2="100" y2="100" stroke="#f59e0b" stroke-width="3"/>
        <line x1="70" y1="80" x2="100" y2="100" stroke="#f59e0b" stroke-width="3"/>
        <line x1="130" y1="80" x2="100" y2="100" stroke="#f59e0b" stroke-width="3"/>
        <line x1="100" y1="100" x2="100" y2="145" stroke="#f59e0b" stroke-width="3"/>
        <!-- Nodes -->
        <circle cx="100" cy="60" r="10" fill="#38bdf8"/>
        <circle cx="70" cy="80" r="9" fill="#38bdf8"/>
        <circle cx="130" cy="80" r="9" fill="#38bdf8"/>
        <circle cx="100" cy="100" r="14" fill="#f59e0b"/>
        <circle cx="80" cy="125" r="9" fill="#38bdf8"/>
        <circle cx="120" cy="125" r="9" fill="#38bdf8"/>
        <circle cx="100" cy="145" r="10" fill="#38bdf8"/>
      </svg>
    `),
  },
];

// Presets de animación visual de INTRO
export const INTRO_ANIMATIONS: AnimationPreset[] = [
  {
    id: 'cinematic-zoom',
    name: 'Zoom Cinemático & Resplandor',
    badge: 'Recomendado',
    description: 'Zoom-in suave de cámara (0.75x a 1.05x) con apertura de luz ámbar/azul y fade-in de textos.',
    recommendedDuration: 3.5,
  },
  {
    id: 'neon-glitch',
    name: 'Holograma Neón & Scanlines',
    badge: 'Futurista',
    description: 'Efecto de encendido digital con halo cian/ámbar, destellos cromáticos y estabilización de alta definición.',
    recommendedDuration: 3.0,
  },
  {
    id: 'spotlight-reveal',
    name: 'Foco de Revelado Teatral',
    badge: 'Cinematográfico',
    description: 'Foco de luz central que se expande progresivamente iluminando el logo y revelando el titular.',
    recommendedDuration: 4.0,
  },
  {
    id: 'minimal-slide',
    name: 'Deslizamiento Minimalista',
    badge: 'Elegante',
    description: 'Apertura sobria estilo documental o Bloomberg con línea expansiva y deslizamiento suave desde abajo.',
    recommendedDuration: 2.5,
  },
  {
    id: 'pulse-impact',
    name: 'Onda de Choque Acústica',
    badge: 'Gran Impacto',
    description: 'Impacto rítmico con aros concéntricos expansivos que emanan del logo, ideal para entradas con gancho.',
    recommendedDuration: 3.0,
  },
];

// Presets de animación visual de OUTRO / CIERRE
export const OUTRO_ANIMATIONS: AnimationPreset[] = [
  {
    id: 'fade-zoom-out',
    name: 'Alejamiento Cinemático a Negro',
    badge: 'Clásico YouTube',
    description: 'Zoom-out suave (1.05x a 0.95x) con halo de despedida, viñeta oscura y foco en la llamada a la acción.',
    recommendedDuration: 3.5,
  },
  {
    id: 'neon-pulse',
    name: 'Respiración Neón & Agradecimiento',
    badge: 'Moderno',
    description: 'Pulso relajante de luz en los colores de ambos anfitriones con resplandor en los enlaces y redes.',
    recommendedDuration: 3.0,
  },
  {
    id: 'social-cards',
    name: 'Tarjetas de Suscripción & CTA',
    badge: 'Conversión',
    description: 'Aparición de botones destacados con animaciones para suscribirse, activar la campana y visitar la web.',
    recommendedDuration: 4.0,
  },
  {
    id: 'spotlight-exit',
    name: 'Cierre de Telón & Foco Final',
    badge: 'Teatro',
    description: 'El foco luminoso se concentra sobre el logo del canal mientras el fondo se atenúa elegantemente.',
    recommendedDuration: 3.0,
  },
];

// SFX disponibles para vincular a Intro y Outro
export const INTRO_SFX_OPTIONS = [
  { id: 'rise', name: 'Rise Cinematográfico (Crescendo)', icon: '📈' },
  { id: 'swoosh', name: 'Swoosh Dinámico (Transición de aire)', icon: '💨' },
  { id: 'bell-ding', name: 'Campana Brillante (Ding de inicio)', icon: '🔔' },
  { id: 'ambient-scifi', name: 'Bruma Sci-Fi (Ambiente sintético)', icon: '🌌' },
  { id: 'none', name: 'Sin efecto sonoro (Solo BGM / Silencio)', icon: '🔇' },
];

export const OUTRO_SFX_OPTIONS = [
  { id: 'gong-peaceful', name: 'Gong Zen (Cierre reflexivo)', icon: '🧘' },
  { id: 'tada-fanfare', name: 'Fanfarria Ta-Dá (Despedida triunfal)', icon: '🎺' },
  { id: 'swoosh', name: 'Swoosh Suave (Desvanecimiento)', icon: '💨' },
  { id: 'none', name: 'Sin efecto sonoro (Solo BGM / Silencio)', icon: '🔇' },
];

export interface VisualStyleOption {
  id: 'studio' | 'anime' | 'whiteboard' | 'cyberpunk' | 'minimal';
  name: string;
  badge: string;
  icon: string;
  color: string;
  borderColor: string;
  bgGradientPreview: string;
  description: string;
  features: string[];
  promptTag: string;
  promptPrefix: string;
}

export const VISUAL_STYLES: VisualStyleOption[] = [
  {
    id: 'anime',
    name: 'Anime & Manga Action',
    badge: 'Estilo Anime',
    icon: '🎌',
    color: '#d946ef',
    borderColor: 'border-fuchsia-500/50',
    bgGradientPreview: 'from-purple-900 via-indigo-950 to-slate-950',
    description: 'Estética japonesa Shonen con líneas cinéticas de velocidad, energía cósmica magenta/violeta y destellos dinámicos.',
    features: ['Líneas de velocidad radiales', 'Aura de energía luminosa', 'Partículas de impacto'],
    promptTag: 'Filtro Anime Makoto Shinkai',
    promptPrefix: 'Vibrant Japanese anime style, Makoto Shinkai aesthetic, Studio Ghibli inspired, expressive anime colors, clean line art, luminous lighting: ',
  },
  {
    id: 'whiteboard',
    name: 'Pizarra Masterclass TED',
    badge: 'Estilo Pizarra',
    icon: '🎓',
    color: '#10b981',
    borderColor: 'border-emerald-500/50',
    bgGradientPreview: 'from-emerald-950 via-teal-950 to-slate-950',
    description: 'Pizarra verde mate de tiza escolar con cuadrícula milimétrica sutil, ideal para exposiciones, ciencia y explicaciones profundas.',
    features: ['Fondo de tiza verde académica', 'Cuadrícula técnica sutil', 'Trazos manuscritos de boceto'],
    promptTag: 'Filtro Pizarra & Tiza TED',
    promptPrefix: 'Clean educational whiteboard sketch illustration, chalkboard and marker drawing style, hand-drawn diagrams and doodles, clean instructional visual: ',
  },
  {
    id: 'studio',
    name: 'Cinemático & Studio Pro',
    badge: 'Recomendado',
    icon: '🎬',
    color: '#f59e0b',
    borderColor: 'border-amber-500/50',
    bgGradientPreview: 'from-slate-900 via-blue-950 to-slate-950',
    description: 'Fotografía cinemática 35mm con iluminación volumétrica dramática, texturas 8k y gradientes oscuros de estudio.',
    features: ['Fotografía 35mm cinematográfica', 'Iluminación volumétrica dramática', 'Contraste óptimo para YouTube'],
    promptTag: 'Filtro Cinemático 35mm 8K',
    promptPrefix: 'Cinematic movie still, dramatic 35mm film photography, volumetric lighting, photorealistic textures, 8k resolution, award-winning cinematography: ',
  },
  {
    id: 'minimal',
    name: 'Minimalista Cine / Docu',
    badge: 'Minimalista',
    icon: '📽️',
    color: '#94a3b8',
    borderColor: 'border-slate-500/50',
    bgGradientPreview: 'from-zinc-900 via-neutral-900 to-black',
    description: 'Composición sobria escandinava monocromática con líneas puras, tipografía nítida y cero distracciones visuales.',
    features: ['Línea de horizonte sobria', 'Paleta monocroma de alto impacto', 'Tipografía editorial suiza'],
    promptTag: 'Filtro Minimalista Bauhaus',
    promptPrefix: 'Minimalist modern graphic design, Bauhaus and Swiss style, clean geometric shapes, limited sophisticated color palette, elegant negative space: ',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neón 2077',
    badge: 'Futurista',
    icon: '🤖',
    color: '#06b6d4',
    borderColor: 'border-cyan-500/50',
    bgGradientPreview: 'from-cyan-950 via-blue-950 to-slate-950',
    description: 'Ambiente futurista distópico con suelo en perspectiva 3D, scanlines de terminal holográfico y neón cian/rosa.',
    features: ['Suelo de rejilla en perspectiva', 'Scanlines holográficas', 'Resplandor cuántico neón'],
    promptTag: 'Filtro Cyberpunk Neón Octane',
    promptPrefix: 'Cyberpunk futuristic digital art, neon lights, glowing cyan and magenta hologram elements, high-tech dystopian atmosphere, octane render: ',
  },
];

export interface TransitionOption {
  id: 'ken-burns' | 'crossfade' | 'glitch' | 'slide' | 'cut';
  name: string;
  icon: string;
  description: string;
}

export const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    id: 'ken-burns',
    name: 'Ken Burns Cinemático',
    icon: '🎬',
    description: 'Zoom suave y continuo sobre el fondo ilustrado con respiración sutil.',
  },
  {
    id: 'crossfade',
    name: 'Disolución Cruzada',
    icon: '✨',
    description: 'Fundido suave entre el inicio y final del turno.',
  },
  {
    id: 'glitch',
    name: 'Salto Glitch VHS',
    icon: '⚡',
    description: 'Efecto de interferencia digital rápido y cyberpunk al cambiar de turno.',
  },
  {
    id: 'slide',
    name: 'Deslizamiento Lateral',
    icon: '↔️',
    description: 'Paso dinámico de diapositiva con desplazamiento suave de cámara.',
  },
  {
    id: 'cut',
    name: 'Corte Seco Directo',
    icon: '✂️',
    description: 'Corte limpio e instantáneo al estilo emisión televisiva en vivo.',
  },
];

export const STUDIO_TEMPLATE_PRESETS = [
  {
    id: 'anime-shonen',
    name: '🎌 Anime Battle Shonen',
    badge: 'Viral',
    icon: '🎌',
    visualStyle: 'anime' as const,
    turnTransition: 'ken-burns' as const,
    bgmTrack: 'synthwave' as const,
    subtitleStyle: 'karaoke' as const,
    introAnimation: 'pulse-impact',
    outroAnimation: 'neon-pulse',
    enableBackchanneling: true,
    description: 'Look anime vibrante, música synthwave rápida, subtítulos de karaoke y alta energía.',
  },
  {
    id: 'whiteboard-masterclass',
    name: '🎓 Pizarra Masterclass TED',
    badge: 'Académico',
    icon: '🎓',
    visualStyle: 'whiteboard' as const,
    turnTransition: 'slide' as const,
    bgmTrack: 'acoustic' as const,
    subtitleStyle: 'card' as const,
    introAnimation: 'minimal-slide',
    outroAnimation: 'spotlight-exit',
    enableBackchanneling: true,
    description: 'Pizarra de tiza verde académica, música acústica reflexiva y subtítulos en tarjeta elegante.',
  },
  {
    id: 'cyberpunk-matrix',
    name: '🤖 Cyberpunk 2077 Matrix',
    badge: 'Tech / IA',
    icon: '🤖',
    visualStyle: 'cyberpunk' as const,
    turnTransition: 'glitch' as const,
    bgmTrack: 'scifi' as const,
    subtitleStyle: 'modern-bold' as const,
    introAnimation: 'neon-glitch',
    outroAnimation: 'neon-pulse',
    enableBackchanneling: true,
    description: 'Líneas neón de matriz cuántica, música Sci-Fi inmersiva y saltos glitch entre turnos.',
  },
  {
    id: 'studio-standard',
    name: '🎙️ Podcast Broadcast Pro',
    badge: 'Oficial',
    icon: '🎙️',
    visualStyle: 'studio' as const,
    turnTransition: 'ken-burns' as const,
    bgmTrack: 'lofi' as const,
    subtitleStyle: 'karaoke' as const,
    introAnimation: 'cinematic-zoom',
    outroAnimation: 'fade-zoom-out',
    enableBackchanneling: true,
    description: 'Estudio profesional oscuro con música Lo-Fi relajante y zoom suave de cámara.',
  },
  {
    id: 'minimal-docu',
    name: '📽️ Documental Minimalista',
    badge: 'Cine',
    icon: '📽️',
    visualStyle: 'minimal' as const,
    turnTransition: 'cut' as const,
    bgmTrack: 'ambient' as const,
    subtitleStyle: 'cinema' as const,
    introAnimation: 'minimal-slide',
    outroAnimation: 'spotlight-exit',
    enableBackchanneling: false,
    description: 'Estilo cinematográfico sobrio, música ambient de piano y subtítulos cinema widescreen.',
  },
];
