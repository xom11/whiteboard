'use client';
import * as React from 'react';
import {
  createStore,
  createEmptyState,
  useEditorState,
  type Store,
  type State,
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
import {
  serializeBoard3D,
  type SerializedBoard3D,
  type SerializedView3D,
} from '../serialize';

export interface EditorPanelProps {
  isDark?: boolean;
  /** Initial state parsed from custom data (state + optional view orientation). */
  initialState?: { state: State; view?: SerializedView3D } | null;
  onInsert?: (board: SerializedBoard3D, svgWidth: number, svgHeight: number, svgString: string) => void;
  /** Store created by host (so LeftPanel sibling can share it). */
  store: Store;
  /** Currently selected tool — controlled by host. */
  selectedTool: ToolKey;
  /** Host gets notified when the controller switches the active tool. */
  onSelectedToolChange: (k: ToolKey) => void;
  showAxis: boolean;
  showGrid: boolean;
  onReadyChange?: (ready: boolean) => void;
  /** Notifies the host when undo/redo availability changes (for wiring buttons). */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface EditorPanelHandle {
  hasContent: () => boolean;
  serialize: () => SerializedBoard3D;
  setTool: (k: ToolKey) => void;
  undo: () => void;
  redo: () => void;
  highlight: (id: string | null) => void;
}

export const EditorPanel = React.forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    const {
      isDark: isDarkProp,
      initialState,
      store,
      selectedTool,
      onSelectedToolChange,
      showAxis,
      showGrid,
      onReadyChange,
      onHistoryChange,
    } = props;
    const isDark = isDarkProp ?? false;

    const controllerRef = React.useRef<ToolController | null>(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(store);

    const [hint, setHint] = React.useState<string>('Chọn công cụ trong bảng bên trái');
    const [hoverLabel, setHoverLabel] = React.useState<string | null>(null);

    const boardRef = React.useRef<MiniBoard3DHandle | null>(null);
    const rendererRef = React.useRef<JxgRenderer3D | null>(null);
    const previewRef = React.useRef<Preview3DManager | null>(null);
    const lastHoverHitRef = React.useRef<import('./hitTest/hitTest').SceneHit>({ kind: 'empty' });

    const onSelectedToolChangeRef = React.useRef(onSelectedToolChange);
    onSelectedToolChangeRef.current = onSelectedToolChange;

    const selectedToolRef = React.useRef(selectedTool);
    selectedToolRef.current = selectedTool;

    useEditorState({ store, initialState, onHistoryChange });

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

    // Clear preview khi controller reset (tool switch, build complete, cancel).
    // Re-runs trên mỗi notify — sau consumeHit/consumeNumber sẽ redraw với
    // collected count mới ở pointer move kế tiếp.
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
          // GeoGebra-style: chỉ XY ground plane hiện; side walls ẩn.
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
      // Restore saved azimuth/elevation khi re-edit stamp cũ, để editor view
      // khớp với ảnh đã chèn.
      const savedView = initialState?.view;
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
      onReadyChange?.(true);
    }, [onReadyChange, store, initialState]);

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

    React.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => Object.keys(store.getState().objects).length > 0,
        serialize: () => serializeBoard3D(store.getState(), getView3DInfo(boardRef.current?.getView3D())),
        setTool: (k) => controllerRef.current!.selectTool(k),
        undo: () => store.undo(),
        redo: () => store.redo(),
        highlight: (id) => rendererRef.current?.highlight(id),
      }),
      [store],
    );

    return (
      <div
        data-testid="editor-panel-3d"
        className={[
          isDark ? 'theme--dark ' : '',
          'flex h-full w-full min-w-0 flex-col overflow-hidden bg-white',
        ].join('')}
      >
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
          />
        </div>
        <StatusHint hint={hint} hoverLabel={hoverLabel} />
      </div>
    );
  },
);

// Re-export cho consumer test cần inject store; host owns instance thật.
export { createStore, createEmptyState };
