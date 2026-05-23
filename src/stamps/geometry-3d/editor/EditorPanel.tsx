'use client';
import * as React from 'react';
import {
  useEditorState,
  type Store,
  type View3D,
} from '../../../core/scene';
import { JxgRenderer3D } from '../../../core/scene/render/JxgRenderer3D';
import { ToolController } from './tools/controller';
import { hitTest } from './hitTest/hitTest';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import { Preview3DManager } from './preview3d';
import { StatusHint } from './StatusHint';
import type { ToolKey } from './tools/spec';
import { usePointDrag } from './usePointDrag';
import { getView3DInfo, hitToHoverLabel } from './editorHelpers';
import { serializeBoard3D } from '../serialize';
import { renderGeometry3DSvgFromState } from '../render';
import { STAMP_PANEL_DESKTOP } from '../../shared/StampLeftPanel/constants';
import { ToastProvider, ToastHost } from '../../shared/Toast';

export interface EditorPanelProps {
  isDark?: boolean;
  /** Triggered after serialize + svg render — host wires Excalidraw insertion. */
  onInsert?: (jsonState: string, svgString: string) => void;
  /** Close dialog. Host has the lifecycle hook for "close + remove host". */
  onClose: () => void;
  /** Store created by host (so LeftPanel sibling can share it). */
  store: Store;
  /** Currently selected tool — controlled by host. */
  selectedTool: ToolKey;
  /** Host gets notified when the controller switches the active tool. */
  onSelectedToolChange: (k: ToolKey) => void;
  showAxis: boolean;
  showGrid: boolean;
  /** Notifies host của ready/canUndo/canRedo để host wire LeftPanel buttons. */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** Mobile mode: full-screen + hamburger header. */
  isMobile?: boolean;
  /** Mở mobile LeftPanel drawer (host owns drawer visibility). */
  onOpenDrawer?: () => void;
  /** Khi true, panel offset left để chừa chỗ cho LeftPanel (desktop). */
  withLeftPanel?: boolean;
}

export interface EditorPanelHandle {
  hasContent: () => boolean;
  /** Try to serialize + render + onInsert. Returns false nếu rỗng. */
  tryInsert: () => boolean;
  setTool: (k: ToolKey) => void;
  undo: () => void;
  redo: () => void;
  highlight: (id: string | null) => void;
}

