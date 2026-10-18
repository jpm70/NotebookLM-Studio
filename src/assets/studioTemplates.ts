import { StudioTemplatePreset, VideoVisualStyle, VideoTransitionType } from '../types';

export interface VisualStyleConfig {
  id: VideoVisualStyle;
  name: string;
  icon: string;
  badge: string;
  description: string;
  colors: {
    bgStart: string;
    bgMid: string;
    bgEnd: string;
    accent: string;
    accentSecondary: string;
    textTitle: string;
    textSub: string;
    cardBg: string;
    cardBorder: string;
  };
}

export const VISUAL_STYLES: VisualStyleConfig[] = [
  {
    id: 'studio',
    name: 'Deep Studio (NotebookLM)',
    icon: '🎙️',
    badge: 'Oficial',
    description: 'Estilo cinematográfico oscuro con iluminación ambiental suave, viñeta profunda y ondas de voz doradas.',
    colors: {
      bgStart: '#090d16',
      bgMid: '#0f172a',
      bgEnd: '#020617',
      accent: '#f59e0b',
      accentSecondary: '#3b82f6',
      textTitle: '#ffffff',
      textSub: '#94a3b8',
      cardBg: 'rgba(15, 23, 42, 0.88)',
      cardBorder: '#334155',
    },
  },
  {
    id: 'anime',
    name: 'Estilo Anime & Manga',
    icon: '⚡',
    badge: 'Japón / Shonen',
    description: 'Líneas cinéticas de velocidad estilo manga, marco con esquinas anguladas y resplandores neón púrpura y fucsia.',
    colors: {
      bgStart: '#180728',
      bgMid: '#2e1065',
      bgEnd: '#090117',
      accent: '#d946ef',
      accentSecondary: '#38bdf8',
      textTitle: '#fdf4ff',
      textSub: '#e879f9',
      cardBg: 'rgba(30, 8, 50, 0.92)',
      cardBorder: '#c084fc',
    },
  },
  {
    id: 'whiteboard',
    name: 'Pizarra / Whiteboard Académico',
    icon: '✏️',
    badge: 'Divulgación / Ed',
    description: 'Textura de pizarra de tiza o papel milimetrado con trazos manuales, esquemas gráficos y tipografía nítida.',
    colors: {
      bgStart: '#141e1b',
      bgMid: '#1a2924',
      bgEnd: '#0b1210',
      accent: '#34d399',
      accentSecondary: '#fbbf24',
      textTitle: '#f0fdf4',
      textSub: '#a7f3d0',
      cardBg: 'rgba(20, 36, 30, 0.90)',
      cardBorder: '#059669',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk & Neón Tech',
    icon: '🕹️',
    badge: 'Futurista 80s',
    description: 'Líneas de scanline holográficas, rejilla cibernética en perspectiva y tipografía de alto contraste con brillo cian.',
    colors: {
      bgStart: '#020617',
      bgMid: '#051329',
      bgEnd: '#02040a',
      accent: '#06b6d4',
      accentSecondary: '#ec4899',
      textTitle: '#ffffff',
      textSub: '#67e8f9',
      cardBg: 'rgba(3, 15, 38, 0.92)',
      cardBorder: '#0891b2',
    },
  },
  {
    id: 'minimal',
    name: 'Documental Minimalista',
    icon: '🏛️',
    badge: 'Elegante / Prensa',
    description: 'Monocromo elegante y sobrio estilo documental nórdico, sin distracciones y con máxima legibilidad.',
    colors: {
      bgStart: '#0a0a0a',
      bgMid: '#171717',
      bgEnd: '#000000',
      accent: '#e2e8f0',
      accentSecondary: '#94a3b8',
      textTitle: '#ffffff',
      textSub: '#cbd5e1',
      cardBg: 'rgba(23, 23, 23, 0.88)',
      cardBorder: '#404040',
    },
  },
];

export const TRANSITION_STYLES: Array<{
  id: VideoTransitionType;
  name: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'ken-burns',
    name: 'Zoom Ken Burns Dinámico',
    icon: '🎥',
    description: 'Desplazamiento cinematográfico suave y zoom progresivo que aporta vida al fondo.',
  },
  {
    id: 'crossfade',
    name: 'Disolución Cruzada (Crossfade)',
    icon: '✨',
    description: 'Fundido suave y elegante entre cada turno de diálogo sin saltos bruscos.',
  },
  {
    id: 'slide',
    name: 'Deslizamiento Lateral (Slide)',
    icon: '↔️',
    description: 'La diapositiva entra suavemente desde el lado del locutor que toma la palabra.',
  },
  {
    id: 'glitch',
    name: 'Glitch Digital Cyberpunk',
    icon: '⚡',
    description: 'Transición digital de interferencia en giros de guion y momentos clave.',
  },
  {
    id: 'cut',
    name: 'Corte Directo (Broadcast Cut)',
    icon: '✂️',
    description: 'Corte instantáneo televisivo clásico, limpio y sin demora visual.',
  },
];

