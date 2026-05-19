'use client';

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './types';
import { pickSyncableAppState } from './serialize';
import {
  isStampElement,
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamps/shared/registry';
import { ToolbarInjector } from './stamps/shared/ToolbarInjector';
import { useShortcuts } from './stamps/shared/useShortcuts';
import { PdfImporterButton } from './pdf/PdfImporterButton';
import { PageRangeDialog } from './pdf/PageRangeDialog';
import {
  loadPdfDocument,
  closePdfDocument,
  rasterizePdf,
} from './pdf/rasterize';
import { insertRasterizedPagesIntoScene } from './pdf/insertPdfPages';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useStampDoubleClick } from './stamps/shared/useStampDoubleClick';
import { useStampShortcutBlocker } from './stamps/shared/useStampShortcutBlocker';
import { useStampClickOutside } from './stamps/shared/useStampClickOutside';
import { restoreMissingStampFiles } from './stamps/shared/restoreStampFiles';
import type { StampHostHandle } from './stamps/shared/types';
import { readScene, writeScene } from './core/persistence/sceneStore';
import { readFiles, writeFiles, pruneFiles } from './core/persistence/fileStore';
import '@excalidraw/excalidraw/index.css';
import './stamps/shared/stamp.css';

const Excalidraw = lazy(() =>
  import('./ExcalidrawWithMenus').then((m) => ({ default: m.ExcalidrawWithMenus })),
);

