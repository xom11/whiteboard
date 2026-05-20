'use client';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { JSXGraphMiniBoard, type MiniBoardHandle, type GeomTool, type ObjectSnapshot, type TransformPopoverInfo } from './MiniBoard';
import { serializeBoard, type SerializedBoard } from '../serialize';
import { renderGeometrySvgFromState } from '../render';
import { PropertiesPopover } from './PropertiesPopover';
import { TransformParamPopover } from './TransformParamPopover';
import { UndoIcon, RedoIcon } from './LeftPanel';
import { ObjectListPanel } from '../../../core/scene/ui/ObjectListPanel';
import type { Store } from '../../../core/scene/store';

interface Props {
  initialState: SerializedBoard | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  /** Khi true, panel position offset left để chừa chỗ cho StampLeftPanel (240px). */
  withLeftPanel?: boolean;
  /** Callback khi handle/state thay đổi — parent sync LeftPanel state. */
  onStateChange?: (state: GeomBoardState) => void;
  isDark?: boolean;
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Click hamburger trên mobile để mở LeftPanel drawer. */
  onOpenDrawer?: () => void;
  /** Mobile header: undo/redo. Bypass LeftPanel để user truy cập nhanh. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export interface GeomBoardState {
  tool: GeomTool;
  showAxis: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface GeometryEditorPanelHandle {
  setTool: (t: GeomTool) => void;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  redo: () => void;
  /** Trigger Chèn programmatically (cho auto-insert khi click outside). */
  insert: () => boolean;
  /** Có nội dung để chèn không? */
  hasContent: () => boolean;
}

