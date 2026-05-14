'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
  SyncableAppState,
} from './excalidrawBoard/types';
import { pickSyncableAppState } from './excalidrawBoard/serialize';
import {
  StampToolButtons,
  LatexEditorPopover,
  GeometryEditorPanel,
  useStampShortcuts,
  isMathStamp,
  svgToImageElement,
  restoreMissingMathStampFiles,
  type SerializedBoard,
} from './excalidrawBoard/stamp';
import '@excalidraw/excalidraw/index.css';

// Excalidraw + custom MainMenu/Footer/WelcomeScreen are bundled into a single
// client-only module so we can use static imports (and thus `MainMenu.DefaultItems`)
// without SSR ever evaluating @excalidraw/excalidraw.
const Excalidraw = dynamic(
  async () => (await import('./excalidrawBoard/ExcalidrawWithMenus')).ExcalidrawWithMenus,
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-gray-500">Đang tải bảng…</div> },
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
}

export function ExcalidrawWhiteboardView({
  role,
  initialScene,
  remoteScene,
  remoteFiles,
  onSceneChange,
  onFilesChange,
}: ExcalidrawWhiteboardViewProps) {
  const [api, setApi] = useState<ExApi | null>(null);
  const knownFileIdsRef = useRef<Set<string>>(new Set());
  const lastElementsHashRef = useRef<string>('');
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [geometryPanel, setGeometryPanel] = useState<{
    open: boolean;
    editingElementId: string | null;
    initialState: SerializedBoard | null;
  }>({ open: false, editingElementId: null, initialState: null });

  const [latexPopover, setLatexPopover] = useState<{
    open: boolean;
    x: number;
    y: number;
    editingElementId: string | null;
    initialValue: string;
  }>({ open: false, x: 200, y: 100, editingElementId: null, initialValue: '' });

  const lastClickRef = useRef<{ time: number; elementId: string | null }>({ time: 0, elementId: null });

  const isTeacher = role === 'teacher';

  // ---- Teacher path: capture local changes ----
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
      if (!isTeacher) return;

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
        onSceneChange({
          elements: elements.filter((e) => !e.isDeleted) as readonly ExcalidrawElement[],
          appState: pickSyncableAppState(appState),
        });
      }, SYNC_THROTTLE_MS);
    },
    [isTeacher, onSceneChange, onFilesChange],
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

  // ---- Restore math-stamp binary files after page reload / remote sync ----
  // Walk current scene elements; for each math-stamp image with missing file,
  // regenerate the SVG from customData and add to Excalidraw's file store.
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
    // Initial restore + retry after a tick to catch scenes that arrive shortly after.
    run();
    const t = setTimeout(run, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [api, initialScene, remoteScene]);

  useEffect(() => () => {
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
  }, []);

  // ---- Helpers ----
  const buildStampImageElement = useCallback(
    (
      fileId: string,
      width: number,
      height: number,
      customData: unknown,
      x?: number,
      y?: number,
    ) => {
      const appState = api?.getAppState() ?? { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
      const cx = x ?? (appState.scrollX + (appState.width ?? 800) / 2 / (appState.zoom?.value ?? 1) - width / 2);
      const cy = y ?? (appState.scrollY + (appState.height ?? 600) / 2 / (appState.zoom?.value ?? 1) - height / 2);
      return {
        type: 'image' as const,
        id: 'stamp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        x: cx, y: cy, width, height, fileId, customData,
        angle: 0, strokeColor: 'transparent', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100,
        groupIds: [], roundness: null, seed: Math.floor(Math.random() * 1e9),
        versionNonce: 0, version: 1, isDeleted: false, boundElements: null,
        updated: Date.now(), link: null, locked: false, status: 'saved', scale: [1, 1],
      };
    },
    [api],
  );

  // ---- Stamp insert handlers ----
  const handleGeometryInsert = useCallback(async (jsonState: string, svgString: string) => {
    if (!api) return;
    try {
      const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(svgString);
      api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);

      const customData = {
        kind: 'geometry' as const, version: 1 as const, jsonState, svgWidth: width, svgHeight: height,
      };

      const elements = api.getSceneElements();
      const editingId = geometryPanel.editingElementId;
      if (editingId) {
        const updated = elements.map((e: ExcalidrawElement) =>
          e.id === editingId ? { ...e, fileId, customData, width, height } : e
        );
        api.updateScene({ elements: updated });
      } else {
        const newElement = buildStampImageElement(fileId, width, height, customData);
        api.updateScene({ elements: [...elements, newElement] });
      }
    } catch (err) {
      console.error('Geometry stamp insert failed:', err);
    }
    setGeometryPanel({ open: false, editingElementId: null, initialState: null });
  }, [api, geometryPanel.editingElementId, buildStampImageElement]);

  const handleLatexInsert = useCallback(async (svgString: string, src: string, displayMode: boolean) => {
    if (!api) return;
    try {
      const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(svgString);
      api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);

      const customData = {
        kind: 'latex' as const, version: 1 as const, src, displayMode,
      };

      const elements = api.getSceneElements();
      const editingId = latexPopover.editingElementId;
      if (editingId) {
        const updated = elements.map((e: ExcalidrawElement) =>
          e.id === editingId ? { ...e, fileId, customData, width, height } : e
        );
        api.updateScene({ elements: updated });
      } else {
        const newElement = buildStampImageElement(fileId, width, height, customData, latexPopover.x, latexPopover.y);
        api.updateScene({ elements: [...elements, newElement] });
      }
    } catch (err) {
      console.error('LaTeX stamp insert failed:', err);
    }
    setLatexPopover((s) => ({ ...s, open: false, editingElementId: null, initialValue: '' }));
  }, [api, latexPopover.editingElementId, latexPopover.x, latexPopover.y, buildStampImageElement]);

  // ---- Double-click detection for re-edit ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerDown = useCallback((_activeTool: any, pointerDownState: any) => {
    if (!isTeacher) return;
    const hitElement = pointerDownState?.hit?.element;
    if (!hitElement || hitElement.type !== 'image') return;
    if (!isMathStamp(hitElement)) return;
    const now = Date.now();
    const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
    lastClickRef.current = { time: now, elementId: hitElement.id };
    if (!isDouble) return;
    if (hitElement.customData.kind === 'geometry') {
      try {
        const parsed = JSON.parse(hitElement.customData.jsonState) as SerializedBoard;
        setGeometryPanel({ open: true, editingElementId: hitElement.id, initialState: parsed });
      } catch {
        console.warn('customData jsonState corrupted; skipping reopen');
      }
    } else {
      setLatexPopover({
        open: true,
        x: hitElement.x ?? 100,
        y: hitElement.y ?? 100,
        editingElementId: hitElement.id,
        initialValue: hitElement.customData.src,
      });
    }
  }, [isTeacher]);

  // ---- Keyboard shortcuts ----
  useStampShortcuts({
    enabled: isTeacher,
    onGeometry: () => setGeometryPanel({ open: true, editingElementId: null, initialState: null }),
    onLatex: () => setLatexPopover({ open: true, x: 200, y: 200, editingElementId: null, initialValue: '' }),
  });

  return (
    <div className="relative h-full w-full">
      <Excalidraw
        excalidrawAPI={(a: ExApi) => setApi(a)}
        viewModeEnabled={!isTeacher}
        initialData={
          initialScene
            ? {
                elements: initialScene.elements,
                appState: {
                  ...initialScene.appState,
                  gridSize: initialScene.appState.gridSize ?? undefined,
                },
              }
            : { appState: { viewBackgroundColor: '#ffffff' } }
        }
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        renderTopRightUI={() => (
          <StampToolButtons
            onGeometryClick={() => setGeometryPanel({ open: true, editingElementId: null, initialState: null })}
            onLatexClick={() => setLatexPopover({ open: true, x: 200, y: 200, editingElementId: null, initialValue: '' })}
            disabled={!isTeacher}
          />
        )}
      />
      {geometryPanel.open && (
        <GeometryEditorPanel
          initialState={geometryPanel.initialState}
          onInsert={handleGeometryInsert}
          onClose={() => setGeometryPanel({ open: false, editingElementId: null, initialState: null })}
        />
      )}
      {latexPopover.open && (
        <LatexEditorPopover
          x={latexPopover.x}
          y={latexPopover.y}
          initialValue={latexPopover.initialValue}
          onInsert={handleLatexInsert}
          onClose={() => setLatexPopover((s) => ({ ...s, open: false, editingElementId: null, initialValue: '' }))}
        />
      )}
    </div>
  );
}
