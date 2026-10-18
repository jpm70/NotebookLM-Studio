export type SfxCategory = 'transition' | 'emphasis' | 'ambient';
export type SfxPosition = 'before' | 'after' | 'overlay';

export interface SoundEffectItem {
  id: string;
  name: string;
  category: SfxCategory;
  icon: string;
  description: string;
  duration: number; // in seconds
  suggestedVolume: number; // 0.05 to 1.0
  color: string;
  tag: string;
}

export interface TurnSfxConfig {
  effectId: string;
  name: string;
  category: SfxCategory;
  position: SfxPosition; // 'before' | 'after' | 'overlay'
  volume: number; // 0.1 to 1.0
  icon?: string;
  description?: string;
  customLabel?: string;
}

export type SlideType = 'table' | 'terminal' | 'context_anime' | 'standard';

export interface SlideTableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface SlideTerminalData {
  command?: string;
  lines: string[];
  title?: string;
  output?: string;
}

export interface DialogueTurn {
  speaker: 'Host_A' | 'Host_B';
  emotion: 'curioso' | 'entusiasta' | 'analítico' | 'sorprendido' | 'reflexivo' | 'divertido' | string;
  text: string;
  visual_title: string;
  visual_prompt: string;
  sfx?: TurnSfxConfig;
  slideType?: SlideType;
  tableData?: SlideTableData;
  terminalData?: SlideTerminalData;
  relevantText?: string;
  sectionTitle?: string;
  articlePointNumber?: number;
}

export interface PodcastScript {
  episode_title: string;
  episode_summary: string;
  turns: DialogueTurn[];
}

export interface VoiceModelProfile {
  id: string;
  name: string;
  engine: 'gemini' | 'browser' | 'hybrid';
  geminiVoiceId?: 'Puck' | 'Charon' | 'Fenrir' | 'Orpheus' | 'Kore' | 'Zephyr' | 'Aoede' | 'Leda' | string;
  edgeVoiceId?: string;
  gender: 'male' | 'female';
  vocalRegister: string;
  accent: string;
  accentCode: string;
  flag: string;
  description: string;
  bestArchetype: string;
  sampleText: string;
  pitch: number;
  speed: number;
  isPremium: boolean;
}

export interface HostConfig {
  name: string;
  role: string;
  tone: string;
  voiceGender: 'male' | 'female';
  voiceProfileId?: string;
  voiceName?: string;
  neuralVoice?: 'Puck' | 'Charon' | 'Fenrir' | 'Orpheus' | 'Kore' | 'Zephyr' | 'Aoede' | 'Leda' | string;
  voiceRegister?: string;
  voiceAccent?: string;
  voicePitch?: number;
  voiceSpeed?: number;
  systemVoiceURI?: string;
  color: string;
  avatarIcon: string;
  avatarUrl?: string; // Data URL or URL of uploaded or preset avatar
  avatarPresetId?: string; // ID of chosen avatar preset
}

export interface VideoBrandingSettings {
  enabledLogo: boolean;
  logoUrl: string;
  logoPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  logoSizePercent: number; // 8 to 25
  logoOpacity: number; // 0.3 to 1.0
  websiteUrl: string;
  
  // Portada (Intro Cover)
  includeIntro: boolean;
  introDuration: number; // seconds
  introTitle: string;
  introSubtitle: string;
  introCoverUrl?: string;
  introLogoUrl?: string;
  introAnimation?: 'cinematic-zoom' | 'neon-glitch' | 'spotlight-reveal' | 'minimal-slide' | 'pulse-impact' | string;
  introSfx?: string;

  // Post-Intro Animada (Animación del Título del Artículo)
  includePostIntro?: boolean;
  postIntroDuration?: number; // seconds (default: 3.2s)
  postIntroAnimation?: 'kinetic-type' | 'glitch-title' | 'neon-fade' | 'slide-reveal' | string;
  articleCategory?: string;

  // Fin (Outro Screen)
  includeOutro: boolean;
  outroDuration: number; // seconds
  outroTitle: string;
  outroSubtitle: string;
  outroCallToAction: string;
  outroLogoUrl?: string;
  outroAnimation?: 'fade-zoom-out' | 'neon-pulse' | 'social-cards' | 'spotlight-exit' | string;
  outroSfx?: string;

