'use client';
import * as React from 'react';
import { Scene3D, type SceneSnapshot } from './scene/Scene3D';
import { ToolController } from './tools/controller';
import { JxgRenderer } from './renderer/JxgRenderer';
import { hitTest } from './hitTest/hitTest';
import { hitToConstraint } from './tools/handlers/_ensurePoint';
import { constraintToWorld } from './scene/constraintMath';
import { LeftPanel } from './LeftPanel';
import { MiniBoard3D, type MiniBoard3DHandle } from './MiniBoard3D';
import { StatusHint } from './StatusHint';
import type { ToolKey } from './tools/spec';
import type { SerializedBoard3D } from '../serialize';
import { sceneToBoard, boardToScene } from './scene/persistence';

export interface EditorPanelProps {
  isDark?: boolean;
  initialState?: SerializedBoard3D | null;
  onInsert?: (board: SerializedBoard3D, svgWidth: number, svgHeight: number, svgString: string) => void;
  onClose?: () => void;
}

export interface EditorPanelHandle {
  hasContent: () => boolean;
  /** Returns the current scene as a SerializedBoard3D. */
  serialize: () => SerializedBoard3D;
}

export const EditorPanel = React.forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    const isDark = props.isDark ?? false;
    const sceneRef = React.useRef<Scene3D | null>(null);
    if (!sceneRef.current) sceneRef.current = new Scene3D();
    const scene = sceneRef.current;
    const controllerRef = React.useRef<ToolController | null>(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(scene);

    const [selectedTool, setSelectedTool] = React.useState<ToolKey>('move');
    const [hint, setHint] = React.useState<string>('Chọn công cụ trong bảng bên trái');
    const [hoverLabel, setHoverLabel] = React.useState<string | null>(null);
    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);

    const boardRef = React.useRef<MiniBoard3DHandle | null>(null);
    const rendererRef = React.useRef<JxgRenderer | null>(null);

    // Drag state refs — track point being dragged for undo checkpoint.
    const draggedPointRef = React.useRef<string | null>(null);
    const dragStartRef = React.useRef<{ screen: { x: number; y: number }; world: [number, number, number] } | null>(null);
    const dragSnapshotRef = React.useRef<SceneSnapshot | null>(null);

    // Initial state load — wrap in withoutHistory so loading doesn't pollute undo stack.
    React.useEffect(() => {
      if (props.initialState) {
        const loaded = boardToScene(props.initialState);
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
        setSelectedTool(state.tool?.key ?? 'move');
      });
      return unsub;
    }, []);

    // Subscribe to history changes to update canUndo/canRedo.
    React.useEffect(() => {
      const unsub = scene.onHistoryChange(() => {
        setCanUndo(scene.canUndo());
        setCanRedo(scene.canRedo());
      });
      return unsub;
    }, [scene]);

    // Dispose renderer on unmount.
    React.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    }, []);

    const handleView3DReady = React.useCallback((view: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rendererRef.current = new JxgRenderer(scene, view as any);
    }, [scene]);

    /**
     * Attempt to begin a drag gesture. Returns true if this pointerdown should be
     * treated as the start of a drag (and click/tool processing should be skipped).
     * Captures a scene snapshot for undo before any mutation occurs.
     */
    const shouldStartPointDrag = React.useCallback(
      (screen: { x: number; y: number }): boolean => {
        const board = boardRef.current;
        if (!board) return false;
        const view = board.getView3D();
        if (!view) return false;

        let hit;
        try {
          hit = hitTest(screen, view, scene);
        } catch {
          return false;
        }

        const tool = controllerRef.current?.getState().tool?.key ?? 'move';

        // Branch 1 — drag an existing point (only when move tool is active, so that
        // other tools can still consume existingPoint hits via consumeHit).
        if (hit.kind === 'existingPoint' && tool === 'move') {
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

        // Branch 2 — place-and-lift: point tool clicking on ground or axis.
        // Capture snapshot before creation, use withoutHistory to suppress auto-capture
        // inside addPoint — drag-end will push one checkpoint for the whole gesture.
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

        // Branch 3 — point tool but non-placeable hit (no state change, no snapshot).
        if (tool === 'point') {
          dragSnapshotRef.current = null;
          draggedPointRef.current = null;
          dragStartRef.current = null;
          return true;
        }

        return false;
      },
      [scene],
    );

    const handleClick = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;

      // If a drag gesture started, skip normal click/tool processing.
      if (shouldStartPointDrag(screen)) return;

      try {
        const hit = hitTest(screen, view, scene);
        controllerRef.current!.consumeHit(hit);
      } catch {
        /* swallow — view may not yet expose project3DTo2D in some mock paths */
      }
    }, [scene, shouldStartPointDrag]);

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
        hasContent: () => (scene.list().length ?? 0) > 0,
        serialize: () => {
          const view = boardRef.current?.getView3D();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          const azimuth = typeof v?.az?.Value === 'function' ? v.az.Value() : 0;
          const elevation = typeof v?.el?.Value === 'function' ? v.el.Value() : 0;
          return sceneToBoard(
            scene,
            { azimuth, elevation, bbox3D: [-5, -5, -5, 5, 5, 5] },
            [-6, -6, 6, 6],
          );
        },
      }),
      [],
    );

    return (
      <div
        data-testid="editor-panel-3d"
        className={[
          isDark ? 'theme--dark ' : '',
          'flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950',
        ].join('')}
      >
        <LeftPanel
          scene={scene}
          selectedTool={selectedTool}
          onSelectTool={(k) => controllerRef.current!.selectTool(k)}
          onUndo={() => { scene.undo(); }}
          canUndo={canUndo}
          onRedo={() => { scene.redo(); }}
          canRedo={canRedo}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MiniBoard3D
              ref={boardRef}
              isDark={isDark}
              onView3DReady={handleView3DReady}
              onPointerClick={handleClick}
              onPointerMove={handleMove}
              onPointerLeave={() => setHoverLabel(null)}
              onPointerDragEnd={onPointerDragEnd}
            />
          </div>
          <StatusHint hint={hint} hoverLabel={hoverLabel} />
        </div>
      </div>
    );
  },
);
