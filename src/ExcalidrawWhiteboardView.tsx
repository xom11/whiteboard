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
  ToolbarStampInjector,
  useStampShortcuts,
  isMathStamp,
  restoreMissingMathStampFiles,
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamp';
import type { StampHostHandle } from './stamp/registry/types';
import { usePersist, writePersisted } from './core/usePersist';
import '@excalidraw/excalidraw/index.css';
import './stamp/stamp.css';

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

export interface ExcalidrawWhiteboardViewProps {
  role: 'teacher' | 'student';
  roomId: string;
  initialScene: ExcalidrawSceneSnapshot | null;
  remoteScene: ExcalidrawSceneSnapshot | null;
  remoteFiles?: BinaryFiles | null;
  onSceneChange: (snapshot: ExcalidrawSceneSnapshot) => void;
  onFilesChange: (files: BinaryFiles, newFileIds: string[]) => void;
  /** Excalidraw UI language. Defaults to 'vi-VN'. See @excalidraw/excalidraw locales. */
  langCode?: string;
  /**
   * Khi set, component tự lưu scene + files vào `sessionStorage[persistKey]` mỗi
   * lần thay đổi (teacher) và khôi phục khi mount. Math stamps tự regenerate SVG
   * qua `restoreMissingMathStampFiles`, nên storage chỉ cần chứa elements + appState
   * + raster files.
   */
  persistKey?: string;
  /**
   * Danh sách stamp đăng ký. Mỗi stamp khai báo phím tắt + toolbar button +
   * Host component (UI editing). Mặc định DEFAULT_STAMPS (geometry + latex).
   * Truyền `[...DEFAULT_STAMPS, customStamp]` để thêm stamp mới.
   */
  stamps?: ReadonlyArray<StampType>;
  /**
   * Callback nhận Excalidraw imperative API khi nó mount xong. Dùng cho test
   * (Playwright) hoặc consumer cần điều khiển scene ngoài luồng remote-sync.
   * Tránh expose API nếu không cần — phần lớn consumer chỉ cần onSceneChange.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApi?: (api: any) => void;
}

export function ExcalidrawWhiteboardView({
  role,
  initialScene,
  remoteScene,
  remoteFiles,
  onSceneChange,
  onFilesChange,
  langCode = 'vi-VN',
  persistKey,
  stamps = DEFAULT_STAMPS,
  onApi,
}: ExcalidrawWhiteboardViewProps) {
  const [api, setApi] = useState<ExApi | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastElementsHashRef = useRef<string>('');
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { persistedInitial } = usePersist(persistKey, api, (id) =>
    knownFileIdsRef.current.add(id),
  );
  const effectiveInitialScene: ExcalidrawSceneSnapshot | null =
    persistedInitial
      ? { elements: persistedInitial.elements, appState: persistedInitial.appState as SyncableAppState }
      : initialScene;

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
  const isTeacher = role === 'teacher';

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
      if (!isTeacher) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [isTeacher, stampByKind],
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

  // ---- Teacher path: capture local changes ----
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
      // Sync theme từ Excalidraw appState → React state (cho cả teacher/student).
      const nextDark = appState?.theme === 'dark';
      setIsDarkTheme((prev) => (prev === nextDark ? prev : nextDark));

      if (!isTeacher) return;

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
            api.updateScene({
              appState: { ...appState, croppingElementId: null, selectedElementIds: {} },
            });
            openStamp(stamp.kind, {
              id: el.id,
              customData: (el as { customData?: unknown }).customData,
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
        onFilesChange(files, newIds);
      }

      if (throttleTimerRef.current) return;
      throttleTimerRef.current = setTimeout(async () => {
        throttleTimerRef.current = null;
        const mod = await import('@excalidraw/excalidraw');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = (mod as any).hashElementsVersion(elements);
        if (hash === lastElementsHashRef.current) return;
        lastElementsHashRef.current = hash;
        const liveElements = elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[];
        const liveAppState = pickSyncableAppState(appState);
        onSceneChange({ elements: liveElements, appState: liveAppState });

        if (persistKey) {
          // Bỏ qua file của math-stamp (sẽ regenerate). Giữ lại file raster
          // (user-paste image) để reload không mất ảnh.
          const stampFileIds = new Set<string>();
          for (const el of liveElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fid = (el as any).fileId as string | undefined;
            if (fid && isMathStamp(el)) stampFileIds.add(fid);
          }
          const rasterFiles: BinaryFiles = {};
          for (const [fid, f] of Object.entries(files)) {
            if (!stampFileIds.has(fid)) rasterFiles[fid] = f;
          }
          writePersisted(persistKey, {
            elements: liveElements,
            appState: liveAppState,
            files: rasterFiles,
          });
        }
      }, SYNC_THROTTLE_MS);
    },
    [isTeacher, api, onSceneChange, onFilesChange, persistKey, stamps, openStamp],
  );

  // ---- Student path: apply remote scene ----
  useEffect(() => {
    if (isTeacher || !api || !remoteScene) return;
    api.updateScene({
      elements: remoteScene.elements,
      appState: remoteScene.appState as Partial<SyncableAppState>,
    });
  }, [isTeacher, api, remoteScene]);

  useEffect(() => {
    if (isTeacher || !api || !remoteFiles) return;
    const entries = Object.entries(remoteFiles);
    if (entries.length === 0) return;
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
  }, [isTeacher, api, remoteFiles]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingMathStampFiles(api, elements, stamps);
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
  }, [api, initialScene, remoteScene, stamps]);

  useEffect(
    () => () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    },
    [],
  );

  // ---- Double-click detection for re-edit ----
  const handlePointerDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool: any, pointerDownState: any) => {
      if (!isTeacher) return;
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
    [isTeacher, stamps, openStamp],
  );

  // ---- Keyboard shortcuts: đọc registry, mỗi stamp tự khai báo phím tắt ----
  useStampShortcuts({
    enabled: isTeacher,
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
        excalidrawAPI={(a: ExApi) => { setApi(a); onApi?.(a); }}
        langCode={langCode}
        viewModeEnabled={!isTeacher}
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

      <ToolbarStampInjector
        enabled={isTeacher}
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
