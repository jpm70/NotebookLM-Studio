import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, BookOpen, FileCheck, Loader2, Terminal } from 'lucide-react';
import JSZip from 'jszip';
import { analyzeImageWithGemini } from '../services/geminiService';
import {
  isHtmlArticle,
  parseTechnicalArticleHtml,
  SAMPLE_KISMET_ARTICLE_HTML,
} from '../services/articleParser';
import { SAMPLE_TOPICS_CATALOG, SampleTopicItem } from '../data/sampleTopicsData';

interface SourceInputSectionProps {
  sourceText: string;
  setSourceText: (text: string) => void;
  onGenerate: () => void;
  onDirectArticleBuild?: () => void;
  onSelectSampleTopic?: (topic: SampleTopicItem) => void;
  isGenerating: boolean;
}

export const SourceInputSection: React.FC<SourceInputSectionProps> = ({
  sourceText,
  setSourceText,
  onGenerate,
  onDirectArticleBuild,
  onSelectSampleTopic,
  isGenerating,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraer texto de un archivo DOCX (.docx) usando JSZip y DOMParser
  const extractTextFromDocx = async (file: File): Promise<string> => {
    const zip = await JSZip.loadAsync(file);
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('No se encontró el contenido principal del documento Word (.docx).');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const textLines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const textNodes = paragraphs[i].getElementsByTagName('w:t');
      let pText = '';
      for (let j = 0; j < textNodes.length; j++) {
        pText += textNodes[j].textContent || '';
      }
      if (pText.trim()) {
        textLines.push(pText.trim());
      }
    }

    return textLines.join('\n\n');
  };

  // Extraer texto limpio de un archivo HTML (.html / .htm)
  // Extraer texto o HTML estructurado de un archivo HTML (.html / .htm)
  const extractTextFromHtml = async (file: File): Promise<string> => {
    const rawHtml = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remover elementos superfluos
    const junkElements = doc.querySelectorAll('script, style, noscript, svg, nav, footer, header, aside, iframe');
    junkElements.forEach((el) => el.remove());

    const hasTables = doc.querySelectorAll('table').length > 0;
    const hasPres = doc.querySelectorAll('pre').length > 0;
    const hasHeadings = doc.querySelectorAll('h1, h2, h3').length > 0;

    // Si tiene tablas, pantallas de terminal <pre> o es un artículo HTML estructurado, conservamos el HTML para el analizador
    if (hasTables || hasPres || hasHeadings || isHtmlArticle(rawHtml)) {
      return doc.body?.innerHTML || rawHtml;
    }

    const title = doc.querySelector('title')?.textContent?.trim() || file.name;
    const bodyText = doc.body?.textContent || '';
    const cleanLines = bodyText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return `=== Título HTML: ${title} ===\n\n${cleanLines.join('\n\n')}`;
  };

  // Analizar y extraer datos de imagen con Gemini Multimodal
  const analyzeImageFile = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return analyzeImageWithGemini(dataUrl, file.type || 'image/jpeg');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    let combinedText = sourceText ? sourceText + '\n\n' : '';
    const newFilesList: { name: string; size: number; type: string }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();

        // Identificar tipo de archivo
        if (lowerName.endsWith('.docx')) {
          setProcessingStatus(`Extrayendo texto de Microsoft Word (${file.name})...`);
          try {
            const docxText = await extractTextFromDocx(file);
            combinedText += `\n--- Documento Word (.docx): ${file.name} ---\n${docxText}\n`;
            newFilesList.push({ name: file.name, size: file.size, type: 'DOCX' });
          } catch (err: any) {
            console.error('Error procesando docx:', err);
            combinedText += `\n--- Documento Word (.docx): ${file.name} (Error al decodificar: ${err.message}) ---\n`;
          }
        } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          setProcessingStatus(`Procesando artículo técnico HTML (${file.name})...`);
          try {
            const htmlText = await extractTextFromHtml(file);
            // Si el texto previo era el texto por defecto o estaba vacío, reemplazarlo directamente
            if (!sourceText || sourceText.includes('La inteligencia artificial en 2026')) {
              combinedText = htmlText;
            } else {
              combinedText += `\n${htmlText}\n`;
            }
            newFilesList.push({ name: file.name, size: file.size, type: 'HTML' });
          } catch (err: any) {
            console.error('Error procesando html:', err);
            combinedText += `\n--- Archivo HTML: ${file.name} (Error: ${err.message}) ---\n`;
          }
        } else if (
          lowerName.endsWith('.png') ||
          lowerName.endsWith('.jpg') ||
          lowerName.endsWith('.jpeg') ||
          lowerName.endsWith('.webp')
        ) {
          setProcessingStatus(`Analizando contenido visual con Gemini Multimodal (${file.name})...`);
          try {
            const analysis = await analyzeImageFile(file);
            combinedText += `\n--- Análisis Visual de Imagen (${file.name}) ---\n${analysis}\n`;
            newFilesList.push({ name: file.name, size: file.size, type: 'IMAGE' });
          } catch (err: any) {
            console.error('Error analizando imagen:', err);
            combinedText += `\n--- Imagen (${file.name}): No se pudo analizar (${err.message}) ---\n`;
          }
        } else {
          // Archivos de texto plano (.txt, .md, .text)
          setProcessingStatus(`Leyendo archivo de texto (${file.name})...`);
          const text = await file.text();
          combinedText += `\n--- Archivo: ${file.name} ---\n${text}\n`;
          newFilesList.push({ name: file.name, size: file.size, type: 'TXT' });
        }
      }

      setUploadedFiles((prev) => [...prev, ...newFilesList]);
      setSourceText(combinedText.trim());
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const charCount = sourceText.length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Templates */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Temas de prueba rápidos (NotebookLM Style)</span>
          </div>
          <span className="text-xs text-slate-400">Haz clic para cargar un ejemplo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_TOPICS_CATALOG.map((topic, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (onSelectSampleTopic) {
                  onSelectSampleTopic(topic);
                } else {
                  setSourceText(topic.text);
                }
              }}
              className="p-3 text-left rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all group active:scale-98 relative overflow-hidden"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors flex items-center justify-between gap-1">
                <span className="truncate">{topic.title}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono shrink-0">
                  Cargar
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{topic.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone & Text Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[220px] relative ${
            dragActive
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.htm,.txt,.md,.text,.docx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {isProcessingFile ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-white">{processingStatus || 'Procesando archivo...'}</p>
              <p className="text-[11px] text-slate-400">Extrayendo texto y elementos clave</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-bold text-white mb-1">Arrastra documentos aquí o haz clic para explorar</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-3">
                Sube el <strong>.html del artículo</strong> (también admite DOCX, Markdown, TXT e <strong>imágenes</strong>, que Gemini analiza).
              </p>

              {/* Supported formats pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800/60 text-blue-300 text-[10px] font-bold">
                  DOCX (Word)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold">
                  HTML / Páginas
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 text-[10px] font-bold">
                  Imágenes / Infografía
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium">
                  TXT / MD
                </span>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {uploadedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 shadow-sm"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-amber-400 text-[10px] uppercase">[{f.type}]</strong>
                      <span className="max-w-[120px] truncate">{f.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Text Area Input */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Contexto del Prompt para Gemini
            </span>
            <span>
              {wordCount.toLocaleString()} palabras • {charCount.toLocaleString()} caracteres
            </span>
          </div>

          {/* Banner de Detección de Artículo Técnico con Tablas y Terminales */}
          {(() => {
            if (!isHtmlArticle(sourceText)) return null;
            const parsed = parseTechnicalArticleHtml(sourceText);
            const totalTables = parsed.sections.reduce((acc, s) => acc + s.tables.length, 0);
            const totalTerminals = parsed.sections.reduce((acc, s) => acc + s.terminals.length, 0);

            return (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-emerald-950/40 border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Artículo Técnico Detectado: <span className="text-white font-black">{parsed.title}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {parsed.totalExpectedSlides} Diapositivas 1:1
                    </span>
                    {onDirectArticleBuild && (
                      <button
                        type="button"
                        onClick={onDirectArticleBuild}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                        title="Genera exactamente tantas diapositivas como puntos del artículo, con cada tabla y terminal independiente y fondos anime con texto relevante"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>Generar Diapositivas 1:1 Directas</span>
                      </button>
                    )}
                  </div>
                </div>
                {parsed.subtitle && (
                  <p className="text-[11px] text-slate-300 italic">
                    "{parsed.subtitle}" • <span className="text-blue-400 font-semibold">{parsed.category}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 flex items-center gap-1">
                      📑 <strong>{parsed.sections.length}</strong> Puntos
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800 text-blue-300 flex items-center gap-1">
                      📊 <strong>{totalTables}</strong> Tablas independientes
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                      💻 <strong>{totalTerminals}</strong> Terminales independientes
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-950 border border-purple-800 text-purple-300 flex items-center gap-1">
                      🎌 Contexto Anime + Texto
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-800 text-amber-300 flex items-center gap-1">
                      ✨ Post-Intro Animada
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Pega aquí el HTML del artículo o cualquier texto (los archivos que subas se añaden aquí automáticamente)..."
            className="w-full flex-1 min-h-[220px] bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none shadow-inner"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setSourceText('');
                setUploadedFiles([]);
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Limpiar todo el contexto
            </button>

            <button
              type="button"
              disabled={isGenerating || !sourceText.trim()}
              onClick={onGenerate}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              {isGenerating ? 'Generando Guion con Gemini...' : 'Generar Guion Estructurado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