export const STUDIO_TEMPLATES: StudioTemplatePreset[] = [
  {
    id: 'tech-briefing',
    name: 'Tech Briefing 80s',
    icon: '🕹️',
    description: 'Música Synthwave, estética Cyberpunk, subtítulos dinámicos de alto impacto y cortes con glitch.',
    visualStyle: 'cyberpunk',
    turnTransition: 'glitch',
    bgmTrack: 'synthwave',
    subtitleStyle: 'modern-bold',
    introAnimation: 'neon-glitch',
    outroAnimation: 'neon-pulse',
    enableBackchanneling: true,
  },
  {
    id: 'anime-studio',
    name: 'Anime & Manga Show',
    icon: '⚡',
    description: 'Líneas cinéticas, colores fucsia y cian, subtítulos karaoke estilo TikTok y transiciones con deslizamiento.',
    visualStyle: 'anime',
    turnTransition: 'slide',
    bgmTrack: 'synthwave',
    subtitleStyle: 'karaoke',
    introAnimation: 'pulse-impact',
    outroAnimation: 'social-cards',
    enableBackchanneling: true,
  },
  {
    id: 'whiteboard-edu',
    name: 'Pizarra Académica / Edición Clase',
    icon: '✏️',
    description: 'Fondo de pizarra técnica, música acústica relajada, subtítulos tipo tarjeta y transiciones directas.',
    visualStyle: 'whiteboard',
    turnTransition: 'cut',
    bgmTrack: 'acoustic',
    subtitleStyle: 'card',
    introAnimation: 'minimal-slide',
    outroAnimation: 'fade-zoom-out',
    enableBackchanneling: false,
  },
  {
    id: 'deep-dialogue',
    name: 'Debate Filosófico Profundo',
    icon: '🎙️',
    description: 'El clásico estilo NotebookLM con música Lo-Fi cálida, subtítulos karaoke y movimiento Ken Burns.',
    visualStyle: 'studio',
    turnTransition: 'ken-burns',
    bgmTrack: 'lofi',
    subtitleStyle: 'karaoke',
    introAnimation: 'cinematic-zoom',
    outroAnimation: 'fade-zoom-out',
    enableBackchanneling: true,
  },
  {
    id: 'documentary-minimal',
    name: 'Documental & Prensa Escandinava',
    icon: '🏛️',
    badge: 'Elegante',
    description: 'BGM ambiental, estética monocromática minimalista, subtítulos tipo cine y disoluciones cruzadas.',
    visualStyle: 'minimal',
    turnTransition: 'crossfade',
    bgmTrack: 'ambient',
    subtitleStyle: 'cinema',
    introAnimation: 'spotlight-reveal',
    outroAnimation: 'spotlight-exit',
    enableBackchanneling: false,
  },
];