export const GeometryEditorPanel = forwardRef<GeometryEditorPanelHandle, Props>(
  function GeometryEditorPanel({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark, isMobile = false, onOpenDrawer, onUndo, onRedo, canUndo, canRedo }, ref) {
    const handleRef = useRef<MiniBoardHandle | null>(null);
    const [ready, setReady] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const sceneStoreRef = useRef<Store | null>(null);
    const [propsPopover, setPropsPopover] = useState<ObjectSnapshot | null>(null);
    // Handlers emit cả 6 transform tool (rotate/dilate/regularPolygon/translate/
    // reflectLine/reflectPoint); TransformParamPopover chỉ render 3 tool có
    // numeric param — guard ở chỗ render.
    const [transformPopover, setTransformPopover] = useState<TransformPopoverInfo>(null);
    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

    const emitState = useCallback(() => {
      const h = handleRef.current;
      if (!h) return;
      setHasContent(Object.keys(h.getState().objects).length > 0);
      const cb = onStateChangeRef.current;
      if (!cb) return;
      cb({
        tool: h.getTool(),
        showAxis: h.getShowAxis(),
        showGrid: h.getShowGrid(),
        canUndo: h.canUndo(),
        canRedo: h.canRedo(),
      });
    }, []);

    const handleReady = useCallback((h: MiniBoardHandle) => {
      handleRef.current = h;
      sceneStoreRef.current = h.getStore();
      setReady(true);
      emitState();
      // Subscribe để parent biết khi nào tool/axis/grid/undo thay đổi
      h.subscribe(emitState);
      h.onSelect((snap: ObjectSnapshot) => setPropsPopover(snap));
      h.onTransformParam((info) => setTransformPopover(info));
    }, [emitState]);

    // Build serialized state (format v2) — async vì SVG render offscreen
    // với light palette để Excalidraw filter tự đảo khi dark mode.
    const performInsert = useCallback((): boolean => {
      if (!handleRef.current) return false;
      const h = handleRef.current;
      const state = h.getState();
      if (Object.keys(state.objects).length === 0) return false;
      const bbox = h.getBbox();
      const showAxis = h.getShowAxis();
      const showGrid = h.getShowGrid();
      const serialized = serializeBoard(bbox, state, { showAxis, showGrid });
      const jsonState = JSON.stringify(serialized);
      // Fire-and-forget. Caller (`tryInsert`) chỉ cần biết có nội dung không.
      void (async () => {
        try {
          const svgString = await renderGeometrySvgFromState(jsonState);
          onInsert(jsonState, svgString);
        } catch (err) {
          console.error('Geometry insert failed:', err);
        }
      })();
      return true;
    }, [onInsert]);

    const handleInsert = useCallback(() => {
      performInsert();
    }, [performInsert]);

    useImperativeHandle(ref, () => ({
      setTool: (t) => handleRef.current?.setTool(t),
      setShowAxis: (b) => handleRef.current?.setShowAxis(b),
      setShowGrid: (b) => handleRef.current?.setShowGrid(b),
      undo: () => handleRef.current?.undo(),
      redo: () => handleRef.current?.redo(),
      insert: performInsert,
      hasContent: () => Object.keys(handleRef.current?.getState().objects ?? {}).length > 0,
    }), [performInsert]);

    function handleSelectObject(id: string) {
      setSelectedId(id);
      // highlight: JxgRenderer is internal to MiniBoard; no direct renderer ref here.
      // Visual highlight deferred to future refactor when MiniBoard exposes renderer.
    }

    const wrapperStyle: React.CSSProperties = isMobile
      ? { position: 'fixed', inset: 0, zIndex: 40 }
      : {
          position: 'absolute',
          top: '50%',
          left: withLeftPanel ? 'calc(50% + 120px)' : '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
        };

    return (
      <div
        role="dialog"
        aria-label="Dựng hình học"
        data-testid="geometry-editor-panel"
        data-stamp-area="true"
        data-mobile-editor={isMobile ? 'true' : undefined}
        style={wrapperStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'flex flex-col overflow-hidden bg-white',
          isMobile
            ? 'h-full w-full'
            : 'h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5',
        ].join(' ')}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
          {isMobile && (
            <button
              type="button"
              onClick={onOpenDrawer}
              aria-label="Mở ngăn công cụ"
              className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          )}
          <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3,18 12,3 21,18" />
              <circle cx="12" cy="3" r="1.5" fill="currentColor" />
              <circle cx="3" cy="18" r="1.5" fill="currentColor" />
              <circle cx="21" cy="18" r="1.5" fill="currentColor" />
            </svg>
            Dựng hình học
          </h3>
          {isMobile && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Hoàn tác"
                title="Hoàn tác (Ctrl/Cmd+Z)"
                data-testid="undo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <UndoIcon />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Làm lại"
                title="Làm lại (Ctrl/Cmd+Shift+Z)"
                data-testid="redo-btn-mobile"
                className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15 disabled:opacity-40"
              >
                <RedoIcon />
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geometry-insert-btn-mobile"
                className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
              >
                Chèn
              </button>
            </>
          )}
          <button onClick={onClose} aria-label="Đóng" className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1" style={isMobile ? undefined : { height: '420px' }}>
          <div className="flex-1">
            <JSXGraphMiniBoard
              onReady={handleReady}
              initialState={initialState}
              isDark={isDark}
            />
          </div>
          {sceneStoreRef.current && (
            <div className="w-56 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto">
              <ObjectListPanel
                store={sceneStoreRef.current}
                selectedId={selectedId}
                onSelect={handleSelectObject}
              />
            </div>
          )}
        </div>
        {propsPopover && (
          propsPopover.kind === 'point' ? (
            <PropertiesPopover
              kind="point"
              anchor={propsPopover.screenCoords}
              isDark={isDark}
              currentName={propsPopover.name}
              currentColor={propsPopover.color}
              currentDash={propsPopover.dash}
              currentWidth={propsPopover.width}
              currentFace={propsPopover.face}
              currentShowLabel={propsPopover.showLabel}
              getAllNames={() => handleRef.current?.getAllPointNames() ?? []}
              onClose={() => setPropsPopover(null)}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.id, patch);
                if (patch.remove) setPropsPopover(null);
                // Refresh snapshot để UI checkbox phản ánh state mới
                if (typeof patch.valueLabel === 'boolean' || patch.attrs) {
                  setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                }
              }}
            />
          ) : (
            <PropertiesPopover
              kind={propsPopover.kind}
              anchor={propsPopover.screenCoords}
              isDark={isDark}
              currentName={propsPopover.name}
              currentColor={propsPopover.color}
              currentDash={propsPopover.dash}
              currentWidth={propsPopover.width}
              currentShowLabel={propsPopover.showLabel}
              currentShowValue={propsPopover.showValue}
              getAllNames={() => handleRef.current?.getAllPointNames() ?? []}
              onClose={() => setPropsPopover(null)}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.id, patch);
                if (patch.remove) setPropsPopover(null);
                if (typeof patch.valueLabel === 'boolean') {
                  setPropsPopover((cur) => cur ? { ...cur, showValue: patch.valueLabel ?? cur.showValue } : cur);
                }
                if (patch.attrs && 'withLabel' in patch.attrs) {
                  setPropsPopover((cur) => cur ? { ...cur, showLabel: !!patch.attrs?.withLabel } : cur);
                }
              }}
            />
          )
        )}

        {transformPopover && (transformPopover.tool === 'rotate' || transformPopover.tool === 'dilate' || transformPopover.tool === 'regularPolygon') && (
          <TransformParamPopover
            kind={transformPopover.tool}
            anchor={transformPopover.anchor}
            defaultValue={
              transformPopover.tool === 'rotate' ? 90
                : transformPopover.tool === 'dilate' ? 2
                : 6
            }
            isDark={isDark}
            onConfirm={(v) => { handleRef.current?.confirmTransformParam(v); setTransformPopover(null); }}
            onCancel={() => { handleRef.current?.cancelTransformParam(); setTransformPopover(null); }}
          />
        )}

        {!isMobile && (
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Chọn công cụ bên trái, click trên bảng để dựng hình.</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                onClick={handleInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geometry-insert-btn"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </footer>
        )}
      </div>
    );
  },
);
