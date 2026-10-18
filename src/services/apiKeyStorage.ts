import { ConnectionStatus } from '../types';

const STORAGE_KEY = 'notebooklm_gemini_api_key';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function saveStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function removeStoredApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function validateApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { success: false, message: 'La clave de API no puede estar vacía.' };
  }

  // Primero intentamos validar a través del endpoint local si el backend está activo
  try {
    const res = await fetch('/api/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: 'Conexión exitosa con Gemini 3.8/2.5.' };
      }
    }
  } catch {
    // Si falla o estamos en GitHub Pages (entorno estático), validamos directamente con el endpoint de Google
  }

  // Fallback estático directo para GitHub Pages
  try {
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${trimmed}`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'OK' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (directRes.ok) {
      return { success: true, message: '¡Clave de API válida y verificada con Gemini!' };
    }

    const errJson = await directRes.json().catch(() => null);
    const detail = errJson?.error?.message || `Código de estado ${directRes.status}`;
    return { success: false, message: `Clave rechazada por Google: ${detail}` };
  } catch (err: any) {
    return { success: false, message: `Error de red al conectar con Google: ${err?.message || err}` };
  }
}
