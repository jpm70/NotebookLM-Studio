import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderDown,
  Terminal,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  Music,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Code2,
  Eye,
  ExternalLink,
} from 'lucide-react';
import {
  PYTHON_FILES,
  downloadAllPythonFilesAsZip,
  generateValidatedPythonPackageZip,
  PythonFileItem,
  ValidationLogItem,
  ValidationStats,
} from '../services/pythonProjectFiles';
import { PodcastScript, HostConfig, StudioSettings } from '../types';

interface PythonPackageViewerProps {
  script?: PodcastScript | null;
  hostA?: HostConfig;
  hostB?: HostConfig;
  settings?: StudioSettings;
}

export const PythonPackageViewer: React.FC<PythonPackageViewerProps> = ({
  script,
  hostA,
  hostB,
  settings,
}) => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeView, setActiveView] = useState<'validation' | 'code'>('validation');

  // Estados de Auditoría y Validación de Assets
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationStage, setValidationStage] = useState('');
  const [validationLogs, setValidationLogs] = useState<ValidationLogItem[]>([]);
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCodeZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await downloadAllPythonFilesAsZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notebooklm_youtube_studio_code.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generando zip de código:', e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleRunValidationAndExport = async () => {
    try {
      setIsValidating(true);
      setValidationLogs([]);
      setValidationStats(null);
      setDownloadReadyUrl(null);
      setValidationProgress(5);
      setValidationStage('Iniciando auditoría de assets...');

      const result = await generateValidatedPythonPackageZip({
        script,
        hostA,
        hostB,
        settings,
        onLog: (item) => {
          setValidationLogs((prev) => [...prev, item]);
        },
        onProgress: (pct, stage) => {
          setValidationProgress(pct);
          setValidationStage(stage);
        },
      });

      setValidationStats(result.stats);

      // Crear URL para descarga inmediata
      const url = URL.createObjectURL(result.blob);
      setDownloadReadyUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'notebooklm_studio_bundle.zip';
      a.click();
    } catch (err: any) {
      console.error('Error durante la validación del paquete:', err);
      setValidationLogs((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'package',
          status: 'WARN',
          message: `Error al generar paquete: ${err?.message || 'Fallo desconocido'}`,
        },
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  const turnsCount = script?.turns?.length || 0;
  const hasAnimeBackgrounds = Object.keys(settings?.branding?.turnBackgroundImages || {}).length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner with Download All CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Autónomo (Offline Ready)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Con Log de Auditoría
            </span>
            <span className="text-xs text-slate-400 font-mono">Python 3.10+ • MoviePy • Streamlit • Edge-TTS</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            Paquete Autónomo de Python para Ejecución Local
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
            Descarga el proyecto completo en <strong>.ZIP</strong> incluyendo el código modular, todos los assets de tu sesión actual (<strong>imágenes de fondo anime</strong>, <strong>pistas de audio sintetizadas</strong>, <strong>script final en JSON</strong> y <strong>subtítulos .SRT</strong>), o inspecciona los módulos independientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={handleRunValidationAndExport}
            disabled={isValidating}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validando ({validationProgress}%)...
              </>
            ) : (
              <>
                <FolderDown className="w-4 h-4" />
                Descargar Paquete con Assets (.ZIP)
              </>
            )}
          </button>

          <button
            onClick={handleDownloadCodeZip}
            disabled={isZipping || isValidating}
            className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
            title="Descargar únicamente archivos de código Python sin assets del episodio"
          >
            <Code2 className="w-4 h-4 text-cyan-400" />
            {isZipping ? 'Comprimiendo...' : 'Solo Código (.ZIP)'}
          </button>
        </div>
      </div>

      {/* Tab Switcher: Auditoría vs Código */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveView('validation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeView === 'validation'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>1. Consola de Auditoría y Validación de Assets</span>
          {validationLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
              {validationLogs.length} logs
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('code')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeView === 'code'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>2. Explorador de Código Python ({PYTHON_FILES.length} módulos)</span>
        </button>
      </div>

      {/* VISTA 1: AUDITORÍA Y ASSETS */}
      {activeView === 'validation' && (
        <div className="space-y-6">
          {/* Tarjetas de Verificación Rápida de Assets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Guion Final
                </span>
                <span className="font-mono text-[10px] text-emerald-400">script.json</span>
              </div>
              <div className="text-base font-black text-white">
                {turnsCount > 0 ? `${turnsCount} turnos` : '2 turnos (Base)'}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {script?.episode_title || 'NotebookLM Studio Episode'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Music className="w-3.5 h-3.5 text-cyan-400" /> Pistas de Audio
                </span>
                <span className="font-mono text-[10px] text-cyan-400">assets/audio/</span>
              </div>
              <div className="text-base font-black text-white">
                {turnsCount > 0 ? `${turnsCount} archivos WAV` : 'Audio sintético'}
              </div>
              <p className="text-[10px] text-slate-400">
                {hostA?.neuralVoice || 'Puck'} + {hostB?.neuralVoice || 'Kore'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> Fondos Ilustrados
                </span>
                <span className="font-mono text-[10px] text-rose-400">assets/backgrounds/</span>
              </div>
              <div className="text-base font-black text-white">
                {hasAnimeBackgrounds > 0 ? `${hasAnimeBackgrounds} personalizados` : `${turnsCount || 2} fondos anime`}
              </div>
              <p className="text-[10px] text-slate-400">
                Estilo {settings?.branding?.visualStyle || 'anime'} consistente
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Subtítulos y Logo
                </span>
                <span className="font-mono text-[10px] text-emerald-400">subtitles.srt</span>
              </div>
              <div className="text-base font-black text-white">Sincronizado</div>
              <p className="text-[10px] text-slate-400">Watermark icono.png sin distorsión</p>
            </div>
          </div>

          {/* Consola de Log de Validación */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header de la Consola */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-white">
                  LOG DE VALIDACIÓN Y EMPAQUETADO DE ASSETS
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  • Verificación exhaustiva antes de descarga
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunValidationAndExport}
                  disabled={isValidating}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                  {isValidating ? 'Auditando...' : 'Re-ejecutar Validación'}
                </button>
                {downloadReadyUrl && (
                  <a
                    href={downloadReadyUrl}
                    download="notebooklm_studio_bundle.zip"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar ZIP Listo
                  </a>
                )}
              </div>
            </div>

            {/* Barra de Progreso durante Auditoría */}
            {isValidating && (
              <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {validationStage || 'Auditando assets del paquete...'}
                  </span>
                  <span className="text-white font-black">{validationProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    style={{ width: `${validationProgress}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-400 transition-all duration-150"
                  />
                </div>
              </div>
            )}

            {/* Estadísticas de Auditoría cuando finaliza */}
            {validationStats && (
              <div className="p-4 bg-emerald-950/20 border-b border-emerald-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Paquete Validado al 100% con Todos los Assets Integrados</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-300">
                  <span>Archivos: <strong className="text-white">{validationStats.totalFiles}</strong></span>
                  <span>Tamaño ZIP: <strong className="text-amber-400">{validationStats.totalSizeFormatted}</strong></span>
                  <span>Audios WAV: <strong className="text-cyan-400">{validationStats.audioFilesCount}</strong></span>
                  <span>Fondos: <strong className="text-rose-400">{validationStats.backgroundImagesCount}</strong></span>
                  <span>Subtítulos: <strong className="text-emerald-400">SRT OK</strong></span>
                </div>
              </div>
            )}

            {/* Cuerpo de la Consola con Logs */}
            <div className="p-4 max-h-[460px] overflow-y-auto font-mono text-xs space-y-2 bg-slate-950/95 select-text">
              {validationLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs">
                    Haz clic en <strong>"Descargar Paquete con Assets (.ZIP)"</strong> o en <strong>"Re-ejecutar Validación"</strong> para auditar y empaquetar en tiempo real:
                  </p>
                  <div className="inline-flex flex-wrap justify-center gap-2 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ script.json</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ assets/audio/*.wav</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ assets/backgrounds/*.svg</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ subtitles.srt</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ config.json</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">✓ icono.png</span>
                  </div>
                </div>
              ) : (
                validationLogs.map((log) => {
                  const isPass = log.status === 'PASS';
                  const isWarn = log.status === 'WARN';
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-900/60 transition-colors"
                    >
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        [{log.timestamp}]
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${
                          isPass
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400 uppercase shrink-0">
                        {log.category}
                      </span>
                      <div className="flex-1">
                        <span className={`text-xs ${isPass ? 'text-slate-200' : isWarn ? 'text-amber-200' : 'text-slate-300'}`}>
                          {log.message}
                        </span>
                        {log.details && (
                          <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
                            ↳ {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Terminal Command Footer */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Ejecutar localmente:</span>
                <code className="text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  unzip notebooklm_studio_bundle.zip &amp;&amp; cd notebooklm_youtube_studio &amp;&amp; streamlit run app.py
                </code>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Autodetecta automáticamente script.json y assets
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: EXPLORADOR DE CÓDIGO PYTHON */}
      {activeView === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File List Sidebar */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-3">
              Módulos del Proyecto
            </h4>

            {PYTHON_FILES.map((file) => (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                  selectedFile.filename === file.filename
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono flex items-center gap-2">
                    <FileCode
                      className={`w-3.5 h-3.5 ${
                        selectedFile.filename === file.filename ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    {file.filename}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    {file.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{file.description}</p>
              </button>
            ))}

            {/* Quick Terminal Command */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-amber-400" /> Comando de inicio rápido:
              </div>
              <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px] overflow-x-auto">
                pip install -r requirements.txt{'\n'}streamlit run app.py
              </pre>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-3 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono text-white">{selectedFile.filename}</span>
                <span className="text-xs text-slate-400">• {selectedFile.description}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={handleDownloadSingle}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar {selectedFile.filename}
                </button>
              </div>
            </div>

            {/* Code Text Body */}
            <div className="p-4 overflow-x-auto max-h-[640px] font-mono text-xs text-slate-200 leading-relaxed bg-slate-950/90 select-text">
              <pre className="whitespace-pre">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
