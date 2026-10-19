/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SourceInputSection } from './components/SourceInputSection';
import { HostConfigSection } from './components/HostConfigSection';
import { ScriptEditor } from './components/ScriptEditor';
import { AudioVisualizerPlayer } from './components/AudioVisualizerPlayer';
import { VideoStudio } from './components/VideoStudio';
import { PythonPackageViewer } from './components/PythonPackageViewer';
import { HostConfig, PodcastScript, StudioSettings, ConnectionStatus } from './types';
import { generateScriptWithGemini } from './services/geminiService';
import { getStoredApiKey } from './services/apiKeyStorage';
import { Sparkles, FileText, Radio, Film, AlertCircle, ExternalLink } from 'lucide-react';
import { DEFAULT_LOGO_BASE64, DEFAULT_LOGO_PATH } from './assets/logoData';
import {
  DEFAULT_HOST_A_AVATAR,
  DEFAULT_HOST_B_AVATAR,
} from './assets/avatarPresets';
import {
  isHtmlArticle,
  parseTechnicalArticleHtml,
  buildScriptFromParsedArticle,
} from './services/articleParser';
import { SampleTopicItem } from './data/sampleTopicsData';
import { browserTTS } from './services/ttsService';

const INITIAL_HOST_A: HostConfig = {
  name: 'Alice',
  role: 'Explicadora técnica y analítica',
  tone: 'Estructurada, rigurosa y pedagógica',
  voiceGender: 'female',
  neuralVoice: 'Kore', // Voz femenina de Gemini TTS
  voiceRegister: 'Mezzosoprano Conversacional (Cálida)',
  voiceAccent: 'Castellano (España)',
  voicePitch: 1.0,
  voiceSpeed: 1.0,
  color: '#3b82f6',
  avatarIcon: '🎙️',
  avatarPresetId: DEFAULT_HOST_A_AVATAR.id,
  avatarUrl: DEFAULT_HOST_A_AVATAR.svgDataUrl,
};

const INITIAL_HOST_B: HostConfig = {
  name: 'Bob',
  role: 'Curioso y cuestionador',
  tone: 'Espontáneo, incisivo y ameno',
  voiceGender: 'male',
  neuralVoice: 'Puck', // Voz masculina de Gemini TTS
  voiceRegister: 'Barítono Cálido (Medio-Grave)',
  voiceAccent: 'Castellano (España)',
  voicePitch: 1.0,
  voiceSpeed: 1.0,
  color: '#f59e0b',
  avatarIcon: '🎧',
  avatarPresetId: DEFAULT_HOST_B_AVATAR.id,
  avatarUrl: DEFAULT_HOST_B_AVATAR.svgDataUrl,
};

const INITIAL_SETTINGS: StudioSettings = {
  aspectRatio: '16:9',
  resolution: '720p',
  fps: 24,
  language: 'Español de España',
  tone: 'Divulgativo, entretenido y riguroso',
  targetTurns: 8,
  pauseBetweenSpeakers: 0.3,
  ttsEngine: 'gemini', // 'gemini' para voces neurales de alta definición o 'browser'
  branding: {
    enabledLogo: true,
    logoUrl: DEFAULT_LOGO_BASE64,
    logoPosition: 'top-right',
    logoSizePercent: 14,
    logoOpacity: 0.9,
    websiteUrl: 'https://www.unfantasmaenelsistema.com/',
    visualStyle: 'anime',
    includeIntro: true,
    introDuration: 3.5,
    introTitle: 'La Revolución de la IA Agéntica en 2026',
    introSubtitle: 'Un Fantasma en el Sistema presenta NotebookLM Audio Overview',
    introAnimation: 'cinematic-zoom',
    introSfx: 'rise',
    includePostIntro: true,
    postIntroDuration: 3.2,
    postIntroAnimation: 'kinetic-type',
    articleCategory: 'Redes inalámbricas | unfantasmaenelsistema.com',
    includeOutro: true,
    outroDuration: 3.5,
    outroTitle: '¡Gracias por acompañarnos!',
    outroSubtitle: 'Suscríbete al canal y activa la campanita para más análisis',
    outroCallToAction: 'Visita www.unfantasmaenelsistema.com',
    outroAnimation: 'fade-zoom-out',
    outroSfx: 'gong-peaceful',
    enabledSubtitles: true,
    subtitleFontSize: 'medium',
    subtitleStyle: 'karaoke',
    subtitleAnimation: 'karaoke',
    enabledBgm: true,
    bgmTrack: 'lofi',
    bgmVolume: 0.18,
    enableAutoDucking: true,
    turnBackgroundImages: {},
  },
};