const ExcalidrawLoadingFallback = () => (
  <div className="flex h-full items-center justify-center text-sm text-gray-500">
    Đang tải bảng…
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

const SYNC_THROTTLE_MS = 200;

/** Element đang re-edit (double-click) — đủ tối thiểu để Host parse customData. */
interface EditingElement {
  id: string;
  customData: unknown;
}

export interface WhiteboardProps {
  /**
   * Storage key cho persist client-side.
   * - Scene -> localStorage['whiteboard:scene:'+storageKey]
   * - Files raster -> IndexedDB 'whiteboard-files' index theo storageKey
   * - Default: 'default'
   * - Truyen `null` de tat persist (consumer drive state qua onApi).
   */
  storageKey?: string | null;

  /** View-only (Excalidraw viewModeEnabled). Default false. */
  readOnly?: boolean;

  /** Local edits -> consumer broadcast. Optional. */
  onSceneChange?: (snapshot: ExcalidrawSceneSnapshot) => void;
  onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;

  /** Excalidraw imperative API. Consumer dung inject remote scene khi can. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApi?: (api: any) => void;

  /** Excalidraw UI language. Defaults to 'vi-VN'. See @excalidraw/excalidraw locales. */
  langCode?: string;

  /**
   * Danh sách stamp đăng ký. Mỗi stamp khai báo phím tắt + toolbar button +
   * Host component (UI editing). Mặc định DEFAULT_STAMPS (= ALL_STAMPS,
   * gồm geometry + latex + geometry3d + graph2d).
   * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới hoặc
   * `STABLE_STAMPS` để chỉ bật stamp ổn định.
   */
  stamps?: ReadonlyArray<StampType>;
}

export function Whiteboard({
  storageKey = 'default',
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = 'vi-VN',
  stamps = DEFAULT_STAMPS,
}: WhiteboardProps) {
  const [api, setApi] = useState<ExApi | null>(null);
  const apiRef = useRef<ExApi | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const isDarkThemeRef = useRef(false);
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
  // Stamps prop có thể thay đổi — capture vào ref để callback trong setTimeout
  // không bị stale closure.
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const persistEnabled = typeof storageKey === 'string' && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  // Lưu callback refs để cleanup unmount truy cập được mà không bị stale closure
  // (props onSceneChange/onFilesChange có thể thay đổi).
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
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null = persistedInitial
    ? {
        elements: persistedInitial.elements,
        appState: persistedInitial.appState as SyncableAppState,
      }
    : null;

  // ---- Stamp state (registry-driven) ----
  const [activeStamp, setActiveStamp] = useState<string | null>(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = useState<EditingElement | null>(null);
  const hostRef = useRef<StampHostHandle | null>(null);

  // ---- PDF import state ----
  // Sau khi user pick file, load doc lấy numPages → mở dialog hỏi range.
  // Giữ doc instance để rasterize ngay (tránh load lại từ ArrayBuffer).
  const [pdfPending, setPdfPending] = useState<{
    doc: PDFDocumentProxy;
    fileName: string;
    totalPages: number;
  } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const handledCropIdRef = useRef<string | null>(null);
  const prevExcalidrawToolRef = useRef<string>('selection');

  const stampByKind = useMemo(() => {
    const m = new Map<string, StampType>();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);

  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;

  // ---- Open / close helpers ----
  const openStamp = useCallback(
    (kind: string, element: EditingElement | null = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind],
  );

  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);

  const toggleStampByKind = useCallback(
    (kind: string) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp],
  );

  // ---- Capture local changes ----
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
      // Sync theme từ Excalidraw appState -> React state.
      // Excalidraw 0.18 gọi onChange đồng bộ trong state-updater của họ
      // (React 19 / Next.js 16 sẽ warn: "scheduled from inside an update
      // function"). Bail-out qua ref + defer setState bằng queueMicrotask để
      // setState chạy SAU commit của Excalidraw, không nằm trong updater.
      const nextDark = appState?.theme === 'dark';
      if (isDarkThemeRef.current !== nextDark) {
        isDarkThemeRef.current = nextDark;
        queueMicrotask(() => setIsDarkTheme(nextDark));
      }

      if (readOnly) return;
      latestSceneRef.current = { elements, appState };

      // Intercept Excalidraw crop-image flow cho math stamps: khi user double-click
      // 1 stamp, Excalidraw set appState.croppingElementId. Ta dismiss crop mode +
      // mở Host editor tương ứng. handlePointerDown phát hiện double-click sớm
      // hơn — đây là fallback (đặc biệt khi click rơi vào selection handle).
      const cropId = appState?.croppingElementId as string | null | undefined;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e: ExcalidrawElement) => e.id === cropId);
        if (el) {
          const stamp = findStampForCustomData((el as { customData?: unknown }).customData, stamps);
          if (stamp) {
            handledCropIdRef.current = cropId;
            // Defer cả updateScene + openStamp ra khỏi commit-phase của
            // Excalidraw — nếu chạy đồng bộ, React 19 warn "update scheduled
            // from inside an update function" (handleChange chạy trong updater
            // của Excalidraw).
            const elId = el.id;
            const elCustom = (el as { customData?: unknown }).customData;
            const stampKind = stamp.kind;
            queueMicrotask(() => {
              try {
                api.updateScene({
                  appState: { croppingElementId: null, selectedElementIds: {} },
                });
              } catch { /* ignore */ }
              openStamp(stampKind, { id: elId, customData: elCustom });
            });
            return;
          }
        }
      }
      if (!cropId) {
        handledCropIdRef.current = null;
      }

      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange?.(files, newIds);
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

      // File throttle (1s): lưu raster vào IDB, bỏ math-stamp files.
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            flushFilesRef.current();
          }, 1000);
        }
      }

      // Prune throttle (2s): dọn orphan raster sau khi xoá element.
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          flushPruneRef.current();
        }, 2000);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp],
  );

  // ---- Flush helpers (gọi từ setTimeout VÀ unmount cleanup) ----
  // Lưu vào ref để cleanup luôn dùng version mới nhất (closure-stable).
  const flushSceneRef = useRef<() => void>(() => undefined);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[];
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      // Nếu chưa load module → bỏ qua hash dedupe, cứ ghi (correctness > perf trong unmount path).
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

  // ---- Mount: load persisted raster files từ IDB -> addFiles ----
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey as string).then(
      (files) => {
        // Recheck cancelled NGAY khi promise resolve — IDB onsuccess có thể
        // fire sau component unmount (tx microtask).
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        // Recheck một lần nữa trước khi gọi api.addFiles để chắc chắn
        // không invoke API trên instance đã teardown.
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
        // Đọc stamps từ ref — props có thể đã thay đổi sau setTimeout 400ms,
        // closure-captured `stamps` sẽ stale.
        await restoreMissingStampFiles(api, elements, stampsRef.current);
      } catch (err) {
        if (cancelled) return;
        console.warn('Math stamp restore pass failed:', err);
      }
    };
    void run();
    const t = setTimeout(() => {
      void run();
    }, 400);
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

  // ---- Double-click detection for re-edit ----
  const handlePointerDown = useStampDoubleClick({
    enabled: !readOnly,
    stamps,
    onOpen: openStamp,
  });

  // ---- Keyboard shortcuts: đọc registry, mỗi stamp tự khai báo phím tắt ----
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps,
  });

  // ---- Sync Excalidraw activeTool với activeStamp ----
  useEffect(() => {
    if (!api) return;
    if (activeStamp) {
      try {
        const cur = api.getAppState?.()?.activeTool?.type ?? 'selection';
        if (cur && cur !== 'hand') prevExcalidrawToolRef.current = cur;
        api.setActiveTool?.({ type: 'hand' });
      } catch { /* ignore */ }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.setActiveTool?.({ type: prevExcalidrawToolRef.current as any });
      } catch { /* ignore */ }
    }
  }, [activeStamp, api]);

  // ---- Block Excalidraw shortcuts khi stamp panel đang mở ----
  useStampShortcutBlocker({ activeStamp, stamps });

  // ---- Esc đóng panel (capture phase để chạy TRƯỚC Excalidraw) ----
  useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [activeStamp, closeStamp]);

  useStampClickOutside({ activeStamp, hostRef, onClose: closeStamp });

  // ---- PDF import handlers ----
  const handlePdfPick = useCallback(
    async (file: File) => {
      if (readOnly || pdfBusy) return;
      setPdfBusy(true);
      try {
        const doc = await loadPdfDocument(file);
        setPdfPending({ doc, fileName: file.name, totalPages: doc.numPages });
      } catch (err) {
        console.warn('[whiteboard] Đọc PDF thất bại:', err);
        window.alert('Không đọc được PDF. File có thể đã hỏng hoặc bị mật khẩu bảo vệ.');
      } finally {
        setPdfBusy(false);
      }
    },
    [readOnly, pdfBusy],
  );

  const handlePdfConfirm = useCallback(
    async (pages: number[]) => {
      if (!pdfPending || !api) return;
      const { doc } = pdfPending;
      setPdfPending(null);
      setPdfBusy(true);
      const scale = 2;
      try {
        const rendered = await rasterizePdf(doc, { pages, scale });
        await closePdfDocument(doc);
        insertRasterizedPagesIntoScene(api, rendered, { scale });
      } catch (err) {
        console.warn('[whiteboard] Chèn PDF thất bại:', err);
        window.alert('Chèn PDF thất bại. Xem console để biết chi tiết.');
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfPending, api],
  );

  const handlePdfCancel = useCallback(() => {
    if (pdfPending) {
      void closePdfDocument(pdfPending.doc);
    }
    setPdfPending(null);
  }, [pdfPending]);

  // ---- Drop handler: bắt PDF file kéo vào canvas TRƯỚC Excalidraw ----
  // Excalidraw không hiểu application/pdf → mặc định sẽ reject (toast lỗi).
  // Capture phase + preventDefault để ngắt sớm rồi tự xử lý.
  useEffect(() => {
    if (readOnly) return;
    const root = document.querySelector<HTMLElement>('.excalidraw');
    if (!root) return;

    const onDragOver = (e: DragEvent) => {
      const items = e.dataTransfer?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type === 'application/pdf') {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          return;
        }
      }
    };

    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const pdf = Array.from(files).find((f) => f.type === 'application/pdf');
      if (!pdf) return;
      e.preventDefault();
      e.stopPropagation();
      void handlePdfPick(pdf);
    };

    root.addEventListener('dragover', onDragOver, { capture: true });
    root.addEventListener('drop', onDrop, { capture: true });
    return () => {
      root.removeEventListener('dragover', onDragOver, { capture: true });
      root.removeEventListener('drop', onDrop, { capture: true });
    };
  }, [readOnly, handlePdfPick, api]);

  return (
    <div className={`relative h-full w-full${isDarkTheme ? ' theme--dark' : ''}`}>
      <Suspense fallback={<ExcalidrawLoadingFallback />}>
        <Excalidraw
          excalidrawAPI={(a: ExApi) => {
            // Excalidraw có thể gọi callback này đồng bộ trong commit-phase của
            // họ. Bail-out qua ref + defer setApi để tránh "update scheduled
            // from inside an update function" trên React 19 / Next.js 16.
            if (apiRef.current === a) return;
            apiRef.current = a;
            queueMicrotask(() => {
              setApi(a);
              onApi?.(a);
            });
          }}
          langCode={langCode}
          viewModeEnabled={readOnly}
          initialData={
            effectiveInitialScene
              ? {
                  elements: effectiveInitialScene.elements,
                  appState: {
                    ...effectiveInitialScene.appState,
                    gridSize: effectiveInitialScene.appState.gridSize ?? undefined,
                  },
                }
              : { appState: { viewBackgroundColor: '#ffffff' } }
          }
          onChange={handleChange}
          onPointerDown={handlePointerDown}
        />
      </Suspense>

      <ToolbarInjector
        enabled={!readOnly}
        activeStampKind={activeStamp}
        onToggle={toggleStampByKind}
        stamps={stamps}
      />

      <PdfImporterButton enabled={!readOnly} onPick={handlePdfPick} />

      {pdfPending && (
        <PageRangeDialog
          doc={pdfPending.doc}
          fileName={pdfPending.fileName}
          onConfirm={handlePdfConfirm}
          onCancel={handlePdfCancel}
        />
      )}

      {pdfBusy && !pdfPending && (
        <div
          aria-live="polite"
          role="status"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            borderRadius: 6,
            fontSize: 12,
            zIndex: 10000,
          }}
        >
          Đang xử lý PDF…
        </div>
      )}

      {HostComponent && (
        <HostComponent
          ref={hostRef}
          api={api}
          editingElement={editingElement}
          onClose={closeStamp}
          isDark={isDarkTheme}
        />
      )}
    </div>
  );
}
