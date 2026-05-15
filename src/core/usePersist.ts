import { useEffect, useMemo, useRef } from 'react';
import type { BinaryFiles, ExcalidrawElement, SyncableAppState } from '../types';

export interface PersistedSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: Partial<SyncableAppState>;
  files?: BinaryFiles;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

function readPersisted(key: string | undefined): PersistedSnapshot | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSnapshot>;
    if (!Array.isArray(parsed.elements)) return null;
    return {
      elements: parsed.elements,
      appState: (parsed.appState ?? {}) as Partial<SyncableAppState>,
      files: parsed.files,
    };
  } catch {
    return null;
  }
}

export function writePersisted(key: string, snap: PersistedSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snap));
  } catch {
    /* quota or serialize error — ignore */
  }
}

export interface UsePersistResult {
  /** Snapshot đọc 1 lần từ sessionStorage ở mount đầu tiên (hoặc null). */
  persistedInitial: PersistedSnapshot | null;
}

/**
 * Hook đóng gói cơ chế persist scene vào sessionStorage:
 *   - Đọc snapshot 1 lần ở mount (lazy memo theo `key`).
 *   - Khôi phục raster files đã lưu vào Excalidraw API ngay khi API sẵn sàng.
 *
 * Phần ghi (writePersisted) là pure function export riêng để caller gọi
 * trong throttle handler — không cần state ở đây.
 *
 * @param key  sessionStorage key. `undefined` → disable hoàn toàn.
 * @param api  Excalidraw imperative API (có thể null khi chưa mount xong).
 * @param markFileKnown  callback report các fileId vừa restore để caller
 *                       không bắn `onFilesChange` lặp lại cho chúng.
 */
export function usePersist(
  key: string | undefined,
  api: ExApi | null,
  markFileKnown: (fileId: string) => void,
): UsePersistResult {
  // Đọc 1 lần duy nhất ở render đầu (lazy memo) — Excalidraw's `initialData` chỉ
  // được tiêu thụ ở mount đầu tiên, đọc trong useEffect sẽ trễ hơn 1 frame và
  // không có hiệu lực. `key` đổi giữa runtime sẽ KHÔNG re-mount Excalidraw
  // (chấp nhận trade-off; consumer không nên đổi key động).
  const persistedInitial = useMemo(() => readPersisted(key), [key]);
  const markFileKnownRef = useRef(markFileKnown);
  markFileKnownRef.current = markFileKnown;

  // Restore raster files (paste-image) đã lưu trong sessionStorage. Math-stamp
  // files được regenerate từ customData ở effect khác trong main view — đoạn
  // này chỉ phục vụ user-pasted raster.
  useEffect(() => {
    if (!api) return;
    if (!persistedInitial?.files) return;
    const entries = Object.entries(persistedInitial.files);
    if (entries.length === 0) return;
    try {
      api.addFiles(
        entries.map(([id, f]) => ({
          id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataURL: (f as any).dataURL,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mimeType: (f as any).mimeType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          created: (f as any).created ?? Date.now(),
        })),
      );
      entries.forEach(([id]) => markFileKnownRef.current(id));
    } catch (err) {
      console.warn('Restore persisted files failed:', err);
    }
  }, [api, persistedInitial]);

  return { persistedInitial };
}
