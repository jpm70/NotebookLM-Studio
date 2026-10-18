import { DialogueTurn, HostConfig } from '../types';

export interface SubtitleEntry {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  speaker: 'Host_A' | 'Host_B';
  speakerName: string;
  emotion: string;
  text: string;
  formattedTimeRange: string;
}

export interface SubtitleStyleConfig {
  fontSize: number; // in px
  backgroundColor: string; // rgba
  textColor: string;
  highlightHostColor: boolean;
  positionYPercent: number; // e.g. 85% (bottom third)
  showSpeakerBadge: boolean;
}

/**
 * Convierte segundos a formato estándar SRT (HH:MM:SS,mmm)
 */
export function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Convierte segundos a formato estándar WebVTT (HH:MM:SS.mmm)
 */
export function formatVttTimestamp(seconds: number): string {
  return formatSrtTimestamp(seconds).replace(',', '.');
}

/**
 * Estima la duración de un texto en segundos basándose en cadencia natural de habla (~135-150 ppm)
 */
export function estimateDialogueDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  // ~140 palabras por minuto = ~2.33 palabras por segundo
  const duration = (wordCount / 2.33) + 0.6; // 0.6s de margen para inflexión
  return Math.max(1.8, Math.round(duration * 10) / 10);
}

/**
 * Genera la lista de entradas de subtítulos con timestamps exactos
 */
export function generateSubtitlesFromScript(
  turns: DialogueTurn[],
  hostA: HostConfig,
  hostB: HostConfig,
  introOffsetSec: number = 0,
  pauseBetweenSpeakersSec: number = 0.3,
  turnDurations?: number[]
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = introOffsetSec;

  turns.forEach((turn, idx) => {
    const isHostA = turn.speaker === 'Host_A';
    const speakerName = isHostA ? hostA.name : hostB.name;
    const duration = turnDurations && turnDurations[idx] ? turnDurations[idx] : estimateDialogueDuration(turn.text);

    const startTime = currentTime;
    const endTime = startTime + duration;

    entries.push({
      index: idx + 1,
      startTimeSec: startTime,
      endTimeSec: endTime,
      speaker: turn.speaker,
      speakerName,
      emotion: turn.emotion,
      text: turn.text,
      formattedTimeRange: `${formatSrtTimestamp(startTime)} --> ${formatSrtTimestamp(endTime)}`,
    });

    currentTime = endTime + pauseBetweenSpeakersSec;
  });

  return entries;
}

/**
 * Genera el archivo .SRT completo en formato estándar
 */
export function buildSrtContent(entries: SubtitleEntry[], includeSpeakerName: boolean = true): string {
  let srt = '';
  entries.forEach((entry) => {
    srt += `${entry.index}\n`;
    srt += `${entry.formattedTimeRange}\n`;
    const label = includeSpeakerName ? `[${entry.speakerName}]: ` : '';
    srt += `${label}${entry.text}\n\n`;
  });
  return srt.trim() + '\n';
}

/**
 * Genera el archivo .VTT completo
 */
export function buildVttContent(entries: SubtitleEntry[]): string {
  let vtt = 'WEBVTT\n\n';
  entries.forEach((entry) => {
    vtt += `${entry.index}\n`;
    vtt += `${formatVttTimestamp(entry.startTimeSec)} --> ${formatVttTimestamp(entry.endTimeSec)}\n`;
    vtt += `<v ${entry.speakerName}>${entry.text}\n\n`;
  });
  return vtt.trim() + '\n';
}

/**
 * Descarga directamente el archivo .srt en el navegador
 */
export function triggerSrtDownload(entries: SubtitleEntry[], episodeTitle: string = 'podcast_subtitles'): void {
  const content = buildSrtContent(entries);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = episodeTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 40);
  a.download = `${safeName}.srt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Encuentra el subtítulo activo para un tiempo t determinado
 */
export function findActiveSubtitle(entries: SubtitleEntry[], currentTimeSec: number): SubtitleEntry | null {
  for (const entry of entries) {
    if (currentTimeSec >= entry.startTimeSec && currentTimeSec <= entry.endTimeSec) {
      return entry;
    }
  }
  return null;
}
