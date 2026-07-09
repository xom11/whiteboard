'use client';
import { useEffect, useMemo, useRef } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from '../types';
import { pickSyncableAppState } from '../serialize';
import { isStampElement, type StampType } from '../stamps/shared/registry';
import { restoreMissingStampFiles } from '../stamps/shared/restoreStampFiles';
import { readScene, writeScene } from '../core/persistence/sceneStore';
import { readFiles, writeFiles, pruneFiles } from '../core/persistence/fileStore';

const SYNC_THROTTLE_MS = 200;
const FILE_THROTTLE_MS = 1000;
const PRUNE_THROTTLE_MS = 2000;
const RESTORE_PASS_DELAY_MS = 400;

export interface UseScenePersistOptions {
  storageKey: string | null;
  initialScene?: ExcalidrawSceneSnapshot | null;
  initialFiles?: BinaryFiles;
  readOnly: boolean;
  onSceneChange?: (snapshot: ExcalidrawSceneSnapshot) => void;
  onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;
   
  api: any;
   
  apiRef: React.MutableRefObject<any>;
  stamps: ReadonlyArray<StampType>;
}

export interface UseScenePersistResult {
  effectiveInitialScene: ExcalidrawSceneSnapshot | null;
   
  onSceneTick: (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => void;
}

// Bundle toàn bộ persist orchestration cho Whiteboard:
// - effectiveInitialScene: precedence initialScene > localStorage > blank.
// - onSceneTick: gọi từ Excalidraw onChange (sau theme-sync + crop intercept).
//   Track new fileIds, throttle scene/file/prune writes.
// - Mount: load initialFiles (server) + IDB raster + restoreMissingStampFiles.
// - Unmount: flush mọi pending write trước teardown.
export function useScenePersist(opts: UseScenePersistOptions): UseScenePersistResult {
  const {
    storageKey,
    initialScene,
    initialFiles,
    readOnly,
    onSceneChange,
    onFilesChange,
    api,
    apiRef,
    stamps,
  } = opts;

  const persistEnabled = typeof storageKey === 'string' && storageKey.length > 0;

  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastSceneHashRef = useRef<string>('');
  const sceneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pruneThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSceneRef = useRef<{
    elements: readonly ExcalidrawElement[];
     
    appState: any;
  } | null>(null);
  const pendingFilesRef = useRef<BinaryFiles>({});
  // Cached hashElementsVersion để flushScene chạy sync trong unmount cleanup
  // (cleanup không thể await dynamic import).
   
  const hashElementsVersionRef = useRef<((elements: readonly ExcalidrawElement[]) => any) | null>(null);

  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;
  const persistEnabledRef = useRef(persistEnabled);
  persistEnabledRef.current = persistEnabled;

  const persistedInitial = useMemo(
    () => (persistEnabled ? readScene(storageKey as string) : null),
    [persistEnabled, storageKey],
  );
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null =
    initialScene !== undefined
      ? initialScene
      : persistedInitial
        ? {
            elements: persistedInitial.elements,
            appState: persistedInitial.appState as SyncableAppState,
          }
        : null;

  const flushSceneRef = useRef<() => void>(() => undefined);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[];
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      // Chưa load module → bỏ qua hash dedupe, ghi luôn (correctness > perf khi unmount).
      const elementHash = hashFn ? hashFn(liveElements) : liveElements.map((e) => e.id).join('|');
      const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
      if (sceneHash === lastSceneHashRef.current) return;
      lastSceneHashRef.current = sceneHash;
      onSceneChangeRef.current?.({ elements: liveElements, appState: liveAppState });
      if (persistEnabledRef.current) {
        writeScene(persistKeyRef.current as string, {
          elements: liveElements,
          appState: liveAppState,
        });
      }
    } catch (err) {
      console.warn('[whiteboard] flushScene thất bại:', err);
    }
  };

  // Nguồn element tin cậy cho flushFiles/flushPrune.
  //
  // KHÔNG lấy `api.getSceneElements()` làm nguồn chính: Excalidraw là class
  // component, `componentWillUnmount` gọi `scene.destroy()` (elements = []) và
  // chạy TRƯỚC cleanup useEffect của Whiteboard. Lúc unmount, api báo scene rỗng
  // → prune tưởng board trắng và xoá sạch raster của storageKey (PDF mất hình sau
  // khi GV chuyển chế độ rồi quay lại bảng). `?? ` cũng không cứu được vì `[]`
  // không phải nullish.
  //
  // `latestSceneRef` giữ payload onChange cuối cùng — luôn hợp lệ trong cleanup.
  // Excalidraw truyền CẢ element đã xoá vào onChange nên phải lọc `isDeleted`
  // (prune vẫn phải thu hồi file của trang PDF vừa bị xoá).
  const liveElements = (): readonly ExcalidrawElement[] => {
    const latest = latestSceneRef.current?.elements;
    if (latest) return latest.filter((e) => !e.isDeleted);
    return (apiRef.current?.getSceneElements?.() ?? []) as readonly ExcalidrawElement[];
  };

  const flushFilesRef = useRef<() => void>(() => undefined);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = liveElements();
      const stampIds = new Set<string>();
      for (const el of currentElements) {
         
        const fid = (el as any).fileId as string | undefined;
        if (fid && isStampElement(el)) stampIds.add(fid);
      }
      const raster: BinaryFiles = {};
      for (const [id, f] of Object.entries(pending)) {
        if (!stampIds.has(id)) raster[id] = f;
      }
      if (Object.keys(raster).length > 0) {
        void writeFiles(persistKeyRef.current as string, raster);
      }
    } catch (err) {
      console.warn('[whiteboard] flushFiles thất bại:', err);
    }
  };

  const flushPruneRef = useRef<() => void>(() => undefined);
  flushPruneRef.current = () => {
    try {
      // Prune = xoá mọi file KHÔNG nằm trong keep. Chưa từng có onChange nào →
      // không đủ thông tin để biết board đang có gì → hoãn GC sang phiên sau,
      // KHÔNG đoán bằng api (xem ghi chú ở liveElements).
      if (!latestSceneRef.current) return;
      const currentElements = liveElements();
      const keep = new Set<string>();
      for (const el of currentElements) {
         
        const fid = (el as any).fileId as string | undefined;
        if (fid && !isStampElement(el)) keep.add(fid);
      }
      void pruneFiles(persistKeyRef.current as string, keep);
    } catch (err) {
      console.warn('[whiteboard] flushPrune thất bại:', err);
    }
  };

  const onSceneTick: UseScenePersistResult['onSceneTick'] = (elements, appState, files) => {
    if (readOnly) return;
    latestSceneRef.current = { elements, appState };

    const fileIds = Object.keys(files);
    const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
    if (newIds.length > 0) {
      newIds.forEach((id) => knownFileIdsRef.current.add(id));
      onFilesChangeRef.current?.(files, newIds);
    }

    if (!sceneThrottleRef.current) {
      sceneThrottleRef.current = setTimeout(async () => {
        sceneThrottleRef.current = null;
        try {
          const mod = await import('@excalidraw/excalidraw');
           
          hashElementsVersionRef.current = (mod as any).hashElementsVersion;
        } catch (err) {
          console.warn('[whiteboard] import excalidraw để flush scene thất bại:', err);
          return;
        }
        flushSceneRef.current();
      }, SYNC_THROTTLE_MS);
    }

    if (persistEnabled && newIds.length > 0) {
      for (const id of newIds) {
        if (files[id]) pendingFilesRef.current[id] = files[id];
      }
      if (!fileThrottleRef.current) {
        fileThrottleRef.current = setTimeout(() => {
          fileThrottleRef.current = null;
          flushFilesRef.current();
        }, FILE_THROTTLE_MS);
      }
    }

    if (persistEnabled && !pruneThrottleRef.current) {
      pruneThrottleRef.current = setTimeout(() => {
        pruneThrottleRef.current = null;
        flushPruneRef.current();
      }, PRUNE_THROTTLE_MS);
    }
  };

  // Mount: load initialFiles (server) → addFiles 1 lần khi api ready.
  const initialFilesAddedRef = useRef(false);
  useEffect(() => {
    if (!api || initialFilesAddedRef.current) return;
    initialFilesAddedRef.current = true;
    if (!initialFiles) return;
    const entries = Object.entries(initialFiles);
    if (entries.length === 0) return;
    try {
      api.addFiles(
        entries.map(([id, f]) => ({
          id,
           
          dataURL: (f as any).dataURL,
           
          mimeType: (f as any).mimeType,
           
          created: (f as any).created ?? Date.now(),
        })),
      );
      entries.forEach(([id]) => knownFileIdsRef.current.add(id));
    } catch (err) {
      console.warn('[whiteboard] addFiles initialFiles thất bại:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // Mount: load persisted raster files từ IDB → addFiles.
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey as string).then(
      (files) => {
        // Recheck cancelled — IDB onsuccess có thể fire sau component unmount.
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        if (cancelled) return;
        try {
          api.addFiles(
            entries.map(([id, f]) => ({
              id,
               
              dataURL: (f as any).dataURL,
               
              mimeType: (f as any).mimeType,
               
              created: (f as any).created ?? Date.now(),
            })),
          );
          if (cancelled) return;
          entries.forEach(([id]) => knownFileIdsRef.current.add(id));
        } catch (err) {
          if (cancelled) return;
          console.warn('[whiteboard] addFiles từ IDB thất bại:', err);
        }
      },
      (err) => {
        if (cancelled) return;
        console.warn('[whiteboard] readFiles thất bại:', err);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        // stamps đọc từ ref — props có thể đã đổi sau 400ms, closure stale.
        await restoreMissingStampFiles(api, elements, stampsRef.current);
      } catch (err) {
        if (cancelled) return;
        console.warn('Math stamp restore pass failed:', err);
      }
    };
    void run();
    const t = setTimeout(() => {
      void run();
    }, RESTORE_PASS_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial]);

  // Unmount cleanup: flush pending writes TRƯỚC khi clearTimeout để không
  // mất scene/file write cuối khi user navigate giữa throttle window.
  useEffect(
    () => () => {
      if (sceneThrottleRef.current) {
        clearTimeout(sceneThrottleRef.current);
        sceneThrottleRef.current = null;
        flushSceneRef.current();
      }
      if (fileThrottleRef.current) {
        clearTimeout(fileThrottleRef.current);
        fileThrottleRef.current = null;
        flushFilesRef.current();
      }
      if (pruneThrottleRef.current) {
        clearTimeout(pruneThrottleRef.current);
        pruneThrottleRef.current = null;
        flushPruneRef.current();
      }
    },
    [],
  );

  return { effectiveInitialScene, onSceneTick };
}
