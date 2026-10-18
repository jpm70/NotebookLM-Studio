import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Search,
  Check,
  Globe,
  Sliders,
  Filter,
  Mic,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { HostConfig, VoiceModelProfile } from '../types';
import {
  PREMIUM_VOICE_CATALOG,
  filterVoiceCatalog,
  getVoiceProfileByGeminiName,
} from '../services/voiceCatalog';
import { browserTTS } from '../services/ttsService';

interface PremiumVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHost: 'Host_A' | 'Host_B';
  hostConfig: HostConfig;
  onSelectVoice: (voice: VoiceModelProfile, pitch?: number, speed?: number) => void;
  ttsEngine: 'gemini' | 'browser';
}

export const PremiumVoiceModal: React.FC<PremiumVoiceModalProps> = ({
  isOpen,
  onClose,
  targetHost,
  hostConfig,
  onSelectVoice,
  ttsEngine,
}) => {
  const isHostA = targetHost === 'Host_A';
  const defaultGenderFilter = hostConfig.voiceGender || (isHostA ? 'male' : 'female');

  const [search, setSearch] = useState('');
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedRegister, setSelectedRegister] = useState<string>('all');

  // Estado de reproducción de preview
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);

  // Parámetros finos de tono y velocidad
  const [pitch, setPitch] = useState<number>(hostConfig.voicePitch || 1.0);
  const [speed, setSpeed] = useState<number>(hostConfig.voiceSpeed || 1.0);

  // Detener audio al cerrar o desmontar
  useEffect(() => {
    return () => {
      browserTTS.stop();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      browserTTS.stop();
      setPlayingVoiceId(null);
      setLoadingVoiceId(null);
    } else {
      // Ajustar filtro inicial según género del host
      setSelectedGender(hostConfig.voiceGender);
      setPitch(hostConfig.voicePitch || 1.0);
      setSpeed(hostConfig.voiceSpeed || 1.0);
    }
  }, [isOpen, hostConfig]);

  if (!isOpen) return null;

  const filteredVoices = filterVoiceCatalog({
    gender: selectedGender,
    accent: selectedAccent,
    register: selectedRegister,
    search,
  });

  const handleTogglePreview = async (voice: VoiceModelProfile) => {
    if (playingVoiceId === voice.id) {
      browserTTS.stop();
      setPlayingVoiceId(null);
      setLoadingVoiceId(null);
      return;
    }

    browserTTS.stop();
    setLoadingVoiceId(voice.id);
    setPlayingVoiceId(null);

    const sample = `${voice.sampleText} Soy ${hostConfig.name}.`;

    try {
      setLoadingVoiceId(null);
      setPlayingVoiceId(voice.id);

      await browserTTS.previewVoice(
        sample,
        voice.geminiVoiceId || 'Puck',
        voice.gender,
        pitch * (voice.pitch || 1.0),
        speed * (voice.speed || 1.0),
        ttsEngine,
        voice.edgeVoiceId
      );
    } catch (err) {
      console.warn('Error reproduciendo preview:', err);
    } finally {
      setPlayingVoiceId((prev) => (prev === voice.id ? null : prev));
      setLoadingVoiceId(null);
    }
  };

  const isCurrentVoice = (voice: VoiceModelProfile) => {
    if (hostConfig.voiceProfileId) {
      return voice.id === hostConfig.voiceProfileId;
    }
    if (hostConfig.neuralVoice) {
      return (
        voice.geminiVoiceId?.toLowerCase() === hostConfig.neuralVoice.toLowerCase() ||
        voice.name.toLowerCase() === hostConfig.neuralVoice.toLowerCase()
      );
    }
    return voice.id === (isHostA ? 'gemini-puck' : 'gemini-kore');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                isHostA ? 'bg-blue-600' : 'bg-amber-600'
              }`}
            >
              {isHostA ? 'A' : 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Selector Avanzado de Voces Premium
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isHostA
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isHostA ? 'Host A Principal' : 'Host B Cuestionador'} • {hostConfig.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Previsualiza registros vocales, timbres y acentos con calidad de estudio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, registro (barítono, bajo, soprano) o estilo..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by Gender */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedGender('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedGender === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedGender === 'male'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedGender === 'female'
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Femenino
              </button>
            </div>
          </div>

          {/* Accent and Register Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Acento:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'INTL', label: '🌐 Internacional / Neutro' },
              { id: 'ES', label: '🇪🇸 España' },
              { id: 'MX', label: '🇲🇽 México' },
              { id: 'AR', label: '🇦🇷 Argentina' },
              { id: 'CO', label: '🇨🇴 Colombia' },
            ].map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccent(acc.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedAccent === acc.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {acc.label}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5" /> Registro:
            </span>
            {['all', 'Barítono', 'Bajo', 'Tenor', 'Mezzosoprano', 'Soprano', 'Contralto'].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegister(reg)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedRegister === reg
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/60'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {reg === 'all' ? 'Todos' : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 divide-y divide-slate-800/40">
          {filteredVoices.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-400">
                No se encontraron voces con los filtros seleccionados.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedGender('all');
                  setSelectedAccent('all');
                  setSelectedRegister('all');
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {filteredVoices.map((voice) => {
                const isSelected = isCurrentVoice(voice);
                const isPlaying = playingVoiceId === voice.id;
                const isLoading = loadingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-3 ${
                      isSelected
                        ? isHostA
                          ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                          : 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base" title={voice.accent}>
                            {voice.flag}
                          </span>
                          <span className="text-[11px] font-bold text-slate-300">
                            {voice.accent}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              voice.gender === 'male'
                                ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            }`}
                          >
                            {voice.gender === 'male' ? 'Masculino' : 'Femenino'}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Asignada
                          </span>
                        )}
                      </div>

                      {/* Name & Vocal Register */}
                      <div className="mb-1.5">
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          {voice.name}
                          {voice.geminiVoiceId && (
                            <span className="text-[10px] text-amber-400 font-mono font-normal">
                              [{voice.geminiVoiceId}]
                            </span>
                          )}
                        </h4>
                        <span className="text-xs font-semibold text-amber-400">
                          {voice.vocalRegister}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {voice.description}
                      </p>

                      {/* Archetype Recommendation */}
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 mb-2">
                        <strong className="text-slate-200">Recomendado para: </strong>
                        {voice.bestArchetype}
                      </div>

                      {/* Sample quote */}
                      <p className="text-[10px] italic text-slate-500 border-l-2 border-slate-800 pl-2 py-0.5 line-clamp-2">
                        "{voice.sampleText}"
                      </p>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {/* Play Preview Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(voice)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isPlaying
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isLoading
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title="Escuchar muestra de audio"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            Generando...
                          </>
                        ) : isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            Detener
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                            Escuchar Muestra
                          </>
                        )}
                      </button>

                      {/* Select Voice Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVoice(voice, pitch, speed);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                            : isHostA
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        }`}
                      >
                        {isSelected ? 'Mantener Selección' : 'Seleccionar Voz'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Fine-Tuning Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 w-full sm:w-auto">
            {/* Pitch Adjuster */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Tono (Pitch):</span>
              <input
                type="range"
                min={0.8}
                max={1.25}
                step={0.05}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-24 accent-amber-500"
              />
              <span className="text-xs font-mono font-bold text-amber-400">{pitch.toFixed(2)}x</span>
            </div>

            {/* Speed Adjuster */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Velocidad:</span>
              <input
                type="range"
                min={0.85}
                max={1.25}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-24 accent-amber-500"
              />
              <span className="text-xs font-mono font-bold text-amber-400">{speed.toFixed(2)}x</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
