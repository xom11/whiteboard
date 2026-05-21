'use client';
/* eslint-disable max-lines -- TODO Tier B: extract sub-components/hooks (issue #30) */
import * as React from 'react';
import { createStore, createEmptyState, nextLabel, type Store, type State } from '../../../core/scene';
import { JxgRenderer3D } from '../../../core/scene/render/JxgRenderer3D';
import { ToolController } from './tools/controller';
import { hitTest } from './hitTest/hitTest';
import { screenToRay } from './hitTest/rayCast';
import { rayPlane } from './hitTest/intersect';
import { constraintToWorld, type Vec3 } from './scene/constraintMath';
import { hitToConstraint } from './tools/handlers/_ensurePoint';
import type { Constraint3D } from '../../../core/scene/kinds/3d-constraint';
import type { Point3DAttrs } from '../../../core/scene/kinds/point3d';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import { Preview3DManager } from './preview3d';
import { StatusHint } from './StatusHint';
import { DEFAULT_VIEW3D } from './theme';
import type { ToolKey } from './tools/spec';
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
  /** Returns the current scene as a SerializedBoard3D. */
  serialize: () => SerializedBoard3D;
  /** Select a tool by key (for chord shortcut / host control). */
  setTool: (k: ToolKey) => void;
  /** Trigger an undo on the store's history stack. */
  undo: () => void;
  /** Trigger a redo on the store's history stack. */
  redo: () => void;
  /** Highlight an object in the scene by id (null = clear). */
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

    const onHistoryChangeRef = React.useRef(onHistoryChange);
    onHistoryChangeRef.current = onHistoryChange;

    // Latest selectedTool — read inside drag callbacks to avoid stale closures.
    const selectedToolRef = React.useRef(selectedTool);
    selectedToolRef.current = selectedTool;

    // Point-drag state: which point is being dragged, starting screen + world,
    // plus a state snapshot captured before any mutation (used for undo
    // checkpoints on drag-end).
    const draggedPointRef = React.useRef<string | null>(null);
    const dragStartRef = React.useRef<{ screen: { x: number; y: number }; world: Vec3 } | null>(null);
    const dragSnapshotRef = React.useRef<State | null>(null);
    // Track whether we mutated state during drag so onPointerDragEnd knows
    // whether to push a manual checkpoint via LOAD-then-LOAD.
    const dragMutatedRef = React.useRef<boolean>(false);

    // Initial state load — wrap in withoutHistory so loading doesn't pollute
    // the undo stack with phantom "insert" entries.
    React.useEffect(() => {
      if (initialState?.state) {
        const loaded = initialState.state;
        store.withoutHistory(() => {
          store.dispatch({ type: 'LOAD', payload: { state: loaded } });
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Subscribe to controller state changes for hint + selected-tool updates.
    React.useEffect(() => {
      const ctrl = controllerRef.current!;
      const unsub = ctrl.on((state) => {
        setHint(state.hint);
        onSelectedToolChangeRef.current(state.tool?.key ?? 'move');
      });
      return unsub;
    }, []);

    // Subscribe to store changes — propagate canUndo/canRedo upward. Store's
    // subscribe fires on any state change which is a superset of history change
    // (undo/redo also mutates state).
    React.useEffect(() => {
      onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
      const unsub = store.subscribe(() => {
        onHistoryChangeRef.current?.(store.canUndo(), store.canRedo());
      });
      return unsub;
    }, [store]);

    // Sync controller when host changes selectedTool from outside (e.g. chord shortcut).
    React.useEffect(() => {
      controllerRef.current?.selectTool(selectedTool);
    }, [selectedTool]);

    // Global keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y.
    React.useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const ae = document.activeElement as HTMLElement | null;
        const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
        if (inField) return;
        if (!(e.metaKey || e.ctrlKey)) return;
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          store.undo();
        } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          store.redo();
        }
      };
      window.addEventListener('keydown', onKey, { capture: true });
      return () => window.removeEventListener('keydown', onKey, { capture: true });
    }, [store]);

    // Dispose renderer + preview on unmount.
    React.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
        previewRef.current?.dispose();
        previewRef.current = null;
      };
    }, []);

    // Clear preview whenever the controller resets — tool switch, build
    // complete (collected → []), or cancel. Re-runs whenever the controller
    // notifies listeners, which covers consumeHit / consumeNumber too: after a
    // pick we redraw with the new collected count on the next pointer move.
    React.useEffect(() => {
      const controller = controllerRef.current;
      if (!controller) return;
      return controller.on((state) => {
        if (!previewRef.current) return;
        if (state.collected.length === 0) previewRef.current.clear();
        else previewRef.current.update(state.tool?.key ?? null, state.collected, lastHoverHitRef.current);
      });
    }, []);

    // Apply showAxis / showGrid to the JSXGraph view3d when it (or the state) changes.
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
          // GeoGebra-style: only the XY ground plane is shown; side walls stay hidden.
          xPlaneRear: { visible: false, mesh3d: { visible: false } },
          yPlaneRear: { visible: false, mesh3d: { visible: false } },
          zPlaneRear: { visible: showGrid, mesh3d: { visible: false } },
        });
        v.board?.update?.();
      } catch {
        /* swallow — older JSXGraph / mocks may not support runtime attr changes */
      }
    }, [showAxis, showGrid]);

    const handleView3DReady = React.useCallback((view: unknown) => {
      rendererRef.current = new JxgRenderer3D(store, view);
      previewRef.current = new Preview3DManager(view, store);
      // Restore saved azimuth/elevation khi mở lại stamp cũ để re-edit, để
      // editor view khớp với ảnh đã chèn.
      const savedView = initialState?.view;
      if (savedView) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          v?.az_slide?.setValue?.(savedView.azimuth);
          v?.el_slide?.setValue?.(savedView.elevation);
          v?.board?.update?.();
        } catch {
          /* swallow — older JSXGraph may not expose az_slide */
        }
      }
      onReadyChange?.(true);
    }, [onReadyChange, store, initialState]);

    const handleClick = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      try {
        const hit = hitTest(screen, view, store.getState());
        controllerRef.current!.consumeHit(hit);
      } catch {
        /* swallow — view may not yet expose project3DTo2D in some mock paths */
      }
    }, [store]);

    const handleMove = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      // Suppress hover label updates while a drag is in progress.
      if (draggedPointRef.current) return;
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
      if (hit.kind === 'empty') setHoverLabel(null);
      else if (hit.kind === 'existingPoint') {
        const obj = store.getState().objects[hit.pointId];
        setHoverLabel(obj?.label ?? null);
      } else if (hit.kind === 'onGround') setHoverLabel('mặt nền');
      else if (hit.kind === 'onAxis') setHoverLabel(`trục ${hit.axis.toUpperCase()}`);
      else if (hit.kind === 'onPlane') setHoverLabel(`mặt phẳng ${hit.planeId}`);
      else if (hit.kind === 'onSphere') setHoverLabel(`mặt cầu ${hit.sphereId}`);
      else setHoverLabel(null);
    }, [store]);

    // ─── Point-drag handlers (delegated from MiniBoard3D) ────────────────────
    // Decides whether the pointerdown gesture is "ours" (drag/place a point)
    // or should fall through to MiniBoard3D's default view-rotate behaviour.
    // Returning true also suppresses view rotation for the rest of the gesture.
    // Captures a state snapshot before any mutation so onPointerDragEnd can
    // push a single undo checkpoint for the whole gesture.
    const shouldStartPointDrag = React.useCallback((screen: { x: number; y: number }): boolean => {
      const view = boardRef.current?.getView3D();
      if (!view) return false;
      const tool = selectedToolRef.current;
      if (tool !== 'point' && tool !== 'move') return false;
      let hit;
      try { hit = hitTest(screen, view, store.getState()); } catch { return false; }

      // Existing point: drag it (Z-only in Point mode, XY-raycast in Move mode).
      // Snapshot before any mutation, drag-end will push a checkpoint.
      if (hit.kind === 'existingPoint') {
        const pt = store.getState().objects[hit.pointId];
        if (!pt || pt.kind !== 'point3d') return false;
        dragSnapshotRef.current = store.getState();
        dragMutatedRef.current = false;
        draggedPointRef.current = hit.pointId;
        dragStartRef.current = {
          screen,
          world: constraintToWorld((pt.attrs as Point3DAttrs).constraint, store.getState()),
        };
        return true;
      }

      // Point tool: place-and-lift gesture. Capture snapshot first, then
      // create the point inside withoutHistory so only the drag-end checkpoint
      // ends up on the undo stack (otherwise addPoint would push an extra one).
      // Bypasses the controller (Point tool has repeatAfterBuild so there's no
      // collected-state to unwind); the click→consumeHit→buildPoint path is
      // short-circuited in MiniBoard3D.handlePointerUp when pointDragMode is set.
      if (tool === 'point' && (hit.kind === 'onGround' || hit.kind === 'onAxis')) {
        dragSnapshotRef.current = store.getState();
        dragMutatedRef.current = false;
        const constraint = hitToConstraint(hit);
        if (!constraint) {
          dragSnapshotRef.current = null;
          return false;
        }
        let id: string | null = null;
        store.withoutHistory(() => {
          // Inline addPoint so we can grab id from the dispatched obj.
          const stateBefore = store.getState();
          const newId = `p${stateBefore.counter + 1}`;
          const label = nextLabel(stateBefore, 'point3d');
          store.dispatch({
            type: 'ADD',
            payload: {
              obj: {
                id: newId,
                kind: 'point3d',
                label,
                visible: true,
                locked: false,
                layer: 'default',
                schemaVersion: 1,
                attrs: { constraint },
              },
            },
          });
          id = newId;
        });
        if (!id) {
          dragSnapshotRef.current = null;
          return false;
        }
        draggedPointRef.current = id;
        dragStartRef.current = {
          screen,
          world: [hit.world[0], hit.world[1], hit.world[2]],
        };
        return true;
      }

      // Point tool but non-placeable surface (sphere/plane/empty): suppress
      // view rotation so the camera never rotates accidentally while the user
      // is placing points, but don't enter a drag. Clear snapshot defensively.
      if (tool === 'point') {
        dragSnapshotRef.current = null;
        draggedPointRef.current = null;
        dragStartRef.current = null;
        return true;
      }

      return false;
    }, [store]);

    const onPointerDrag = React.useCallback((screen: { x: number; y: number }) => {
      const pointId = draggedPointRef.current;
      const start = dragStartRef.current;
      if (!pointId || !start) return;
      const view = boardRef.current?.getView3D();
      if (!view) return;
      const tool = selectedToolRef.current;
      let nextWorld: Vec3;
      if (tool === 'point') {
        // Vertical lift only: keep starting X,Y; map screen-Y delta to world Z
        // 1:1 in user-space (pixelToUser already inverts Y).
        const dz = screen.y - start.screen.y;
        nextWorld = [start.world[0], start.world[1], start.world[2] + dz];
      } else if (tool === 'move') {
        // Free move on the horizontal plane at the point's starting Z.
        try {
          const ray = screenToRay(screen, view);
          const hit = rayPlane(ray, { point: [0, 0, start.world[2]], normal: [0, 0, 1] });
          if (!hit) return;
          nextWorld = [hit.point[0], hit.point[1], start.world[2]];
        } catch { return; }
      } else {
        return;
      }
      const obj = store.getState().objects[pointId];
      if (!obj || obj.kind !== 'point3d') return;
      const free: Constraint3D = { kind: 'free', x: nextWorld[0], y: nextWorld[1], z: nextWorld[2] };
      // Mutate qua UPDATE_ATTRS — store sẽ fire subscribers, JxgRenderer3D
      // diff và update JSXGraph object. Wrap trong withoutHistory: drag-end
      // sẽ push một checkpoint duy nhất.
      store.withoutHistory(() => {
        store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: pointId, patch: { constraint: free } } });
      });
      dragMutatedRef.current = true;
    }, [store]);

    const onPointerDragEnd = React.useCallback(() => {
      const snap = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      draggedPointRef.current = null;
      dragStartRef.current = null;
      dragMutatedRef.current = false;
      // Push undo checkpoint cho cả 2 flow: click-only (ADD point inside
      // withoutHistory → cần checkpoint manual) và drag-and-lift (ADD +
      // UPDATE_ATTRS đều bị withoutHistory wrap → cùng cần). Net effect: 1
      // entry duy nhất trong past stack = snap → current. Nếu snap === current
      // (degenerate), 2 LOAD đều no-op, không push gì cả.
      if (snap) {
        const current = store.getState();
        store.withoutHistory(() => {
          store.dispatch({ type: 'LOAD', payload: { state: snap } });
        });
        store.dispatch({ type: 'LOAD', payload: { state: current } });
      }
    }, [store]);

    React.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => Object.keys(store.getState().objects).length > 0,
        serialize: () => {
          const view = boardRef.current?.getView3D();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          const azSlider = v?.az_slide ?? v?.az;
          const elSlider = v?.el_slide ?? v?.el;
          const azimuth = typeof azSlider?.Value === 'function' ? azSlider.Value() : 0;
          const elevation = typeof elSlider?.Value === 'function' ? elSlider.Value() : 0;
          const viewInfo: SerializedView3D = {
            azimuth,
            elevation,
            bbox3D: [...DEFAULT_VIEW3D.bbox3D] as [number, number, number, number, number, number],
          };
          return serializeBoard3D(store.getState(), viewInfo);
        },
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

// Suppress unused createStore import warning — only re-exported here for any
// consumer that wants to inject a test store; host owns the actual instance.
export { createStore, createEmptyState };
