import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Check, Trash2, RefreshCw, Eye, EyeOff, AlertTriangle, ExternalLink } from 'lucide-react';
import { getStoredApiKey, saveStoredApiKey, removeStoredApiKey, validateApiKey } from '../services/apiKeyStorage';
import { ConnectionStatus } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  status,
  setStatus,
  statusMessage,
  setStatusMessage,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success?: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      setInputKey(stored);
      setValidationResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidateAndSave = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setValidationResult({ success: false, text: 'Por favor, escribe una clave de API válida.' });
      return;
    }

    setIsValidating(true);
    setStatus('testing');
    setStatusMessage('Comprobando validez de la clave...');

    const result = await validateApiKey(trimmed);
    setIsValidating(false);

    if (result.success) {
      saveStoredApiKey(trimmed);
      setStatus('connected');
      setStatusMessage(result.message);
      setValidationResult({ success: true, text: result.message });
    } else {
      setStatus('error');
      setStatusMessage(result.message);
      setValidationResult({ success: false, text: result.message });
    }
  };

  const handleClearKey = () => {
    removeStoredApiKey();
    setInputKey('');
    setStatus('disconnected');
    setStatusMessage('Clave de API eliminada de localStorage.');
    setValidationResult({ success: true, text: 'Clave eliminada correctamente del almacenamiento local.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurar Clave de API de Gemini</h2>
              <p className="text-xs text-slate-400">Almacenamiento 100% privado en tu navegador (localStorage)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-emerald-400">Privacidad absoluta garantizada:</strong> Tu clave nunca se almacena en servidores externos ni bases de datos. Permanece en tu propio navegador (`localStorage`), siendo totalmente compatible con entornos estáticos como <strong>GitHub Pages</strong>.
            </div>
          </div>

          {/* Input Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Google Gemini API Key</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                Obtener clave gratis <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono pr-12 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Status Box */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                validationResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {validationResult.success ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{validationResult.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              onClick={handleValidateAndSave}
              disabled={isValidating || !inputKey.trim()}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Validando conexión...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Validar y Guardar Clave
                </>
              )}
            </button>

            {inputKey && (
              <button
                onClick={handleClearKey}
                type="button"
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar Clave
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
