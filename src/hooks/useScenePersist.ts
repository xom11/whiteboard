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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRef: React.MutableRefObject<any>;
  stamps: ReadonlyArray<StampType>;
}

export interface UseScenePersistResult {
  effectiveInitialScene: ExcalidrawSceneSnapshot | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appState: any;
  } | null>(null);
  const pendingFilesRef = useRef<BinaryFiles>({});
  // Cached hashElementsVersion để flushScene chạy sync trong unmount cleanup
  // (cleanup không thể await dynamic import).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const flushFilesRef = useRef<() => void>(() => undefined);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = (apiRef.current?.getSceneElements?.()
        ?? latestSceneRef.current?.elements
        ?? []) as readonly ExcalidrawElement[];
      const stampIds = new Set<string>();
      for (const el of currentElements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const currentElements = (apiRef.current?.getSceneElements?.()
        ?? latestSceneRef.current?.elements
        ?? []) as readonly ExcalidrawElement[];
      const keep = new Set<string>();
      for (const el of currentElements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataURL: (f as any).dataURL,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mimeType: (f as any).mimeType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dataURL: (f as any).dataURL,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mimeType: (f as any).mimeType,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