const DEFAULT_SAMPLE_SCRIPT: PodcastScript = {
  episode_title: 'La Revolución de la IA Agéntica y Multimodal en 2026',
  episode_summary: 'Alice y Bob analizan el salto de los modelos conversacionales a agentes multimodales con razonamiento en tiempo real, latencias bajo 200ms y los desafíos térmicos de los centros de datos.',
  turns: [
    {
      speaker: 'Host_A',
      emotion: 'entusiasta',
      text: '¡Bienvenidos a todos! Hoy tenemos sobre la mesa un documento que cambia por completo las reglas del juego: cómo la inteligencia artificial en 2026 ha dejado atrás el simple texto predictivo para convertirse en agentes proactivos con razonamiento continuo.',
      visual_title: 'El Salto Agéntico 2026',
      visual_prompt: 'Cinematic laboratory with glowing holographic neural graphs and warm amber highlights',
    },
    {
      speaker: 'Host_B',
      emotion: 'curioso',
      text: 'Totalmente, Alice. Pero a ver, cuando hablamos de latencias inferiores a 200 milisegundos en voz y visión, ¿no estamos hablando básicamente de que el modelo piensa al mismo tiempo que te está escuchando?',
      visual_title: 'Multimodalidad en Tiempo Real',
      visual_prompt: 'Split-screen waveform analysis showing instant sound to vector cognitive mapping',
    },
    {
      speaker: 'Host_A',
      emotion: 'analítico',
      text: 'Exacto, Bob. Ya no existe ese molesto retardo de "transcribe a texto, genera respuesta y sintetiza voz". Es una arquitectura omnidireccional nativa. El sistema detecta tus micro-pausas y la inflexión de tu voz con una precisión casi humana.',
      visual_title: 'Arquitectura Omnidireccional',
      visual_prompt: 'High tech data center interior with liquid cooled compute nodes and indigo light reflections',
    },
    {
      speaker: 'Host_B',
      emotion: 'sorprendido',
      text: '¡Es alucinante! Aunque leyendo la segunda parte del documento, los ingenieros señalan un muro que no podemos ignorar: la disipación térmica y el consumo eléctrico de refrigerar estos clústeres gigantescos.',
      visual_title: 'El Límite Físico y Energético',
      visual_prompt: 'Futuristic immersion cooling tanks glowing neon cyan with server blades submerged',
    },
    {
      speaker: 'Host_A',
      emotion: 'reflexivo',
      text: 'Por eso precisamente muchas compañías están migrando a modelos híbridos y destilación de conocimiento. No necesitas un modelo colosal para cada tarea cotidiana cuando un agente especializado puede resolverlo con una fracción del gasto.',
      visual_title: 'Eficiencia y Destilación',
      visual_prompt: 'Compact silicon processor chip pulsing with golden circuitry and geometric crystal nodes',
    },
    {
      speaker: 'Host_B',
      emotion: 'entusiasta',
      text: 'Y eso significa que muy pronto podremos llevar esta capacidad en el bolsillo de forma local y privada. ¡Un futuro apasionante, sin duda alguna!',
      visual_title: 'Conclusiones y Futuro',
      visual_prompt: 'Inspirational dawn sunrise over a modern sustainable city skyline with clean energy drones',
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'python'>('studio');
  const [studioSubTab, setStudioSubTab] = useState<'input' | 'script' | 'audio' | 'video'>('input');

  const [sourceText, setSourceText] = useState(
    'La inteligencia artificial en 2026 ha transitado de modelos puramente reactivos a sistemas agénticos con razonamiento profundo y multimodalidad omnidireccional nativa. Los modelos ahora pueden escuchar, razonar y hablar con latencias inferiores a 200 milisegundos, permitiendo conversaciones en tiempo real que capturan inflexiones emocionales, risas y pausas reflexivas.'
  );

  const [hostA, setHostA] = useState<HostConfig>(INITIAL_HOST_A);
  const [hostB, setHostB] = useState<HostConfig>(INITIAL_HOST_B);
  const [settings, setSettings] = useState<StudioSettings>(INITIAL_SETTINGS);

  const [script, setScript] = useState<PodcastScript | null>(DEFAULT_SAMPLE_SCRIPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Connection & API Key Modal State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState('Modo local / Servidor disponible');

  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setStatus('connected');
      setStatusMessage('Clave almacenada en localStorage');
    }
    const savedLogo = localStorage.getItem('unfantasma_custom_logo');
    if (savedLogo) {
      setSettings((prev) => ({
        ...prev,
        branding: { ...prev.branding, logoUrl: savedLogo },
      }));
    }
  }, []);

  const handleCustomLogoUpload = (dataUrl: string) => {
    try {
      localStorage.setItem('unfantasma_custom_logo', dataUrl);
    } catch {
      // Ignorar si excede cuota de almacenamiento
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current?.abort();
  };

  const handleGenerateScript = async () => {
    const controller = new AbortController();
    generationAbortRef.current = controller;
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGenerationStatus('Preparando la petición a Gemini…');
      setGenerationStartedAt(Date.now());

      const isArticle = isHtmlArticle(sourceText);
      const parsed = isArticle ? parseTechnicalArticleHtml(sourceText) : null;

      const generated = await generateScriptWithGemini(
        sourceText,
        hostA,
        hostB,
        settings.tone,
        settings.language,
        parsed && parsed.totalExpectedSlides > 0 ? parsed.totalExpectedSlides : settings.targetTurns,
        undefined,
        settings.branding.visualStyle || 'anime',
        { onStatus: setGenerationStatus, signal: controller.signal }
      );

      setScript(generated);
      setSettings((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          introTitle: parsed?.title || generated.episode_title,
          introSubtitle: parsed?.subtitle || prev.branding.introSubtitle,
          articleCategory: parsed?.category || prev.branding.articleCategory,
          includePostIntro: true,
          visualStyle: prev.branding.visualStyle || 'anime',
        },
      }));
      setStudioSubTab('script');
    } catch (err: any) {
      console.error('Error generando guion:', err);
      if (!controller.signal.aborted) {
        setErrorMessage(err?.message || 'Error al conectar con Gemini. Verifica tu clave de API.');
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
      setGenerationStartedAt(null);
      generationAbortRef.current = null;
    }
  };

  const handleDirectArticleBuild = () => {
    try {
      const parsed = parseTechnicalArticleHtml(sourceText);
      const built = buildScriptFromParsedArticle(parsed, hostA.name, hostB.name);

      setScript(built);
      setSettings((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          introTitle: parsed.title,
          introSubtitle: parsed.subtitle,
          articleCategory: parsed.category,
          includePostIntro: true,
          visualStyle: 'anime',
        },
      }));
      setStudioSubTab('script');
    } catch (err: any) {
      console.error('Error generando diapositivas directas:', err);
      setErrorMessage(err?.message || 'Error al procesar la estructura del artículo.');
    }
  };

  const handleSelectSampleTopic = (topic: SampleTopicItem) => {
    try {
      setSourceText(topic.text);
      const generatedScript = topic.getScript(hostA.name, hostB.name);
      setScript(generatedScript);
      setSettings((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          introTitle: topic.introTitle,
          introSubtitle: topic.introSubtitle,
          articleCategory: topic.articleCategory,
          includePostIntro: true,
          visualStyle: 'anime',
        },
      }));
      browserTTS.clearCache();
    } catch (err: any) {
      console.error('Error cargando tema de prueba:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* App Header with Logo & Web Link */}
      <Header
        status={status}
        statusMessage={statusMessage}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logoUrl={settings.branding.logoUrl}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-semibold text-[11px] shrink-0"
            >
              Configurar Clave
            </button>
          </div>
        )}

        {/* Tab 1: Studio Workflow */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Step Tabs Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
              <button
                onClick={() => setStudioSubTab('input')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  studioSubTab === 'input'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                1. Ingesta y Locutores
              </button>

              <button
                onClick={() => setStudioSubTab('script')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  studioSubTab === 'script'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                2. Guion Estructurado ({script ? `${script.turns.length} turnos` : 'Vacío'})
              </button>

              <button
                onClick={() => setStudioSubTab('audio')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  studioSubTab === 'audio'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                3. Síntesis y Audio
              </button>

              <button
                onClick={() => setStudioSubTab('video')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  studioSubTab === 'video'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                4. Vídeo Final ({settings.aspectRatio}) • Logo, Portada y Fin
              </button>
            </div>

            {/* Workflow Step Contents */}
            {studioSubTab === 'input' && (
              <div className="space-y-6">
                <SourceInputSection
                  sourceText={sourceText}
                  setSourceText={setSourceText}
                  onGenerate={handleGenerateScript}
                  onDirectArticleBuild={handleDirectArticleBuild}
                  onSelectSampleTopic={handleSelectSampleTopic}
                  isGenerating={isGenerating}
                  generationStatus={generationStatus}
                  generationStartedAt={generationStartedAt}
                  onCancelGeneration={handleCancelGeneration}
                />
                <HostConfigSection
                  hostA={hostA}
                  setHostA={setHostA}
                  hostB={hostB}
                  setHostB={setHostB}
                  settings={settings}
                  setSettings={setSettings}
                />
              </div>
            )}

            {studioSubTab === 'script' && script && (
              <ScriptEditor
                script={script}
                setScript={setScript}
                hostA={hostA}
                hostB={hostB}
                settings={settings}
                setSettings={setSettings}
              />
            )}

            {studioSubTab === 'audio' && script && (
              <AudioVisualizerPlayer
                script={script}
                hostA={hostA}
                hostB={hostB}
                language={settings.language}
                pauseBetweenSpeakers={settings.pauseBetweenSpeakers}
                ttsEngine={settings.ttsEngine}
              />
            )}

            {studioSubTab === 'video' && script && (
              <VideoStudio
                script={script}
                setScript={setScript}
                hostA={hostA}
                hostB={hostB}
                settings={settings}
                setSettings={setSettings}
                onLogoUpload={handleCustomLogoUpload}
              />
            )}
          </div>
        )}

        {/* Tab 2: Python / Streamlit Package Viewer */}
        {activeTab === 'python' && (
          <PythonPackageViewer
            script={script}
            hostA={hostA}
            hostB={hostB}
            settings={settings}
          />
        )}
      </main>

      {/* Footer with Un Fantasma en el Sistema logo and link */}
      <footer className="border-t border-slate-800/80 bg-slate-950/95 py-6 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 hover:border-amber-500 transition-all shadow-sm"
              title="Visitar Un Fantasma en el Sistema"
            >
              <img
                src={settings.branding.logoUrl || DEFAULT_LOGO_BASE64}
                alt="Logo Un Fantasma en el Sistema"
                className="w-full h-full object-contain aspect-square"
              />
            </a>
            <div>
              <p className="text-slate-200 font-bold flex items-center gap-1.5">
                NotebookLM Studio to YouTube Video Generator
              </p>
              <p className="text-slate-400 text-[11px]">
                Desarrollado para{' '}
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                >
                  www.unfantasmaenelsistema.com
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              Vídeos H.264 / AAC con Marca de Agua
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              Compatible con GitHub Pages
            </span>
          </div>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        status={status}
        setStatus={setStatus}
        statusMessage={statusMessage}
        setStatusMessage={setStatusMessage}
      />
    </div>
  );
}
