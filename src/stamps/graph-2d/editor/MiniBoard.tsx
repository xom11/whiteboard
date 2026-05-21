'use client';
// src/stamps/graph-2d/editor/MiniBoard.tsx
//
// JSXGraph mini-board cho graph-2d editor.
// Reuses the pattern from geometry-2d/editor/MiniBoard.tsx adapted for graph2d domain:
//  - createEmptyState('graph2d') instead of '2d'
//  - Init view from state.meta.view (default [-10, 10])
//  - getNearestFunctionId / findHitObject helpers for graph-specific hit-test
//  - Tools from TOOLS / GraphTool

import React, { useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  createEmptyState,
  nextLabel as sceneNextLabel,
  useSceneStore,
  type State,
} from '../../../core/scene';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import type { Store } from '../../../core/scene/store';
import { paletteFor } from './theme';
import { handleDown, type HandlerCtx } from './handlers';
import { useToolStateMachine } from '../../shared/useToolStateMachine';
import type { GraphTool } from './tools';
import { safeJsx } from '../../shared/safeJsx';
import { attachJxgWheelZoom } from '../../shared/attachJxgWheelZoom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface MiniBoardHandle {
  getState: () => State;
  getStore: () => Store;
  setTool: (t: GraphTool) => void;
  getTool: () => GraphTool;
  getShowAxis: () => boolean;
  getShowGrid: () => boolean;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  subscribe: (cb: () => void) => () => void;
  highlight: (id: string | null) => void;
  getContainer: () => HTMLDivElement | null;
  getBbox: () => [number, number, number, number];
}

interface MiniBoardProps {
  initialState?: State | null;
  isDark?: boolean;
  onReady?: () => void;
  onSelectionChange?: (id: string | undefined) => void;
}

