'use client';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { JSXGraphMiniBoard, type MiniBoardHandle, type GeomTool, type ObjectSnapshot } from './JSXGraphMiniBoard';
import { serializeBoard, type SerializedBoard } from './serializeBoard';
import { renderGeometryToSvg } from './renderGeometryToSvg';
import { PropertiesPopover } from './PropertiesPopover';
import { TransformParamPopover } from './TransformParamPopover';

interface Props {
  initialState: SerializedBoard | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  /** Khi true, panel position offset left để chừa chỗ cho StampLeftPanel (240px). */
  withLeftPanel?: boolean;
  /** Callback khi handle/state thay đổi — parent sync LeftPanel state. */
  onStateChange?: (state: GeomBoardState) => void;
  isDark?: boolean;
}

export interface GeomBoardState {
  tool: GeomTool;
  showAxis: boolean;
  showGrid: boolean;
  canUndo: boolean;
}

export interface GeometryEditorPanelHandle {
  setTool: (t: GeomTool) => void;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  /** Trigger Chèn programmatically (cho auto-insert khi click outside). */
  insert: () => boolean;
  /** Có nội dung để chèn không? */
  hasContent: () => boolean;
}

export const GeometryEditorPanel = forwardRef<GeometryEditorPanelHandle, Props>(
  function GeometryEditorPanel({ initialState, onInsert, onClose, withLeftPanel = false, onStateChange, isDark }, ref) {
    const handleRef = useRef<MiniBoardHandle | null>(null);
    const [ready, setReady] = useState(false);
    const [propsPopover, setPropsPopover] = useState<ObjectSnapshot | null>(null);
    const [transformPopover, setTransformPopover] = useState<{ tool: 'rotate' | 'dilate' | 'regularPolygon'; anchor: { x: number; y: number } } | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

    const emitState = useCallback(() => {
      const h = handleRef.current;
      const cb = onStateChangeRef.current;
      if (!h || !cb) return;
      cb({
        tool: h.getTool(),
        showAxis: h.getShowAxis(),
        showGrid: h.getShowGrid(),
        canUndo: h.canUndo(),
      });
    }, []);

    const handleReady = useCallback((h: MiniBoardHandle) => {
      handleRef.current = h;
      setReady(true);
      emitState();
      // Subscribe để parent biết khi nào tool/axis/grid/undo thay đổi
      h.subscribe(emitState);
      h.onSelect((snap: ObjectSnapshot) => setPropsPopover(snap));
      h.onTransformParam((info) => setTransformPopover(info));
    }, [emitState]);

    const performInsert = useCallback((): boolean => {
      if (!handleRef.current) return false;
      const container = handleRef.current.getContainer();
      if (!container) return false;
      const log = handleRef.current.getCreationLog();
      if (log.length === 0) return false;
      try {
        const svgString = renderGeometryToSvg(container);
        const bbox = handleRef.current.getBbox();
        const showAxis = handleRef.current.getShowAxis();
        const showGrid = handleRef.current.getShowGrid();
        const serialized = serializeBoard(
          { getBoundingBox: () => bbox, create: () => undefined },
          log,
          { showAxis, showGrid },
        );
        onInsert(JSON.stringify(serialized), svgString);
        return true;
      } catch (err) {
        console.error('Geometry insert failed:', err);
        return false;
      }
    }, [onInsert]);

    const handleInsert = useCallback(() => {
      performInsert();
    }, [performInsert]);

    useImperativeHandle(ref, () => ({
      setTool: (t) => handleRef.current?.setTool(t),
      setShowAxis: (b) => handleRef.current?.setShowAxis(b),
      setShowGrid: (b) => handleRef.current?.setShowGrid(b),
      undo: () => handleRef.current?.undo(),
      insert: performInsert,
      hasContent: () => (handleRef.current?.getCreationLog().length ?? 0) > 0,
    }), [performInsert]);

    const wrapperStyle: React.CSSProperties = {
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
        style={wrapperStyle}
        className={`${isDark ? 'theme--dark ' : ''}flex h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3,18 12,3 21,18" />
              <circle cx="12" cy="3" r="1.5" fill="currentColor" />
              <circle cx="3" cy="18" r="1.5" fill="currentColor" />
              <circle cx="21" cy="18" r="1.5" fill="currentColor" />
            </svg>
            Dựng hình học
          </h3>
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1 transition hover:bg-white/15">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1" style={{ height: '420px' }}>
          <JSXGraphMiniBoard
            onReady={handleReady}
            initialState={initialState}
          />
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
              getAllNames={() => handleRef.current?.getAllPointNames() ?? []}
              onClose={() => setPropsPopover(null)}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.obj, patch);
                if (patch.remove) setPropsPopover(null);
              }}
            />
          ) : (
            <PropertiesPopover
              kind={propsPopover.kind}
              anchor={propsPopover.screenCoords}
              isDark={isDark}
              currentColor={propsPopover.color}
              currentDash={propsPopover.dash}
              currentWidth={propsPopover.width}
              onClose={() => setPropsPopover(null)}
              onMutate={(patch) => {
                handleRef.current?.mutateObject(propsPopover.obj, patch);
                if (patch.remove) setPropsPopover(null);
              }}
            />
          )
        )}

        {transformPopover && (
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
              disabled={!ready}
              data-testid="geometry-insert-btn"
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Chèn
            </button>
          </div>
        </footer>
      </div>
    );
  },
);
