'use client';
import * as React from 'react';
import { Scene3D } from './scene/Scene3D';
import { ToolController } from './tools/controller';
import { JxgRenderer } from './renderer/JxgRenderer';
import { hitTest } from './hitTest/hitTest';
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
    const controllerRef = React.useRef<ToolController | null>(null);
    if (!controllerRef.current) controllerRef.current = new ToolController(sceneRef.current);

    const [selectedTool, setSelectedTool] = React.useState<ToolKey>('move');
    const [hint, setHint] = React.useState<string>('Chọn công cụ trong bảng bên trái');
    const [hoverLabel, setHoverLabel] = React.useState<string | null>(null);

    const boardRef = React.useRef<MiniBoard3DHandle | null>(null);
    const rendererRef = React.useRef<JxgRenderer | null>(null);

    // Initial state load (Phase 7 — currently a stub returning empty scene).
    React.useEffect(() => {
      if (props.initialState && sceneRef.current) {
        const loaded = boardToScene(props.initialState);
        sceneRef.current.reset();
        for (const obj of loaded.list()) {
          sceneRef.current.insert(obj);
        }
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

    // Dispose renderer on unmount.
    React.useEffect(() => {
      return () => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    }, []);

    const handleView3DReady = React.useCallback((view: unknown) => {
      if (!sceneRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rendererRef.current = new JxgRenderer(sceneRef.current, view as any);
    }, []);

    const handleClick = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      try {
        const hit = hitTest(screen, view, sceneRef.current!);
        controllerRef.current!.consumeHit(hit);
      } catch {
        /* swallow — view may not yet expose project3DTo2D in some mock paths */
      }
    }, []);

    const handleMove = React.useCallback((screen: { x: number; y: number }) => {
      const board = boardRef.current;
      if (!board) return;
      const view = board.getView3D();
      if (!view) return;
      let hit;
      try {
        hit = hitTest(screen, view, sceneRef.current!);
      } catch {
        setHoverLabel(null);
        return;
      }
      if (hit.kind === 'empty') setHoverLabel(null);
      else if (hit.kind === 'existingPoint') {
        const obj = sceneRef.current!.get(hit.pointId);
        setHoverLabel(obj?.label ?? null);
      } else if (hit.kind === 'onGround') setHoverLabel('mặt nền');
      else if (hit.kind === 'onAxis') setHoverLabel(`trục ${hit.axis.toUpperCase()}`);
      else if (hit.kind === 'onPlane') setHoverLabel(`mặt phẳng ${hit.planeId}`);
      else if (hit.kind === 'onSphere') setHoverLabel(`mặt cầu ${hit.sphereId}`);
      else setHoverLabel(null);
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        hasContent: () => (sceneRef.current?.list().length ?? 0) > 0,
        serialize: () => {
          const view = boardRef.current?.getView3D();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = view as any;
          const azimuth = typeof v?.az?.Value === 'function' ? v.az.Value() : 0;
          const elevation = typeof v?.el?.Value === 'function' ? v.el.Value() : 0;
          return sceneToBoard(
            sceneRef.current!,
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
          scene={sceneRef.current!}
          selectedTool={selectedTool}
          onSelectTool={(k) => controllerRef.current!.selectTool(k)}
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
            />
          </div>
          <StatusHint hint={hint} hoverLabel={hoverLabel} />
        </div>
      </div>
    );
  },
);
