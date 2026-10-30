/**
 * Autoguardado de la sesión en IndexedDB (solo en este navegador).
 *
 * Las voces y los fondos de Gemini se pagan por petición y hasta ahora vivían solo en memoria:
 * recargar o cerrar la pestaña obligaba a volver a pedirlos. Aquí se guarda el mismo .zip que
 * genera «Guardar proyecto», de modo que al volver se puede recuperar sin gastar de nuevo.
 */

const DB_NAME = 'notebooklm-studio';
const STORE = 'autosave';
const KEY = 'session';

export interface AutosaveMeta {
  savedAt: string;
  title: string;
  turns: number;
  voices: number;
  backgrounds: number;
}

interface AutosaveRecord {
  blob: Blob;
  meta: AutosaveMeta;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadAutosave(): Promise<AutosaveRecord | null> {
  try {
    const rec = await withStore<AutosaveRecord | undefined>('readonly', (s) => s.get(KEY));
    return rec?.blob ? rec : null;
  } catch {
    return null; // IndexedDB no disponible (modo privado, almacenamiento bloqueado…)
  }
}

export async function storeAutosave(blob: Blob, meta: AutosaveMeta): Promise<void> {
  await withStore('readwrite', (s) => s.put({ blob, meta } satisfies AutosaveRecord, KEY));
}

export async function clearAutosave(): Promise<void> {
  try {
    await withStore('readwrite', (s) => s.delete(KEY));
  } catch {
    // nada que borrar
  }
}

// Mientras se graba un vídeo el autoguardado espera: empaquetar decenas de MB en el hilo
// principal podría provocar saltos en la grabación en tiempo real.
let paused = false;

export function setAutosavePaused(value: boolean): void {
  paused = value;
}

export function isAutosavePaused(): boolean {
  return paused;
}