  // Subtítulos Sincronizados (.SRT)
  enabledSubtitles: boolean;
  subtitleFontSize: 'small' | 'medium' | 'large';
  subtitleStyle: 'card' | 'bottom-bar' | 'cinema' | 'karaoke' | 'modern-bold';
  subtitleAnimation?: 'none' | 'karaoke' | 'word_highlight' | 'pop';

  // Música de Fondo (BGM) y Auto-Ducking
  enabledBgm: boolean;
  bgmTrack: 'lofi' | 'synthwave' | 'acoustic' | 'ambient' | 'scifi' | 'custom' | 'none';
  bgmVolume: number; // 0.05 to 0.5
  enableAutoDucking: boolean; // Baja volumen al hablar
  customBgmDataUrl?: string;

  // Diapositivas / Fondos Ilustrados de Turno
  turnBackgroundImages?: Record<number, string>; // turnIndex -> image URL / base64

  // Capas de Superposición en Línea de Tiempo (Textos e Imágenes)
  overlays?: VideoOverlay[];

  // Estilo Visual del Vídeo (Anime, Pizarra, Cyberpunk, etc.)
  visualStyle?: 'studio' | 'anime' | 'whiteboard' | 'cyberpunk' | 'minimal';

  // Transiciones Cinemáticas entre Turnos
  turnTransition?: 'crossfade' | 'ken-burns' | 'glitch' | 'slide' | 'cut';

  // Reacciones Orgánicas de Fondo (Asentimientos / Backchanneling)
  enableBackchanneling?: boolean;

  // Marcadores de Capítulos en la Línea de Tiempo
  timelineChapters?: Array<{ id: string; seconds: number; title: string }>;
}

export type VideoVisualStyle = 'studio' | 'anime' | 'whiteboard' | 'cyberpunk' | 'minimal';
export type VideoTransitionType = 'crossfade' | 'ken-burns' | 'glitch' | 'slide' | 'cut';

export interface StudioTemplatePreset {
  id: string;
  name: string;
  badge?: string;
  icon: string;
  description: string;
  visualStyle: VideoVisualStyle;
  turnTransition: VideoTransitionType;
  bgmTrack: 'lofi' | 'synthwave' | 'acoustic' | 'ambient' | 'scifi' | 'custom' | 'none';
  subtitleStyle: 'card' | 'bottom-bar' | 'cinema' | 'karaoke' | 'modern-bold';
  introAnimation: string;
  outroAnimation: string;
  enableBackchanneling: boolean;
}

export type OverlayType = 'text' | 'image';

export interface VideoOverlay {
  id: string;
  type: OverlayType;
  startTime: number; // segundos desde el inicio del vídeo
  endTime: number;   // segundos de finalización
  
  // Contenido de Texto
  text?: string;
  textStyle?: 'headline' | 'lower-third' | 'badge' | 'neon' | 'quote' | 'alert';
  textColor?: string;
  textBgColor?: string;
  fontSize?: 'small' | 'medium' | 'large' | 'huge';

  // Contenido de Imagen
  imageUrl?: string;
  imageAlt?: string;

  // Posicionamiento en pantalla (% de 0 a 100)
  positionX: number; // 0 (izq), 50 (centro), 100 (der)
  positionY: number; // 0 (arriba), 50 (centro), 100 (abajo)
  widthPercent?: number; // ancho en % del lienzo (por defecto 25-45%)

  // Animación y Opacidad
  animation?: 'fade' | 'pop' | 'slide-up' | 'none';
  opacity?: number; // 0.1 a 1.0
}

export interface StudioSettings {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  fps: number;
  language: string;
  tone: string;
  targetTurns: number;
  pauseBetweenSpeakers: number; // in seconds
  ttsEngine: 'gemini' | 'browser';
  branding: VideoBrandingSettings;
}

export interface YouTubeChapter {
  timestamp: string;
  seconds: number;
  title: string;
  speaker: string;
}

export interface YouTubeMetadata {
  titles: string[];
  description: string;
  chapters: YouTubeChapter[];
  tags: string[];
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'testing' | 'error';