const EditorPanelInner = React.forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    const {
      isDark: isDarkProp,
      onInsert,
      onClose,
      store,
      selectedTool,
      onSelectedToolChange,
      showAxis,
      showGrid,
      onHistoryChange,
      isMobile = false,
      onOpenDrawer,
      withLeftPanel = false,
    } = props;
    const isDark = isDarkProp ?? false;

    const controllerRef = React.useRef<ToolController | null>(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(store);

    const [hint, setHint] = React.useState<string>('Chọn công cụ trong bảng bên trái');
    const [hoverLabel, setHoverLabel] = React.useState<string | null>(null);
    const [ready, setReady] = React.useState(false);
    const [hasContent, setHasContent] = React.useState(false);

    const boardRef = React.useRef<MiniBoard3DHandle | null>(null);
    const rendererRef = React.useRef<JxgRenderer3D | null>(null);
    const previewRef = React.useRef<Preview3DManager | null>(null);
    const lastHoverHitRef = React.useRef<import('./hitTest/hitTest').SceneHit>({ kind: 'empty' });

    const onSelectedToolChangeRef = React.useRef(onSelectedToolChange);
    onSelectedToolChangeRef.current = onSelectedToolChange;

    const selectedToolRef = React.useRef(selectedTool);
    selectedToolRef.current = selectedTool;

    const onInsertRef = React.useRef(onInsert);
    onInsertRef.current = onInsert;

    // Hook đã pre-load state vào store qua parseInitialState3D — useEditorState
    // không cần initialState LOAD nữa. Vẫn dùng cho canUndo/canRedo propagate
    // + keyboard shortcuts.
    useEditorState({ store, onHistoryChange });

    const { shouldStartPointDrag, onPointerDrag, onPointerDragEnd, isDragging } = usePointDrag({
      store,
      boardRef,
      selectedToolRef,
    });

    React.useEffect(() => {
      const ctrl = controllerRef.current!;
      return ctrl.on((state) => {
        setHint(state.hint);
        onSelectedToolChangeRef.current(state.tool?.key ?? 'move');
      });
    }, []);

    React.useEffect(() => {
      controllerRef.current?.selectTool(selectedTool);
    }, [selectedTool]);

    React.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
        previewRef.current?.dispose();
        previewRef.current = null;
      };
    }, []);

    // hasContent: track store size để gate Insert button.
    React.useEffect(() => {
      const sync = (): void => setHasContent(Object.keys(store.getState().objects).length > 0);
      sync();
      return store.subscribe(sync);
    }, [store]);

    // Clear preview khi controller reset (tool switch, build complete, cancel).
    React.useEffect(() => {
      const controller = controllerRef.current;
      if (!controller) return;
      return controller.on((state) => {
        if (!previewRef.current) return;
        if (state.collected.length === 0) previewRef.current.clear();
        else previewRef.current.update(state.tool?.key ?? null, state.collected, lastHoverHitRef.current);
      });
    }, []);

    React.useEffect(() => {
      const view = boardRef.current?.getView3D();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = view as any;
      if (!v || typeof v.setAttribute !== 'function') return;
      try {
        v.setAttribute({
          xAxis: { visible: showAxis },
          yAxis: { visible: showAxis },
          zAxis: { visible: showAxis },
          xPlaneRear: { visible: false, mesh3d: { visible: false } },
          yPlaneRear: { visible: false, mesh3d: { visible: false } },
          zPlaneRear: { visible: showGrid, mesh3d: { visible: false } },
        });
        v.board?.update?.();
      } catch {
        /* swallow — JSXGraph cũ / mocks không support runtime attr changes */
      }
    }, [showAxis, showGrid]);

    const handleView3DReady = React.useCallback((view: unknown) => {
      rendererRef.current = new JxgRenderer3D(store, view);
      previewRef.current = new Preview3DManager(view, store);
      const meta = store.getState().meta;
      const savedView: View3D | null = meta.domain === '3d' ? meta.view : null;
      if (savedView) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          v?.az_slide?.setValue?.(savedView.azimuth);
          v?.el_slide?.setValue?.(savedView.elevation);
          v?.board?.update?.();
        } catch {
          /* swallow — JSXGraph cũ không expose az_slide */
        }
      }
      setReady(true);
    }, [store]);

    const handleClick = React.useCallback((screen: { x: number; y: number }) => {
      const view = boardRef.current?.getView3D();
      if (!view) return;
      try {
        const hit = hitTest(screen, view, store.getState());
        controllerRef.current!.consumeHit(hit);
      } catch {
        /* swallow — view có thể chưa expose project3DTo2D trong mock path */
      }
    }, [store]);

    const handleMove = React.useCallback((screen: { x: number; y: number }) => {
      const view = boardRef.current?.getView3D();
      if (!view) return;
      if (isDragging()) return;
      let hit;
      try {
        hit = hitTest(screen, view, store.getState());
      } catch {
        setHoverLabel(null);
        return;
      }
      lastHoverHitRef.current = hit;
      const ctrl = controllerRef.current;
      if (previewRef.current && ctrl) {
        const cs = ctrl.getState();
        previewRef.current.update(cs.tool?.key ?? null, cs.collected, hit);
      }
      setHoverLabel(hitToHoverLabel(hit, store.getState()));
    }, [store, isDragging]);

    // Cursor hover hit-test — reuse `hitTest()` đã có. SceneHit.kind === 'empty'
    // → không hover; else → hover (point/line/polygon/...). Try/catch để
    // tolerate mock environment khi view chưa expose project3DTo2D.
    const isHoveringObject = React.useCallback((screen: { x: number; y: number }): boolean => {
      const view = boardRef.current?.getView3D();
      if (!view) return false;
      try {
        return hitTest(screen, view, store.getState()).kind !== 'empty';
      } catch {
        return false;
      }
    }, [store]);

    const tryInsert = React.useCallback((): boolean => {
      const state = store.getState();
      if (Object.keys(state.objects).length === 0) return false;
      const view = getView3DInfo(boardRef.current?.getView3D());
      const jsonState = serializeBoard3D(state, view);
      void (async () => {
        try {
          const { svgString } = await renderGeometry3DSvgFromState(jsonState);
          onInsertRef.current?.(jsonState, svgString);
        } catch (err) {
          console.error('Geometry3D insert failed:', err);
        }
      })();
      return true;
    }, [store]);

    React.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => Object.keys(store.getState().objects).length > 0,
        tryInsert,
        setTool: (k) => controllerRef.current!.selectTool(k),
        undo: () => store.undo(),
        redo: () => store.redo(),
        highlight: (id) => rendererRef.current?.highlight(id),
      }),
      [store, tryInsert],
    );

    const dialogStyle: React.CSSProperties = isMobile
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
        aria-label="Dựng hình học 3D"
        data-testid="geom3d-host"
        data-stamp-area="true"
        style={dialogStyle}
        className={[
          isDark ? 'theme--dark ' : '',
          'relative flex flex-col overflow-hidden bg-white',
          isMobile
            ? 'h-full w-full'
            : `${STAMP_PANEL_DESKTOP} rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5`,
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
              <path d="M4 9 L4 20 L14 20 L14 9 Z M4 9 L10 4 L20 4 L14 9 Z M14 9 L20 4 L20 15 L14 20 Z" />
            </svg>
            Dựng hình học không gian
          </h3>
          {isMobile && (
            <button
              type="button"
              onClick={tryInsert}
              disabled={!ready || !hasContent}
              title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
              data-testid="geom3d-insert-btn-mobile"
              className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
            >
              Chèn
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <MiniBoard3D
            ref={boardRef}
            isDark={isDark}
            onView3DReady={handleView3DReady}
            onPointerClick={handleClick}
            onPointerMove={handleMove}
            onPointerLeave={() => {
              setHoverLabel(null);
              lastHoverHitRef.current = { kind: 'empty' };
              previewRef.current?.clear();
            }}
            shouldStartPointDrag={shouldStartPointDrag}
            onPointerDrag={onPointerDrag}
            onPointerDragEnd={onPointerDragEnd}
            isHoveringObject={isHoveringObject}
          />
        </div>
        <StatusHint hint={hint} hoverLabel={hoverLabel} />
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
                onClick={tryInsert}
                disabled={!ready || !hasContent}
                title={!hasContent ? 'Vẽ ít nhất một đối tượng trước khi chèn' : undefined}
                data-testid="geom3d-insert-btn"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Chèn
              </button>
            </div>
          </footer>
        )}
        <ToastHost />
      </div>
    );
  },
);

export const EditorPanel = React.forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    return (
      <ToastProvider>
        <EditorPanelInner {...props} ref={ref} />
      </ToastProvider>
    );
  },
);

// createStore / createEmptyState exported từ core/scene barrel.
