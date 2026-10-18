import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Search,
  User,
  Filter,
} from 'lucide-react';
import { HostConfig } from '../types';
import { AVATAR_PRESETS, AvatarPreset, getAvatarPresetById } from '../assets/avatarPresets';

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHost: 'Host_A' | 'Host_B';
  hostConfig: HostConfig;
  onSelectAvatar: (avatarUrl: string, presetId?: string, icon?: string) => void;
}

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  isOpen,
  onClose,
  targetHost,
  hostConfig,
  onSelectAvatar,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isHostA = targetHost === 'Host_A';
  const themeColor = isHostA ? 'blue' : 'amber';
  const activeColorHex = isHostA ? '#3b82f6' : '#f59e0b';

  // Filtrado de avatares predeterminados
  const filteredPresets = AVATAR_PRESETS.filter((preset) => {
    if (activeCategory !== 'all' && preset.category !== activeCategory) {
      return false;
    }
    if (genderFilter !== 'all' && preset.gender !== genderFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG o WebP).');
      return;
    }

    // Archivos de imagen hasta 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSelectAvatar(dataUrl, undefined, '🖼️');
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    try {
      new URL(customUrlInput);
      setUrlError(null);
      onSelectAvatar(customUrlInput.trim(), undefined, '🌐');
      setCustomUrlInput('');
      onClose();
    } catch {
      setUrlError('Introduce una URL válida que empiece por http:// o https://');
    }
  };

  const handleResetToDefault = () => {
    const defaultPreset = isHostA ? AVATAR_PRESETS[0] : AVATAR_PRESETS[1];
    onSelectAvatar(defaultPreset.svgDataUrl, defaultPreset.id, defaultPreset.icon);
    onClose();
  };

  const currentPreset = getAvatarPresetById(hostConfig.avatarPresetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border ${
                isHostA
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {isHostA ? 'A' : 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Selector de Avatar: {hostConfig.name} ({isHostA ? 'Host A' : 'Host B'})
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                    isHostA ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {hostConfig.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Elige un avatar de estudio predefinido o sube una imagen personalizada para el reproductor y vídeo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Current Avatar + Upload / URL controls */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Current Avatar preview */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-950 shrink-0 ${
                isHostA ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-amber-500 shadow-md shadow-amber-500/20'
              }`}
            >
              {hostConfig.avatarUrl ? (
                <img
                  src={hostConfig.avatarUrl}
                  alt={hostConfig.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">
                  {hostConfig.avatarIcon || (hostConfig.name[0] || 'H').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Avatar Actual:
              </span>
              <span className="text-xs font-bold text-white">
                {currentPreset ? currentPreset.name : hostConfig.avatarUrl ? 'Avatar personalizado' : 'Inicial básica'}
              </span>
            </div>
          </div>

          {/* Quick upload & reset actions */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Subir Imagen Local
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-800"
              title="Restablecer avatar inicial"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Por Defecto
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todos', icon: '✨' },
              { id: 'podcast', label: 'Podcast Pro', icon: '🎙️' },
              { id: 'scifi', label: 'Sci-Fi & Cyber', icon: '🤖' },
              { id: 'anime', label: 'Anime & Manga', icon: '🎌' },
              { id: 'academic', label: 'Académico', icon: '🎓' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeCategory === cat.id
                    ? isHostA
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por estilo o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Preset Cards Grid (Scrollable) */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 bg-slate-950/20">
          {filteredPresets.map((preset) => {
            const isSelected =
              hostConfig.avatarPresetId === preset.id ||
              hostConfig.avatarUrl === preset.svgDataUrl;

            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectAvatar(preset.svgDataUrl, preset.id, preset.icon);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                  isSelected
                    ? isHostA
                      ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/20'
                      : 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <span
                    className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                      isHostA ? 'bg-blue-500' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div className="flex items-center gap-3 mb-2.5">
                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-950 shrink-0 group-hover:scale-105 transition-transform ${
                      isSelected
                        ? isHostA
                          ? 'border-blue-400'
                          : 'border-amber-400'
                        : 'border-slate-800 group-hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={preset.svgDataUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{preset.icon}</span>
                      <h4 className="text-xs font-bold text-white truncate">
                        {preset.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5 capitalize">
                      {preset.category} • {preset.gender === 'male' ? 'Masculino' : preset.gender === 'female' ? 'Femenino' : 'Androide'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    SVG Alta Resolución
                  </span>
                  <button
                    type="button"
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                      isSelected
                        ? isHostA
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 group-hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isSelected ? 'Seleccionado' : 'Asignar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with External URL Option */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="url"
              placeholder="O pega una URL directa de imagen (https://...)"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors shrink-0"
            >
              Usar URL
            </button>
          </div>

          {urlError && (
            <p className="text-[11px] text-rose-400 font-medium w-full sm:w-auto">
              {urlError}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors ml-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
