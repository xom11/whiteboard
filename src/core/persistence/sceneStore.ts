import type { ExcalidrawElement, SyncableAppState } from '../../types';

const PREFIX = 'whiteboard:scene:';
const SCHEMA_VERSION = 1;

export interface StoredScene {
  version: number;
  elements: readonly ExcalidrawElement[];
  appState: Partial<SyncableAppState>;
  savedAt: number;
}

function fullKey(key: string): string {
  return PREFIX + key;
}

export function readScene(key: string): StoredScene | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(fullKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredScene>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SCHEMA_VERSION) {
      console.warn(
        `[whiteboard] scene version ${parsed.version} không khớp ${SCHEMA_VERSION}, bỏ qua.`,
      );
      return null;
    }
    if (!Array.isArray(parsed.elements)) return null;
    return {
      version: SCHEMA_VERSION,
      elements: parsed.elements,
      appState: (parsed.appState ?? {}) as Partial<SyncableAppState>,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch (err) {
    console.warn('[whiteboard] scene parse error, clear:', err);
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch { /* ignore */ }
    return null;
  }
}

export function writeScene(
  key: string,
  payload: { elements: readonly ExcalidrawElement[]; appState: Partial<SyncableAppState> },
): void {
  if (typeof window === 'undefined') return;
  const record: StoredScene = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(record));
  } catch (err) {
    console.warn('[whiteboard] scene write failed:', err);
  }
}

export function clearScene(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(fullKey(key));
  } catch { /* ignore */ }
}
