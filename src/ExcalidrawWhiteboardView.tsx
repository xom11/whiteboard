'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './types';
import { pickSyncableAppState } from './serialize';
import {
  ToolbarStampInjector,
  GeometryLeftPanel,
  LatexLeftPanel,
  LatexEditorPopover,
  GeometryEditorPanel,
  useStampShortcuts,
  isMathStamp,
  restoreMissingMathStampFiles,
  type SerializedBoard,
  type LatexEditorHandle,
  type GeometryEditorPanelHandle,
  type GeomBoardState,
} from './stamp';
import type { GeomTool } from './stamp/JSXGraphMiniBoard';
import { insertStampImage } from './core/insertStampImage';
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
   * + raster files. Khi prop này có giá trị, dữ liệu khôi phục từ storage được
   * ưu tiên hơn `initialScene` (đảm bảo reload trang giữ lại bảng vẽ).
   */
  persistKey?: string;
}

const INITIAL_GEOM_STATE: GeomBoardState = {
  tool: 'move',
  showAxis: false,
  showGrid: false,
  canUndo: false,
};

export function ExcalidrawWhiteboardView({
  role,
  initialScene,
  remoteScene,
  remoteFiles,
  onSceneChange,
  onFilesChange,
  langCode = 'vi-VN',
  persistKey,
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

  const [activeStamp, setActiveStamp] = useState<'geometry' | 'latex' | null>(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;

  // Geometry-specific state
  const [geometryEditing, setGeometryEditing] = useState<{
    editingElementId: string | null;
    initialState: SerializedBoard | null;
  }>({ editingElementId: null, initialState: null });
  const [geomState, setGeomState] = useState<GeomBoardState>(INITIAL_GEOM_STATE);
  const geomPanelRef = useRef<GeometryEditorPanelHandle | null>(null);

  // LaTeX-specific state
  const [latexEditing, setLatexEditing] = useState<{
    editingElementId: string | null;
    initialValue: string;
    x: number;
    y: number;
  }>({ editingElementId: null, initialValue: '', x: 0, y: 0 });
  const [latexDisplayMode, setLatexDisplayMode] = useState(false);
  const latexEditorRef = useRef<LatexEditorHandle | null>(null);
  const latexInsertableRef = useRef<{ insert: () => boolean; hasContent: () => boolean }>({
    insert: () => false,
    hasContent: () => false,
  });

  const lastClickRef = useRef<{ time: number; elementId: string | null }>({
    time: 0,
    elementId: null,
  });

  // Mỗi lần intercept crop xong, lưu id để skip không lặp lại
  const handledCropIdRef = useRef<string | null>(null);

  // Lưu lại tool Excalidraw đang active TRƯỚC khi mở G/L để restore sau khi đóng.
  const prevExcalidrawToolRef = useRef<string>('selection');

  const isTeacher = role === 'teacher';

  // ---- Open / close helpers ----
  const openGeometry = useCallback(() => {
    if (!isTeacher) return;
    setGeometryEditing({ editingElementId: null, initialState: null });
    setGeomState(INITIAL_GEOM_STATE);
    setActiveStamp('geometry');
  }, [isTeacher]);

  const openLatex = useCallback(() => {
    if (!isTeacher) return;
    setLatexEditing({ editingElementId: null, initialValue: '', x: 0, y: 0 });
    setActiveStamp('latex');
  }, [isTeacher]);

  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setGeometryEditing({ editingElementId: null, initialState: null });
    setLatexEditing({ editingElementId: null, initialValue: '', x: 0, y: 0 });
  }, []);

  const toggleGeometry = useCallback(() => {
    if (activeStamp === 'geometry') closeStamp();
    else openGeometry();
  }, [activeStamp, closeStamp, openGeometry]);

  const toggleLatex = useCallback(() => {
    if (activeStamp === 'latex') closeStamp();
    else openLatex();
  }, [activeStamp, closeStamp, openLatex]);

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
      // mở editor của chính ta. handlePointerDown cũng phát hiện double-click sớm
      // hơn — đây là fallback (đặc biệt khi click rơi vào selection handle khiến
      // pointerDownState.hit.element = null).
      const cropId = appState?.croppingElementId as string | null | undefined;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e: ExcalidrawElement) => e.id === cropId);
        if (el && isMathStamp(el)) {
          handledCropIdRef.current = cropId;
          api.updateScene({
            appState: { ...appState, croppingElementId: null, selectedElementIds: {} },
          });
          if (el.customData.kind === 'geometry') {
            try {
              const parsed = JSON.parse(el.customData.jsonState) as SerializedBoard;
              setGeometryEditing({ editingElementId: el.id, initialState: parsed });
              setActiveStamp('geometry');
            } catch {
              console.warn('customData jsonState corrupted; skipping reopen');
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const elAny = el as any;
            setLatexEditing({
              editingElementId: el.id,
              initialValue: el.customData.src,
              x: elAny.x ?? 0,
              y: elAny.y ?? 0,
            });
            setLatexDisplayMode(!!el.customData.displayMode);
            setActiveStamp('latex');
          }
          return;
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
    [isTeacher, api, onSceneChange, onFilesChange, persistKey],
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
        await restoreMissingMathStampFiles(api, elements);
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
  }, [api, initialScene, remoteScene]);

  useEffect(
    () => () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    },
    [],
  );

  // ---- Stamp insert handlers ----
  const handleGeometryInsert = useCallback(
    async (jsonState: string, svgString: string) => {
      if (!api) return;
      try {
        await insertStampImage(api, {
          svgString,
          makeCustomData: (width, height) => ({
            kind: 'geometry' as const,
            version: 1 as const,
            jsonState,
            svgWidth: width,
            svgHeight: height,
          }),
          editingElementId: geometryEditing.editingElementId,
        });
      } catch (err) {
        console.error('Geometry stamp insert failed:', err);
      }
      closeStamp();
    },
    [api, geometryEditing.editingElementId, closeStamp],
  );

  const handleLatexInsert = useCallback(
    async (svgString: string, src: string, displayMode: boolean) => {
      if (!api) return;
      try {
        await insertStampImage(api, {
          svgString,
          makeCustomData: () => ({
            kind: 'latex' as const,
            version: 1 as const,
            src,
            displayMode,
          }),
          editingElementId: latexEditing.editingElementId,
          position: { x: latexEditing.x || undefined, y: latexEditing.y || undefined },
        });
      } catch (err) {
        console.error('LaTeX stamp insert failed:', err);
      }
      closeStamp();
    },
    [api, latexEditing.editingElementId, latexEditing.x, latexEditing.y, closeStamp],
  );

  // ---- Double-click detection for re-edit ----
  const handlePointerDown = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool: any, pointerDownState: any) => {
      if (!isTeacher) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== 'image') return;
      if (!isMathStamp(hitElement)) return;
      const now = Date.now();
      const isDouble =
        lastClickRef.current.elementId === hitElement.id &&
        now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      if (hitElement.customData.kind === 'geometry') {
        try {
          const parsed = JSON.parse(hitElement.customData.jsonState) as SerializedBoard;
          setGeometryEditing({ editingElementId: hitElement.id, initialState: parsed });
          setActiveStamp('geometry');
        } catch {
          console.warn('customData jsonState corrupted; skipping reopen');
        }
      } else {
        setLatexEditing({
          editingElementId: hitElement.id,
          initialValue: hitElement.customData.src,
          x: hitElement.x ?? 0,
          y: hitElement.y ?? 0,
        });
        setLatexDisplayMode(!!hitElement.customData.displayMode);
        setActiveStamp('latex');
      }
    },
    [isTeacher],
  );

  // ---- Keyboard shortcuts: G / L để toggle ----
  useStampShortcuts({
    enabled: isTeacher,
    onGeometry: toggleGeometry,
    onLatex: toggleLatex,
  });

  // ---- Sync Excalidraw activeTool với activeStamp ----
  // Khi G/L mở, deselect tool Excalidraw (1-9) bằng cách set sang 'hand' (không
  // vẽ). Khi đóng, restore tool trước đó để user không bị mất context.
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

  // ---- Block tất cả Excalidraw shortcuts khi G/L active ----
  // Capture-phase keydown: chặn mọi phím (trừ trong editable input) để các
  // shortcut 1-9, V, R, D, O, A, L, P, T, E, H... của Excalidraw không trigger
  // tool change đằng sau editor.
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
      // Cho phép Ctrl/Cmd + chữ cái (undo, copy/paste...)
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      // Esc xử lý ở handler riêng — không block để handler bên dưới chạy
      if (e.key === 'Escape') return;
      // G / L: useStampShortcuts đã có handler riêng để toggle — vẫn cho qua
      // (useStampShortcuts đăng ký ở capture phase qua window listener)
      const k = e.key.toLowerCase();
      if (k === 'g' || k === 'l') return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blocker, { capture: true });
    return () => window.removeEventListener('keydown', blocker, { capture: true });
  }, [activeStamp]);

  // ---- Esc đóng panel (capture phase để chạy TRƯỚC Excalidraw) ----
  useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ae = document.activeElement as HTMLElement | null;
      // Trong input → để input handle Esc nhưng vẫn close stamp
      // (Excalidraw có Esc handler riêng có thể swallow → bắt ở capture)
      if (
        ae &&
        (ae.tagName === 'TEXTAREA' || ae.isContentEditable)
      ) {
        return;
      }
      // INPUT trong LaTeX editor: vẫn cho phép close
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [activeStamp, closeStamp]);

  // ---- Click ra ngoài (auto-insert hoặc đóng) ----
  // Khi user click ngoài editor / panel trái / nút G-L trên toolbar:
  //   - Geometry: nếu có ít nhất 1 phép dựng → tự chèn; không có → chỉ đóng.
  //   - LaTeX: nếu input không rỗng và preview hợp lệ → tự chèn; không có → chỉ đóng.
  useEffect(() => {
    if (!activeStamp) return;
    let lastFireTime = 0;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      // Dedup: pointerdown + mousedown bắn cùng 1 lúc → chỉ xử lý lần đầu.
      const now = Date.now();
      if (now - lastFireTime < 50) return;
      lastFireTime = now;
      const stampType = activeStampRef.current;
      if (stampType === 'geometry') {
        geomPanelRef.current?.insert();
      } else if (stampType === 'latex') {
        latexInsertableRef.current.insert();
      }
      closeStamp();
    };
    // Listen ở window capture phase — sớm hơn cả document, đảm bảo chạy trước
    // Excalidraw's internal handlers. Cũng listen pointerdown thay vì mousedown
    // vì Excalidraw có thể call stopPropagation trên mousedown trên canvas.
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
        excalidrawAPI={(a: ExApi) => setApi(a)}
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
        activeStamp={activeStamp}
        onToggleGeometry={toggleGeometry}
        onToggleLatex={toggleLatex}
      />

      {activeStamp === 'geometry' && (
        <>
          <GeometryLeftPanel
            activeTool={geomState.tool}
            onToolChange={(t: GeomTool) => geomPanelRef.current?.setTool(t)}
            showAxis={geomState.showAxis}
            showGrid={geomState.showGrid}
            onShowAxisChange={(b) => geomPanelRef.current?.setShowAxis(b)}
            onShowGridChange={(b) => geomPanelRef.current?.setShowGrid(b)}
            onUndo={() => geomPanelRef.current?.undo()}
            canUndo={geomState.canUndo}
            onClose={closeStamp}
            isDark={isDarkTheme}
          />
          <GeometryEditorPanel
            ref={geomPanelRef}
            initialState={geometryEditing.initialState}
            onInsert={handleGeometryInsert}
            onClose={closeStamp}
            onStateChange={setGeomState}
            withLeftPanel
            isDark={isDarkTheme}
          />
        </>
      )}

      {activeStamp === 'latex' && (
        <>
          <LatexLeftPanel
            displayMode={latexDisplayMode}
            onDisplayModeChange={setLatexDisplayMode}
            onInsertSnippet={(s) => latexEditorRef.current?.insertAtCursor(s)}
            onClose={closeStamp}
          />
          <LatexEditorPopover
            ref={(node) => {
              latexEditorRef.current = node;
              // Cập nhật insertable interface để click-outside có thể trigger insert
              if (node) {
                latexInsertableRef.current = {
                  insert: () => node.tryInsert(),
                  hasContent: () => node.hasContent(),
                };
              }
            }}
            x={0}
            y={0}
            initialValue={latexEditing.initialValue}
            displayMode={latexDisplayMode}
            onDisplayModeChange={setLatexDisplayMode}
            onInsert={handleLatexInsert}
            onClose={closeStamp}
            withLeftPanel
          />
        </>
      )}
    </div>
  );
}
