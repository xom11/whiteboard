'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { restoreMissingStampFiles } from './stamps/shared/restoreStampFiles';
import type { StampHostHandle } from './stamps/shared/types';
import { readScene, writeScene } from './core/persistence/sceneStore';
import { readFiles, writeFiles, pruneFiles } from './core/persistence/fileStore';
import '@excalidraw/excalidraw/index.css';
import './stamps/shared/stamp.css';

const Excalidraw = dynamic(
  async () => (await import('./ExcalidrawWithMenus')).ExcalidrawWithMenus,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Đang tải bảng…
      </div>
    ),
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExApi = any;

const SYNC_THROTTLE_MS = 200;
const DOUBLE_CLICK_MS = 400;

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
   * Host component (UI editing). Mặc định DEFAULT_STAMPS (geometry + latex).
   * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới.
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
  const persistEnabled = typeof storageKey === 'string' && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;

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

  const lastClickRef = useRef<{ time: number; elementId: string | null }>({
    time: 0,
    elementId: null,
  });
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
          const mod = await import('@excalidraw/excalidraw');
          const latestScene = latestSceneRef.current ?? { elements, appState };
          const liveElements = latestScene.elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[];
          const liveAppState = pickSyncableAppState(latestScene.appState);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const elementHash = (mod as any).hashElementsVersion(liveElements);
          const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
          if (sceneHash === lastSceneHashRef.current) return;
          lastSceneHashRef.current = sceneHash;
          onSceneChange?.({ elements: liveElements, appState: liveAppState });

          if (persistEnabled) {
            writeScene(storageKey as string, {
              elements: liveElements,
              appState: liveAppState,
            });
          }
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
            const pending = pendingFilesRef.current;
            pendingFilesRef.current = {};
            const currentElements = (api?.getSceneElements?.() ?? elements) as readonly ExcalidrawElement[];
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
          }, 1000);
        }
      }

      // Prune throttle (2s): dọn orphan raster sau khi xoá element.
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          const currentElements = (api?.getSceneElements?.() ?? elements) as readonly ExcalidrawElement[];
          const keep = new Set<string>();
          for (const el of currentElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fid = (el as any).fileId as string | undefined;
            if (fid && !isStampElement(el)) keep.add(fid);
          }
          void pruneFiles(persistKeyRef.current as string, keep);
        }, 2000);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp],
  );

  // ---- Mount: load persisted raster files từ IDB -> addFiles ----
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey as string).then((files) => {
      if (cancelled) return;
      const entries = Object.entries(files);
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
        console.warn('[whiteboard] addFiles từ IDB thất bại:', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingStampFiles(api, elements, stamps);
      } catch (err) {
        console.warn('Math stamp restore pass failed:', err);
      }
    };
    run();
    const t = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial, stamps]);

  useEffect(
    () => () => {
      if (sceneThrottleRef.current) clearTimeout(sceneThrottleRef.current);
      if (fileThrottleRef.current) clearTimeout(fileThrottleRef.current);
      if (pruneThrottleRef.current) clearTimeout(pruneThrottleRef.current);
    },
    [],
  );

  // ---- Double-click detection for re-edit ----
  const handlePointerDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool: any, pointerDownState: any) => {
      if (readOnly) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== 'image') return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble =
        lastClickRef.current.elementId === hitElement.id &&
        now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      openStamp(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData,
      });
    },
    [readOnly, stamps, openStamp],
  );

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
  // Capture-phase keydown: chặn mọi phím (trừ editable input + modifier + Esc +
  // phím tắt của stamp đã đăng ký) để các shortcut 1-9, V, R, D... của
  // Excalidraw không trigger tool change sau editor.
  const stampShortcutKeys = useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps],
  );

  useEffect(() => {
    if (!activeStamp) return;
    const ALLOWED_KEYS = new Set([
      'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
      'Home', 'End', 'PageUp', 'PageDown',
    ]);

    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const blocker = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === 'Escape') return;
      if (stampShortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blocker, { capture: true });
    return () => window.removeEventListener('keydown', blocker, { capture: true });
  }, [activeStamp, stampShortcutKeys]);

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

  // ---- Click ra ngoài → auto-insert (nếu có nội dung) rồi đóng ----
  useEffect(() => {
    if (!activeStamp) return;
    let lastFireTime = 0;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFireTime < 50) return;
      lastFireTime = now;
      // Trigger insert qua Host imperative API. Host quyết định có chèn được
      // không (geometry: log.length > 0; latex: input không rỗng + preview ok).
      hostRef.current?.tryInsert();
      closeStamp();
    };
    window.addEventListener('pointerdown', handler, { capture: true });
    window.addEventListener('mousedown', handler, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handler, { capture: true });
      window.removeEventListener('mousedown', handler, { capture: true });
    };
  }, [activeStamp, closeStamp]);

  return (
    <div className={`relative h-full w-full${isDarkTheme ? ' theme--dark' : ''}`}>
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

      <ToolbarInjector
        enabled={!readOnly}
        activeStampKind={activeStamp}
        onToggle={toggleStampByKind}
        stamps={stamps}
      />

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
