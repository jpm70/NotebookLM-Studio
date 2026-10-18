/**
 * Un único AudioContext para toda la app. Web Audio no permite conectar nodos de contextos
 * distintos, así que voces, música de fondo y efectos deben compartir este contexto para
 * poder mezclarse en la pista de audio del vídeo exportado.
 */
let sharedCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}
