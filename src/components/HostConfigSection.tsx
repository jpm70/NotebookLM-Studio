import React, { useEffect, useState } from 'react';
import {
  Users,
  User,
  Sliders,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  Volume2,
  Sparkles,
  Mic,
  Play,
  Square,
  Loader2,
  Settings2,
  Check,
  Upload,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import { HostConfig, StudioSettings, VoiceModelProfile } from '../types';
import { GEMINI_NEURAL_VOICES, browserTTS } from '../services/ttsService';
import {
  PREMIUM_VOICE_CATALOG,
  getVoiceProfileByGeminiName,
  getVoiceProfileById,
} from '../services/voiceCatalog';
import { PremiumVoiceModal } from './PremiumVoiceModal';
import { AvatarSelectorModal } from './AvatarSelectorModal';
import {
  getAvatarPresetById,
  DEFAULT_HOST_A_AVATAR,
  DEFAULT_HOST_B_AVATAR,
} from '../assets/avatarPresets';

interface HostConfigSectionProps {
  hostA: HostConfig;
  setHostA: React.Dispatch<React.SetStateAction<HostConfig>>;
  hostB: HostConfig;
  setHostB: React.Dispatch<React.SetStateAction<HostConfig>>;
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
}

export const HostConfigSection: React.FC<HostConfigSectionProps> = ({
  hostA,
  setHostA,
  hostB,
  setHostB,
  settings,
  setSettings,
}) => {
  const [browserVoiceList, setBrowserVoiceList] = useState<SpeechSynthesisVoice[]>([]);
  
  // Modal de selector avanzado de voces
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [modalTargetHost, setModalTargetHost] = useState<'Host_A' | 'Host_B'>('Host_A');

  // Modal de selector de avatares
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarModalTargetHost, setAvatarModalTargetHost] = useState<'Host_A' | 'Host_B'>('Host_A');

  // Estado de reproducción de preview rápido por anfitrión
  const [previewingHost, setPreviewingHost] = useState<'Host_A' | 'Host_B' | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<'Host_A' | 'Host_B' | null>(null);

  useEffect(() => {
    const list = browserTTS.getAvailableBrowserVoices(settings.language.substring(0, 2));
    setBrowserVoiceList(list);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        setBrowserVoiceList(browserTTS.getAvailableBrowserVoices(settings.language.substring(0, 2)));
      };
    }
  }, [settings.language]);

  // Limpiar reproducción si se desmonta
  useEffect(() => {
    return () => {
      browserTTS.stop();
    };
  }, []);

  const openVoiceModal = (hostTarget: 'Host_A' | 'Host_B') => {
    browserTTS.stop();
    setPreviewingHost(null);
    setModalTargetHost(hostTarget);
    setIsVoiceModalOpen(true);
  };

  const handleSelectVoiceFromModal = (
    voice: VoiceModelProfile,
    customPitch?: number,
    customSpeed?: number
  ) => {
    const isA = modalTargetHost === 'Host_A';
    const setter = isA ? setHostA : setHostB;

    setter((prev) => ({
      ...prev,
      voiceProfileId: voice.id,
      voiceGender: voice.gender,
      neuralVoice: voice.geminiVoiceId as any,
      voiceName: voice.name,
      voiceRegister: voice.vocalRegister,
      voiceAccent: voice.accent,
      voicePitch: customPitch ?? voice.pitch,
      voiceSpeed: customSpeed ?? voice.speed,
      systemVoiceURI: voice.edgeVoiceId,
    }));
    browserTTS.clearCache();
  };

  const openAvatarModal = (hostTarget: 'Host_A' | 'Host_B') => {
    setAvatarModalTargetHost(hostTarget);
    setIsAvatarModalOpen(true);
  };

  const handleSelectAvatar = (
    avatarUrl: string,
    presetId?: string,
    icon?: string
  ) => {
    const isA = avatarModalTargetHost === 'Host_A';
    const setter = isA ? setHostA : setHostB;

    setter((prev) => ({
      ...prev,
      avatarUrl,
      avatarPresetId: presetId,
      avatarIcon: icon || prev.avatarIcon,
    }));
  };

  const handleDirectFileUpload = (
    hostTarget: 'Host_A' | 'Host_B',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const setter = hostTarget === 'Host_A' ? setHostA : setHostB;
        setter((prev) => ({
          ...prev,
          avatarUrl: dataUrl,
          avatarPresetId: undefined,
          avatarIcon: '🖼️',
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickPreview = async (hostTarget: 'Host_A' | 'Host_B') => {
    if (previewingHost === hostTarget) {
      browserTTS.stop();
      setPreviewingHost(null);
      setIsLoadingPreview(null);
      return;
    }

    browserTTS.stop();
    setIsLoadingPreview(hostTarget);
    setPreviewingHost(null);

    const isA = hostTarget === 'Host_A';
    const host = isA ? hostA : hostB;
    const profile = getVoiceProfileByGeminiName(host.neuralVoice, host.voiceGender);

    const sampleText = isA
      ? `¡Hola! Soy ${host.name}. Mi registro es ${profile.vocalRegister}. Explicaré los conceptos con rigor y máxima claridad.`
      : `¡Totalmente de acuerdo! Soy ${host.name}. Aporto preguntas incisivas y un estilo espontáneo en cada debate.`;

    try {
      setIsLoadingPreview(null);
      setPreviewingHost(hostTarget);

      await browserTTS.previewVoice(
        sampleText,
        host.neuralVoice || profile.geminiVoiceId || 'Puck',
        host.voiceGender,
        (host.voicePitch || 1.0) * (profile.pitch || 1.0),
        (host.voiceSpeed || 1.0) * (profile.speed || 1.0),
        settings.ttsEngine,
        host.systemVoiceURI || profile.edgeVoiceId
      );
    } catch (err) {
      console.warn('Error en previsualización de voz:', err);
    } finally {
      setPreviewingHost((prev) => (prev === hostTarget ? null : prev));
      setIsLoadingPreview(null);
    }
  };

  // Perfiles de voz actuales calculados
  const voiceProfileA = (hostA.voiceProfileId ? getVoiceProfileById(hostA.voiceProfileId) : null) || getVoiceProfileByGeminiName(hostA.neuralVoice, hostA.voiceGender);
  const voiceProfileB = (hostB.voiceProfileId ? getVoiceProfileById(hostB.voiceProfileId) : null) || getVoiceProfileByGeminiName(hostB.neuralVoice, hostB.voiceGender);

  return (
    <div className="space-y-6">
      {/* TTS Engine Selection Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                Motor de Voces y Síntesis de Audio
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  NotebookLM Dual-Speaker
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Selecciona entre voces neurales de estudio o el sintetizador web local del dispositivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, ttsEngine: 'gemini' }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                settings.ttsEngine === 'gemini'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Voces Neurales Gemini (Estudio HD)
            </button>

            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, ttsEngine: 'browser' }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                settings.ttsEngine === 'browser'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Sintetizador Web (Navegador)
            </button>
          </div>
        </div>
      </div>

      {/* Hosts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ==================================================== */}
        {/* Host A Card (Anfitrión Principal) */}
        {/* ==================================================== */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  A
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Host A (Anfitrión Principal)</h3>
                  <p className="text-[11px] text-slate-400">Guía la narrativa y explica los conceptos base</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                Speaker: Host_A
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={hostA.name}
                  onChange={(e) => setHostA((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Rol / Arquetipo</label>
                <input
                  type="text"
                  value={hostA.role}
                  onChange={(e) => setHostA((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tono y Estilo</label>
                <input
                  type="text"
                  value={hostA.tone}
                  onChange={(e) => setHostA((prev) => ({ ...prev, tone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* SELECTOR DE AVATAR DEL LOCUTOR (HOST A) */}
              <div className="pt-2 border-t border-slate-800/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Avatar del Locutor:
                  </label>
                  <button
                    type="button"
                    onClick={() => openAvatarModal('Host_A')}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline transition-all"
                  >
                    <Palette className="w-3 h-3" />
                    Cambiar Avatar
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/90 border border-blue-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-400 flex items-center justify-center bg-slate-900 shrink-0 shadow-md shadow-blue-500/20">
                        {hostA.avatarUrl ? (
                          <img
                            src={hostA.avatarUrl}
                            alt={hostA.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-white">
                            {hostA.avatarIcon || (hostA.name[0] || 'A').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {hostA.avatarIcon || '🎙️'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">
                        {getAvatarPresetById(hostA.avatarPresetId)?.name || (hostA.avatarUrl ? 'Avatar Personalizado' : 'Alex Pro')}
                      </h5>
                      <span className="text-[10px] text-blue-300 font-medium block">
                        Visible en Reproductor y Vídeo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 hover:text-white border border-blue-800/60 text-[11px] font-semibold flex items-center gap-1 transition-all">
                      <Upload className="w-3 h-3" />
                      Subir
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => handleDirectFileUpload('Host_A', e)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openAvatarModal('Host_A')}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-sm transition-all"
                    >
                      Elegir
                    </button>
                  </div>
                </div>
              </div>

              {/* SELECTOR AVANZADO DE VOZ PREMIUM HOST A */}
              <div className="pt-2 border-t border-slate-800/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Voz Asignada:
                  </label>
                  <button
                    type="button"
                    onClick={() => openVoiceModal('Host_A')}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline transition-all"
                  >
                    <Settings2 className="w-3 h-3" />
                    Abrir Catálogo Completo
                  </button>
                </div>

                {/* Tarjeta de Voz Activa con botón de Previsualizar Audio */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-blue-500/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{voiceProfileA.flag}</span>
                        <h5 className="text-xs font-black text-white">
                          {voiceProfileA.name}
                        </h5>
                        <span className="text-[10px] text-blue-400 font-mono">
                          [{hostA.neuralVoice || voiceProfileA.geminiVoiceId}]
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-300 font-medium">
                        {hostA.voiceRegister || voiceProfileA.vocalRegister}
                      </span>
                    </div>

                    {/* Botón de Previsualización en Vivo */}
                    <button
                      type="button"
                      onClick={() => handleQuickPreview('Host_A')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        previewingHost === 'Host_A'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isLoadingPreview === 'Host_A'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50'
                      }`}
                      title="Escuchar prueba de voz"
                    >
                      {isLoadingPreview === 'Host_A' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          Generando...
                        </>
                      ) : previewingHost === 'Host_A' ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          Detener
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current text-blue-400" />
                          Probar Voz
                        </>
                      )}
                    </button>
                  </div>

                  {/* Acceso Rápido desplegable de modelos más populares */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Modelo Rápido:</label>
                      <select
                        value={hostA.voiceProfileId || (PREMIUM_VOICE_CATALOG.find(v => v.geminiVoiceId === hostA.neuralVoice && v.gender === hostA.voiceGender)?.id) || (PREMIUM_VOICE_CATALOG.find(v => v.geminiVoiceId === hostA.neuralVoice)?.id) || (hostA.voiceGender === 'female' ? 'gemini-kore' : 'gemini-puck')}
                        onChange={(e) => {
                          const prof = getVoiceProfileById(e.target.value) || getVoiceProfileByGeminiName(e.target.value, hostA.voiceGender);
                          setHostA((prev) => ({
                            ...prev,
                            voiceProfileId: prof.id,
                            neuralVoice: prof.geminiVoiceId as any,
                            voiceName: prof.name,
                            voiceGender: prof.gender,
                            voiceRegister: prof.vocalRegister,
                            voiceAccent: prof.accent,
                            voicePitch: prof.pitch,
                            voiceSpeed: prof.speed,
                            systemVoiceURI: prof.edgeVoiceId,
                          }));
                          browserTTS.clearCache();
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 truncate"
                      >
                        {(['female', 'male'] as const).map((g) => (
                          <optgroup key={g} label={g === 'female' ? 'Voces femeninas' : 'Voces masculinas'}>
                            {PREMIUM_VOICE_CATALOG.filter((v) => v.gender === g).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.flag} {v.name} ({v.vocalRegister.split(' ')[0]})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tono (Pitch):</label>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="range"
                          min={0.8}
                          max={1.25}
                          step={0.05}
                          value={hostA.voicePitch || 1.0}
                          onChange={(e) =>
                            setHostA((prev) => ({ ...prev, voicePitch: Number(e.target.value) }))
                          }
                          className="w-full accent-blue-500"
                        />
                        <span className="text-[10px] font-mono font-bold text-blue-400 shrink-0">
                          {(hostA.voicePitch || 1.0).toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* Host B Card (Co-Anfitrión Cuestionador) */}
        {/* ==================================================== */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  B
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Host B (Co-Anfitrión Cuestionador)</h3>
                  <p className="text-[11px] text-slate-400">Hace preguntas incisivas y busca analogías cotidianas</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                Speaker: Host_B
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={hostB.name}
                  onChange={(e) => setHostB((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Rol / Arquetipo</label>
                <input
                  type="text"
                  value={hostB.role}
                  onChange={(e) => setHostB((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tono y Estilo</label>
                <input
                  type="text"
                  value={hostB.tone}
                  onChange={(e) => setHostB((prev) => ({ ...prev, tone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* SELECTOR DE AVATAR DEL LOCUTOR (HOST B) */}
              <div className="pt-2 border-t border-slate-800/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Avatar del Locutor:
                  </label>
                  <button
                    type="button"
                    onClick={() => openAvatarModal('Host_B')}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline transition-all"
                  >
                    <Palette className="w-3 h-3" />
                    Cambiar Avatar
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 flex items-center justify-center bg-slate-900 shrink-0 shadow-md shadow-amber-500/20">
                        {hostB.avatarUrl ? (
                          <img
                            src={hostB.avatarUrl}
                            alt={hostB.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-white">
                            {hostB.avatarIcon || (hostB.name[0] || 'B').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {hostB.avatarIcon || '🎧'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">
                        {getAvatarPresetById(hostB.avatarPresetId)?.name || (hostB.avatarUrl ? 'Avatar Personalizado' : 'Sam Tech')}
                      </h5>
                      <span className="text-[10px] text-amber-300 font-medium block">
                        Visible en Reproductor y Vídeo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 hover:text-white border border-amber-800/60 text-[11px] font-semibold flex items-center gap-1 transition-all">
                      <Upload className="w-3 h-3" />
                      Subir
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => handleDirectFileUpload('Host_B', e)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openAvatarModal('Host_B')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold shadow-sm transition-all"
                    >
                      Elegir
                    </button>
                  </div>
                </div>
              </div>

              {/* SELECTOR AVANZADO DE VOZ PREMIUM HOST B */}
              <div className="pt-2 border-t border-slate-800/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Voz Asignada:
                  </label>
                  <button
                    type="button"
                    onClick={() => openVoiceModal('Host_B')}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline transition-all"
                  >
                    <Settings2 className="w-3 h-3" />
                    Abrir Catálogo Completo
                  </button>
                </div>

                {/* Tarjeta de Voz Activa con botón de Previsualizar Audio */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{voiceProfileB.flag}</span>
                        <h5 className="text-xs font-black text-white">
                          {voiceProfileB.name}
                        </h5>
                        <span className="text-[10px] text-amber-400 font-mono">
                          [{hostB.neuralVoice || voiceProfileB.geminiVoiceId}]
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-medium">
                        {hostB.voiceRegister || voiceProfileB.vocalRegister}
                      </span>
                    </div>

                    {/* Botón de Previsualización en Vivo */}
                    <button
                      type="button"
                      onClick={() => handleQuickPreview('Host_B')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        previewingHost === 'Host_B'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isLoadingPreview === 'Host_B'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      }`}
                      title="Escuchar prueba de voz"
                    >
                      {isLoadingPreview === 'Host_B' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          Generando...
                        </>
                      ) : previewingHost === 'Host_B' ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          Detener
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current text-amber-400" />
                          Probar Voz
                        </>
                      )}
                    </button>
                  </div>

                  {/* Acceso Rápido desplegable de modelos más populares */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Modelo Rápido:</label>
                      <select
                        value={hostB.voiceProfileId || (PREMIUM_VOICE_CATALOG.find(v => v.geminiVoiceId === hostB.neuralVoice && v.gender === hostB.voiceGender)?.id) || (PREMIUM_VOICE_CATALOG.find(v => v.geminiVoiceId === hostB.neuralVoice)?.id) || (hostB.voiceGender === 'female' ? 'gemini-kore' : 'gemini-puck')}
                        onChange={(e) => {
                          const prof = getVoiceProfileById(e.target.value) || getVoiceProfileByGeminiName(e.target.value, hostB.voiceGender);
                          setHostB((prev) => ({
                            ...prev,
                            voiceProfileId: prof.id,
                            neuralVoice: prof.geminiVoiceId as any,
                            voiceName: prof.name,
                            voiceGender: prof.gender,
                            voiceRegister: prof.vocalRegister,
                            voiceAccent: prof.accent,
                            voicePitch: prof.pitch,
                            voiceSpeed: prof.speed,
                            systemVoiceURI: prof.edgeVoiceId,
                          }));
                          browserTTS.clearCache();
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 truncate"
                      >
                        {(['female', 'male'] as const).map((g) => (
                          <optgroup key={g} label={g === 'female' ? 'Voces femeninas' : 'Voces masculinas'}>
                            {PREMIUM_VOICE_CATALOG.filter((v) => v.gender === g).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.flag} {v.name} ({v.vocalRegister.split(' ')[0]})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tono (Pitch):</label>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="range"
                          min={0.8}
                          max={1.25}
                          step={0.05}
                          value={hostB.voicePitch || 1.0}
                          onChange={(e) =>
                            setHostB((prev) => ({ ...prev, voicePitch: Number(e.target.value) }))
                          }
                          className="w-full accent-amber-500"
                        />
                        <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                          {(hostB.voicePitch || 1.0).toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video & Studio Settings */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Parámetros del Formato de Vídeo y Ritmo</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Format */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Formato de Salida</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, aspectRatio: '16:9' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  settings.aspectRatio === '16:9'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> 16:9 YouTube
              </button>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, aspectRatio: '9:16' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  settings.aspectRatio === '9:16'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> 9:16 Shorts
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Idioma del Diálogo</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Español de España">Español de España (castellano)</option>
              <option value="Español latinoamericano">Español latinoamericano</option>
              <option value="English">English (Conversational)</option>
              <option value="Português">Português</option>
              <option value="Français">Français</option>
            </select>
          </div>

          {/* Turns Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Turnos de diálogo</label>
              <span className="text-xs font-mono font-bold text-amber-400">{settings.targetTurns} turnos</span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              step={2}
              value={settings.targetTurns}
              onChange={(e) => setSettings((s) => ({ ...s, targetTurns: Number(e.target.value) }))}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Pause Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Pausa entre locutores</label>
              <span className="text-xs font-mono font-bold text-amber-400">{settings.pauseBetweenSpeakers}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.7}
              step={0.05}
              value={settings.pauseBetweenSpeakers}
              onChange={(e) => setSettings((s) => ({ ...s, pauseBetweenSpeakers: Number(e.target.value) }))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Modal Avanzado de Selección de Voces Premium */}
      <PremiumVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetHost={modalTargetHost}
        hostConfig={modalTargetHost === 'Host_A' ? hostA : hostB}
        onSelectVoice={handleSelectVoiceFromModal}
        ttsEngine={settings.ttsEngine}
      />

      {/* Modal de Selección y Subida de Avatares */}
      <AvatarSelectorModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        targetHost={avatarModalTargetHost}
        hostConfig={avatarModalTargetHost === 'Host_A' ? hostA : hostB}
        onSelectAvatar={handleSelectAvatar}
      />
    </div>
  );
};
