import React from 'react';
import { Sparkles, Key, Radio, Code2, ShieldCheck, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { ConnectionStatus } from '../types';

import { DEFAULT_LOGO_BASE64 } from '../assets/logoData';

interface HeaderProps {
  status: ConnectionStatus;
  statusMessage: string;
  onOpenKeyModal: () => void;
  activeTab: 'studio' | 'python';
  setActiveTab: (tab: 'studio' | 'python') => void;
  logoUrl: string;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  statusMessage,
  onOpenKeyModal,
  activeTab,
  setActiveTab,
  logoUrl,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand with User Logo without distortion and Link */}
        <div className="flex items-center gap-3.5">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visitar Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)"
            className="group relative block shrink-0"
          >
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-slate-950/90 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg shadow-black/40 group-hover:border-amber-500 group-hover:shadow-amber-500/20 transition-all overflow-hidden">
              <img
                src={logoUrl || DEFAULT_LOGO_BASE64}
                alt="Logo Un Fantasma en el Sistema"
                className="w-full h-full object-contain aspect-square transform group-hover:scale-105 transition-transform"
                style={{ imageRendering: 'auto' }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </a>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                NotebookLM Studio
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  YouTube Video Generator
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Por</span>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors hover:underline"
              >
                unfantasmaenelsistema.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tab Selector */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'studio'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Estudio Interactivo
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'python'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Código Python / Streamlit
            </button>
          </div>

          {/* Connection status indicator */}
          <div
            onClick={onOpenKeyModal}
            className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-slate-950 border-slate-800 hover:border-slate-700"
            title={statusMessage || 'Estado de conexión con Gemini'}
          >
            {status === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              </>
            )}
            {status === 'testing' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300 font-semibold">Validando...</span>
              </>
            )}
            {status === 'disconnected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-400">Modo Auto / Sin Clave</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Error Clave
                </span>
              </>
            )}
          </div>

          {/* API Key Modal Button */}
          <button
            onClick={onOpenKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Configurar API Key
          </button>
        </div>
      </div>
    </header>
  );
};
