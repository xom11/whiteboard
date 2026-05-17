import type { ExcalidrawElement, SyncableAppState } from '../../types';
import { safeParseScene, validateStorageKey } from './validation';

const PREFIX = 'whiteboard:scene:';
const SCHEMA_VERSION = 1 as const;

export interface StoredScene {
  version: typeof SCHEMA_VERSION;
  elements: readonly ExcalidrawElement[];
  appState: Partial<SyncableAppState>;
  savedAt: number;
}

function fullKey(key: string): string {
  return PREFIX + key;
}

export function readScene(key: string): StoredScene | null {
  const validKey = validateStorageKey(key);
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(fullKey(validKey));
  if (!raw) return null;
  const parsed = safeParseScene(raw);
  if (!parsed) {
    console.warn('[whiteboard] scene parse/validation failed, clear:', validKey);
    try {
      window.localStorage.removeItem(fullKey(validKey));
    } catch { /* ignore */ }
    return null;
  }
  if (parsed.version !== SCHEMA_VERSION) {
    // Cố ý KHÔNG xoá entry — version mismatch có thể là dữ liệu của client
    // mới hơn (user vừa downgrade). Giữ lại để client tương ứng đọc được sau.
    console.warn(
      `[whiteboard] scene version ${parsed.version} không khớp ${SCHEMA_VERSION}, bỏ qua.`,
    );
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    elements: parsed.elements as readonly ExcalidrawElement[],
    appState: parsed.appState as Partial<SyncableAppState>,
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
  };
}

export function writeScene(
  key: string,
  payload: { elements: readonly ExcalidrawElement[]; appState: Partial<SyncableAppState> },
): void {
  const validKey = validateStorageKey(key);
  if (typeof window === 'undefined') return;
  const record: StoredScene = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(fullKey(validKey), JSON.stringify(record));
  } catch (err) {
    console.warn('[whiteboard] scene write failed:', err);
  }
}

export function clearScene(key: string): void {
  const validKey = validateStorageKey(key);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(fullKey(validKey));
  } catch { /* ignore */ }
}
