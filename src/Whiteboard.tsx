'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExcalidrawElement,
  BinaryFiles,
  ExcalidrawSceneSnapshot,
} from './types';
import {
  DEFAULT_STAMPS,
  findStampForCustomData,
  type StampType,
} from './stamps/shared/registry';
import { ToolbarInjector } from './stamps/shared/ToolbarInjector';
import { useShortcuts } from './stamps/shared/useShortcuts';
import { PdfImporterButton } from './pdf/PdfImporterButton';
import { PageRangeDialog } from './pdf/PageRangeDialog';
import { PropsPanelToggle } from './ui/PropsPanelToggle';
import { ToolbarDragger } from './ui/ToolbarDragger';
import { useToolbarPosition } from './ui/useToolbarPosition';
import { toolbarPositionAttr } from './ui/toolbarPosition';
import { useIsMobile } from './stamps/shared/useIsMobile';
import { useStampDoubleClick } from './stamps/shared/useStampDoubleClick';
import { useStampShortcutBlocker } from './stamps/shared/useStampShortcutBlocker';
import { useStampClickOutside } from './stamps/shared/useStampClickOutside';
import type { GenerateGeometryFigure, StampHostHandle } from './stamps/shared/types';
import type { GeometryDraftPreview } from './stamps/shared/draftTypes';
import { useExcalidrawApi } from './hooks/useExcalidrawApi';
import { useActiveStamp } from './hooks/useActiveStamp';
import { usePdfImporter } from './hooks/usePdfImporter';
import { useScenePersist } from './hooks/useScenePersist';
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

  /**
   * Snapshot từ server. Precedence: `initialScene` > localStorage > blank.
   * - `undefined` (default) → đọc từ localStorage qua `storageKey`
   * - `null` → explicit blank, bỏ qua localStorage
   * - object → dùng làm initialData của Excalidraw, bỏ qua localStorage
   *
   * Dùng để load board từ server. Thường đi cùng `storageKey={null}` để
   * tránh localStorage stale override server data.
   */
  initialScene?: ExcalidrawSceneSnapshot | null;

  /**
   * Binary files (raster, base64) từ server. Add vào Excalidraw đúng 1 lần
   * khi api ready. Dùng kèm `initialScene` cho flow load-from-server.
   * Nếu cần inject files động về sau, dùng `onApi` rồi gọi `api.addFiles`.
   */
  initialFiles?: BinaryFiles;

  /**
   * Opt-in bridge for the geometry editor AI prompt. This callback should call
   * `generateFigure()` on a server boundary so API credentials never reach the browser.
   */
  generateGeometryFigure?: GenerateGeometryFigure;
  /**
   * Geometry-2d live draft. GV: package gọi callback này (debounced) với SVG hình
   * đang dựng + vị trí chèn; `null` khi clear. Consumer broadcast cho học sinh.
   */
  onGeometryDraft?: (draft: GeometryDraftPreview | null) => void;
}

export function Whiteboard({
  storageKey = 'default',
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = 'vi-VN',
  stamps = DEFAULT_STAMPS,
  initialScene,
  initialFiles,
  generateGeometryFigure,
  onGeometryDraft,
}: WhiteboardProps) {
  const { api, apiRef, isDark, setApiFromExcalidraw, syncThemeFromAppState } =
    useExcalidrawApi({ onApi });

  const {
    activeStamp,
    editingElement,
    HostComponent,
    openStamp,
    closeStamp,
    toggleStampByKind,
  } = useActiveStamp({ readOnly, stamps });

  const {
    pdfPending,
    pdfBusy,
    handlePdfPick,
    handlePdfConfirm,
    handlePdfCancel,
  } = usePdfImporter({ readOnly, api });

  const { effectiveInitialScene, onSceneTick } = useScenePersist({
    storageKey,
    initialScene,
    initialFiles,
    readOnly,
    onSceneChange,
    onFilesChange,
    api,
    apiRef,
    stamps,
  });

  // Thu gọn panel thuộc tính của Excalidraw (issue hoctotbachkhoa#528).
  // Cố ý KHÔNG persist: mỗi lần vào bảng panel hiện lại như cũ.
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const togglePropsPanel = useCallback(() => {
    setPropsCollapsed((v) => !v);
  }, []);

  // Vị trí thanh công cụ chính (kéo-thả + hít mép). Tắt ở readOnly (view
  // mode đổi `.App-menu` sang display:flex) và mobile (Excalidraw dùng
  // `.App-bottom-bar`, layout khác hẳn).
  const { isMobile } = useIsMobile();
  const toolbarDragEnabled = !readOnly && !isMobile;
  const { position: toolbarPosition, setPosition: setToolbarPosition } =
    useToolbarPosition();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hostRef = useRef<StampHostHandle | null>(null);
  const handledCropIdRef = useRef<string | null>(null);
  const prevExcalidrawToolRef = useRef<string>('selection');

  // Capture local changes: theme sync → crop intercept (re-edit) → persist tick.
  const handleChange = useCallback(
     
    (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
      syncThemeFromAppState(appState);

      if (readOnly) return;

      // Intercept Excalidraw crop-image flow cho stamps: khi user double-click
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
            // Defer updateScene + openStamp ra khỏi commit-phase của Excalidraw —
            // chạy đồng bộ sẽ trigger React 19 warn "update scheduled from inside
            // an update function" (handleChange chạy trong updater).
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

      onSceneTick(elements, appState, files);
    },
    [readOnly, api, stamps, openStamp, syncThemeFromAppState, onSceneTick],
  );

  // Double-click detection for re-edit.
  const handlePointerDown = useStampDoubleClick({
    enabled: !readOnly,
    stamps,
    onOpen: openStamp,
  });

  // Keyboard shortcuts: đọc registry, mỗi stamp tự khai báo phím tắt.
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps,
  });

  // Sync Excalidraw activeTool với activeStamp.
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
         
        api.setActiveTool?.({ type: prevExcalidrawToolRef.current as any });
      } catch { /* ignore */ }
    }
  }, [activeStamp, api]);

  // Block Excalidraw shortcuts khi stamp panel đang mở.
  useStampShortcutBlocker({ activeStamp, stamps });

  // Esc đóng panel (capture phase để chạy TRƯỚC Excalidraw).
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

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full${isDark ? ' theme--dark' : ''}${
        propsCollapsed ? ' wb-props-collapsed' : ''
      }`}
      data-wb-toolbar={
        toolbarDragEnabled ? toolbarPositionAttr(toolbarPosition) : undefined
      }
    >
      <Suspense fallback={<ExcalidrawLoadingFallback />}>
        <Excalidraw
          excalidrawAPI={setApiFromExcalidraw}
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

      <PropsPanelToggle
        enabled={!readOnly}
        collapsed={propsCollapsed}
        onToggle={togglePropsPanel}
      />

      <ToolbarDragger
        enabled={toolbarDragEnabled}
        position={toolbarPosition}
        onChange={setToolbarPosition}
        containerRef={rootRef}
      />

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
          isDark={isDark}
          generateGeometryFigure={generateGeometryFigure}
          onGeometryDraft={onGeometryDraft}
        />
      )}
    </div>
  );
}
