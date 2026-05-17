'use client';
import * as React from 'react';
import { Scene3D, type SceneSnapshot } from './scene/Scene3D';
import { ToolController } from './tools/controller';
import { JxgRenderer } from './renderer/JxgRenderer';
import { hitTest } from './hitTest/hitTest';
import { screenToRay } from './hitTest/rayCast';
import { rayPlane } from './hitTest/intersect';
import { constraintToWorld } from './scene/constraintMath';
import { hitToConstraint } from './tools/handlers/_ensurePoint';
import type { Constraint, Vec3 } from './scene/types';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import { StatusHint } from './StatusHint';
import type { ToolKey } from './tools/spec';
import type { SerializedBoard3D } from '../serialize';
import { sceneToBoard, boardToScene } from './scene/persistence';

export interface EditorPanelProps {
  isDark?: boolean;
  initialState?: SerializedBoard3D | null;
  onInsert?: (board: SerializedBoard3D, svgWidth: number, svgHeight: number, svgString: string) => void;
  /** Scene created by host (so LeftPanel sibling can share it). */
  scene: Scene3D;
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
  /** Trigger an undo on the scene's history stack. */
  undo: () => void;
  /** Trigger a redo on the scene's history stack. */
  redo: () => void;
}

export const EditorPanel = React.forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    const {
      isDark: isDarkProp,
      initialState,
      scene,
      selectedTool,
      onSelectedToolChange,
      showAxis,
      showGrid,
      onReadyChange,
      onHistoryChange,
    } = props;
    const isDark = isDarkProp ?? false;
    const controllerRef = React.useRef<ToolController | null>(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(scene);

    const [hint, setHint] = React.useState<string>('Chọn công cụ trong bảng bên trái');
    const [hoverLabel, setHoverLabel] = React.useState<string | null>(null);

    const boardRef = React.useRef<MiniBoard3DHandle | null>(null);
    const rendererRef = React.useRef<JxgRenderer | null>(null);

    const onSelectedToolChangeRef = React.useRef(onSelectedToolChange);
    onSelectedToolChangeRef.current = onSelectedToolChange;

    const onHistoryChangeRef = React.useRef(onHistoryChange);
    onHistoryChangeRef.current = onHistoryChange;

    // Latest selectedTool — read inside drag callbacks to avoid stale closures.
    const selectedToolRef = React.useRef(selectedTool);
    selectedToolRef.current = selectedTool;

    // Point-drag state: which point is being dragged, starting screen + world,
    // plus a scene snapshot captured before any mutation (used for undo
    // checkpoints on drag-end).
    const draggedPointRef = React.useRef<string | null>(null);
    const dragStartRef = React.useRef<{ screen: { x: number; y: number }; world: Vec3 } | null>(null);
    const dragSnapshotRef = React.useRef<SceneSnapshot | null>(null);

    // Initial state load — wrap in withoutHistory so loading doesn't pollute
    // the undo stack with phantom "insert" entries.
    React.useEffect(() => {
      if (initialState) {
        const loaded = boardToScene(initialState);
        scene.withoutHistory(() => {
          scene.reset();
          for (const obj of loaded.list()) {
            scene.insert(obj);
          }
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

    // Subscribe to history changes — propagate canUndo/canRedo upward.
    React.useEffect(() => {
      // Emit initial state once for the host's UI.
      onHistoryChangeRef.current?.(scene.canUndo(), scene.canRedo());
      const unsub = scene.onHistoryChange(() => {
        onHistoryChangeRef.current?.(scene.canUndo(), scene.canRedo());
      });
      return unsub;
    }, [scene]);

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
          scene.undo();
        } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          scene.redo();
        }
      };
      window.addEventListener('keydown', onKey, { capture: true });
      return () => window.removeEventListener('keydown', onKey, { capture: true });
    }, [scene]);

    // Dispose renderer on unmount.
    React.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rendererRef.current = new JxgRenderer(scene, view as any);
      onReadyChange?.(true);
    }, [onReadyChange, scene]);

    const handleClick = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      try {
        const hit = hitTest(screen, view, scene);
        controllerRef.current!.consumeHit(hit);
      } catch {
        /* swallow — view may not yet expose project3DTo2D in some mock paths */
      }
    }, [scene]);

    const handleMove = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      // Suppress hover label updates while a drag is in progress.
      if (draggedPointRef.current) return;
      let hit;
      try {
        hit = hitTest(screen, view, scene);
      } catch {
        setHoverLabel(null);
        return;
      }
      if (hit.kind === 'empty') setHoverLabel(null);
      else if (hit.kind === 'existingPoint') {
        const obj = scene.get(hit.pointId);
        setHoverLabel(obj?.label ?? null);
      } else if (hit.kind === 'onGround') setHoverLabel('mặt nền');
      else if (hit.kind === 'onAxis') setHoverLabel(`trục ${hit.axis.toUpperCase()}`);
      else if (hit.kind === 'onPlane') setHoverLabel(`mặt phẳng ${hit.planeId}`);
      else if (hit.kind === 'onSphere') setHoverLabel(`mặt cầu ${hit.sphereId}`);
      else setHoverLabel(null);
    }, [scene]);

    // ─── Point-drag handlers (delegated from MiniBoard3D) ────────────────────
    // Decides whether the pointerdown gesture is "ours" (drag/place a point)
    // or should fall through to MiniBoard3D's default view-rotate behaviour.
    // Returning true also suppresses view rotation for the rest of the gesture.
    // Captures a scene snapshot before any mutation so onPointerDragEnd can
    // push a single undo checkpoint for the whole gesture.
    const shouldStartPointDrag = React.useCallback((screen: { x: number; y: number }): boolean => {
      const view = boardRef.current?.getView3D();
      if (!view) return false;
      const tool = selectedToolRef.current;
      if (tool !== 'point' && tool !== 'move') return false;
      let hit;
      try { hit = hitTest(screen, view, scene); } catch { return false; }

      // Existing point: drag it (Z-only in Point mode, XY-raycast in Move mode).
      // Snapshot before any mutation, drag-end will push a checkpoint.
      if (hit.kind === 'existingPoint') {
        const pt = scene.get(hit.pointId);
        if (!pt || pt.kind !== 'point') return false;
        dragSnapshotRef.current = scene.snapshot();
        draggedPointRef.current = hit.pointId;
        dragStartRef.current = {
          screen,
          world: constraintToWorld(pt.constraint, scene),
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
        dragSnapshotRef.current = scene.snapshot();
        const constraint = hitToConstraint(hit);
        if (!constraint) {
          dragSnapshotRef.current = null;
          return false;
        }
        let id: string | null = null;
        scene.withoutHistory(() => {
          id = scene.addPoint(constraint);
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
    }, [scene]);

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
      const obj = scene.get(pointId);
      if (!obj || obj.kind !== 'point') return;
      const free: Constraint = { kind: 'free', x: nextWorld[0], y: nextWorld[1], z: nextWorld[2] };
      (obj as { constraint: Constraint }).constraint = free;
      scene.emitChange(pointId);
    }, [scene]);

    const onPointerDragEnd = React.useCallback(() => {
      const snap = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      draggedPointRef.current = null;
      dragStartRef.current = null;
      if (snap) {
        scene.pushUndoCheckpoint(snap);
      }
    }, [scene]);

    React.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => scene.list().length > 0,
        serialize: () => {
          const view = boardRef.current?.getView3D();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          const azSlider = v?.az_slide ?? v?.az;
          const elSlider = v?.el_slide ?? v?.el;
          const azimuth = typeof azSlider?.Value === 'function' ? azSlider.Value() : 0;
          const elevation = typeof elSlider?.Value === 'function' ? elSlider.Value() : 0;
          return sceneToBoard(
            scene,
            { azimuth, elevation, bbox3D: [-5, -5, -5, 5, 5, 5] },
            [-6, -6, 6, 6],
          );
        },
        setTool: (k) => controllerRef.current!.selectTool(k),
        undo: () => scene.undo(),
        redo: () => scene.redo(),
      }),
      [scene],
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
            onPointerLeave={() => setHoverLabel(null)}
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