export const MiniBoard = React.forwardRef<MiniBoardHandle, MiniBoardProps>(
  function MiniBoard({ initialState, isDark, onReady, onSelectionChange: _onSelectionChange }, ref) {
    const isDarkRef = useRef(!!isDark); isDarkRef.current = !!isDark;
    const containerId = useId().replace(/:/g, '_') + '_graph_jxg';
    const containerRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<JxgObj>(null);
    const jxgRef = useRef<JxgObj>(null);
    const rendererRef = useRef<JxgRenderer | null>(null);

    const init = useMemo<State>(
      () => initialState ?? createEmptyState('graph2d'),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );
    const { store } = useSceneStore(init);
    const toolSM = useToolStateMachine<GraphTool>('move');

    const [showAxis, setShowAxisState] = useState<boolean>(
      init.meta.view?.showAxis ?? true,
    );
    const [showGrid, setShowGridState] = useState<boolean>(
      init.meta.view?.showGrid ?? true,
    );
    const showAxisRef = useRef(showAxis); showAxisRef.current = showAxis;
    const showGridRef = useRef(showGrid); showGridRef.current = showGrid;

    // Subscribers (external UI listens to state changes)
    const subscribersRef = useRef<Set<() => void>>(new Set());
    const notifySubscribers = useCallback(() => {
      subscribersRef.current.forEach((cb) =>
        safeJsx('MiniBoard.graph.notifySubscriber', () => cb()),
      );
    }, []);
    useEffect(() => store.subscribe(() => notifySubscribers()), [store, notifySubscribers]);
    useEffect(() => { notifySubscribers(); }, [showAxis, showGrid, toolSM.tool, notifySubscribers]);

    // ─── Board init ────────────────────────────────────────────────────────────
    useEffect(() => {
      if (typeof window === 'undefined' || !containerRef.current) return;
      let cancelled = false;
      let wheelCleanup: (() => void) | null = null;

      void (async () => {
        const JXG = (await import('jsxgraph')).default;
        if (cancelled || !containerRef.current) return;
        jxgRef.current = JXG;

        safeJsx('MiniBoard.graph.applyJxgOptions', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opts = (JXG as any).Options;
          if (opts) {
            opts.text = opts.text || {};
            opts.text.display = 'internal';
            opts.text.useASCIIMathML = false;
            opts.text.useMathJax = false;
            opts.text.useKatex = false;
            opts.label = opts.label || {};
            opts.label.display = 'internal';
          }
        });

        const bbox: [number, number, number, number] = [-10, 10, 10, -10];
        const board: JxgObj = JXG.JSXGraph.initBoard(containerId, {
          boundingbox: bbox,
          axis: showAxisRef.current,
          grid: showGridRef.current,
          showCopyright: false,
          showNavigation: true,
          keepAspectRatio: false,
          pan: { enabled: true, needShift: false },
          zoom: { wheel: false },
        });
        boardRef.current = board;

        const theme = paletteFor(isDarkRef.current);
        rendererRef.current = new JxgRenderer(store, board, { theme });

        // Ctrl/Cmd + wheel zoom
        if (containerRef.current) {
          wheelCleanup = attachJxgWheelZoom(containerRef.current, board, 'MiniBoard.graph');
        }

        // Pointer-down handler — only active when tool != move
        const onDown = (evt: JxgObj) => {
          const b = boardRef.current;
          if (!b || toolSM.toolRef.current === 'move') return;

          // Convert JSXGraph event → user-space coords.
          // Pattern from geometry-3d MiniBoard3D: use getUsrCoordsOfMouse if available,
          // fall back to manual calculation via board.origin + unitX/unitY.
          let ux = 0, uy = 0;
          safeJsx('MiniBoard.graph.pointerCoords', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usr = (b as any).getUsrCoordsOfMouse?.(evt);
            if (Array.isArray(usr) && usr.length >= 2
                && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
              ux = usr[0] as number; uy = usr[1] as number;
            } else if (b.origin?.scrCoords && containerRef.current) {
              // Fallback: manual pixel → user-space
              const rect = containerRef.current.getBoundingClientRect();
              const px = (evt.clientX ?? 0) - rect.left;
              const py = (evt.clientY ?? 0) - rect.top;
              const ox = b.origin.scrCoords[1];
              const oy = b.origin.scrCoords[2];
              const bUnitX = b.unitX || 1;
              const bUnitY = b.unitY || 1;
              ux = (px - ox) / bUnitX;
              uy = (oy - py) / bUnitY;
            }
          });

          const ctx: HandlerCtx = {
            store,
            toolRef: toolSM.toolRef,
            pendingIdsRef: toolSM.pendingIdsRef,
            pushPending: toolSM.pushPending,
            clearPending: toolSM.clearPending,
            setTool: toolSM.setTool,
            nextLabel: (kind) => sceneNextLabel(store.getState(), kind),
            getNearestFunctionId: ({ x, y }) =>
              findNearestFunction(b, store, rendererRef.current, x, y),
            getHitObjectId: ({ x, y }) =>
              findHitObject(b, rendererRef.current, x, y),
          };
          safeJsx('MiniBoard.graph.handleDown', () =>
            handleDown(ctx, { x: ux, y: uy }),
          );
        };

        board.on('down', onDown);
        onReady?.();
      })();

      return () => {
        cancelled = true;
        if (wheelCleanup) { wheelCleanup(); wheelCleanup = null; }
        rendererRef.current?.dispose();
        rendererRef.current = null;
        if (boardRef.current && jxgRef.current) {
          safeJsx('MiniBoard.graph.freeBoard', () =>
            jxgRef.current!.JSXGraph.freeBoard(boardRef.current),
          );
          boardRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId]);

    useImperativeHandle(
      ref,
      () => ({
        getState: () => store.getState(),
        getStore: () => store,
        setTool: toolSM.setTool,
        getTool: () => toolSM.toolRef.current,
        getShowAxis: () => showAxisRef.current,
        getShowGrid: () => showGridRef.current,
        setShowAxis: (b: boolean) => {
          setShowAxisState(b);
          store.dispatch({ type: 'UPDATE_VIEW', payload: { patch: { showAxis: b } } });
        },
        setShowGrid: (b: boolean) => {
          setShowGridState(b);
          store.dispatch({ type: 'UPDATE_VIEW', payload: { patch: { showGrid: b } } });
        },
        undo: () => store.undo(),
        redo: () => store.redo(),
        canUndo: () => store.canUndo(),
        canRedo: () => store.canRedo(),
        subscribe: (cb) => {
          subscribersRef.current.add(cb);
          return () => { subscribersRef.current.delete(cb); };
        },
        highlight: (id) => rendererRef.current?.highlight(id),
        getContainer: () => containerRef.current,
        getBbox: () => boardRef.current?.getBoundingBox() ?? [-10, 10, 10, -10],
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [store, toolSM],
    );

    return (
      <div
        ref={containerRef}
        id={containerId}
        data-testid="graph-miniboard"
        className="h-full w-full"
        style={{ touchAction: 'none' }}
      />
    );
  },
);

// ─── Hit-test helpers ──────────────────────────────────────────────────────────

/**
 * Find the id of the nearest function2d object within vertical tolerance `tolY`
 * (in world/user-space units — default 0.5 units; may need tuning for zoom levels).
 *
 * Iterates over function2d objects in state.order and evaluates el.Y(x) on the
 * JSXGraph functiongraph element via JxgRenderer.getElement(id).
 */
function findNearestFunction(
  _board: JxgObj,
  store: Store,
  renderer: JxgRenderer | null,
  x: number,
  y: number,
  tolY = 0.5,
): string | null {
  if (!renderer) return null;
  const state = store.getState();
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const id of state.order) {
    const obj = state.objects[id];
    if (obj.kind !== 'function2d') continue;
    const el = renderer.getElement(id) as { Y?: (x: number) => number } | null;
    if (!el || typeof el.Y !== 'function') continue;
    let fy: number;
    try {
      fy = el.Y(x);
    } catch {
      continue;
    }
    if (!Number.isFinite(fy)) continue;
    const d = Math.abs(y - fy);
    if (d < tolY && d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

/**
 * Find the id of any rendered object at (x, y) by delegating to JSXGraph hasPoint.
 * Creates a temporary invisible point at (x, y) in screen coords to call hasPoint.
 */
function findHitObject(
  board: JxgObj,
  renderer: JxgRenderer | null,
  x: number,
  y: number,
): string | null {
  if (!renderer || !board) return null;
  // Create a temporary invisible probe point at user coords
  let screen: JxgObj | null = null;
  try {
    screen = board.create('point', [x, y], { visible: false, withLabel: false, name: '' });
  } catch {
    return null;
  }
  let result: string | null = null;
  try {
    for (const [id, el] of renderer.listElements().entries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = el as any;
      if (e?.hasPoint?.(screen.X(), screen.Y())) {
        result = id;
        break;
      }
    }
  } finally {
    try { board.removeObject(screen); } catch { /* ignore */ }
  }
  return result;
}
