'use client';
/**
 * MiniBoard.tsx — JSXGraph mini-board cho geometry-2d editor.
 *
 * Sau Sub-PR 2.3.3 (Scene v2 Phase 2):
 *   - Scene state qua `core/scene` Store + JxgRenderer (diff subscribe).
 *   - Pointer handlers (handleDown/Up/Move) dispatch ADD/DELETE/UPDATE_ATTRS.
 *   - Tool + pending picks qua `useToolStateMachine`.
 *   - Selection = Set<sceneId> (UI state).
 *   - Undo/Redo qua store (immer snapshot stack).
 *
 * EditorPanel/host/render.ts vẫn dùng API cũ — clean ở 2.3.4 / 2.3.7.
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  createEmptyState,
  listObjects,
  nextLabel as sceneNextLabel,
  type State,
} from '../../../core/scene';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import type { SerializedBoard } from '../serialize';
import { handleDown, handleMove, handleUp, type HandlerCtx } from './handlers';
import { findNearestPoint } from './hitTest';
import { paletteFor, themeAxis, themeGrid, themeLabel } from './theme';
import { GROUP_LABELS, TOOLS, type GeomTool, type ToolDef } from './tools';
import { useSceneStore } from './useSceneStore';
import { useToolStateMachine } from './useToolStateMachine';
import { safeJsx } from '../../shared/safeJsx';

export { TOOLS, GROUP_LABELS };
export type { GeomTool, ToolDef };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface ObjectSnapshot {
  id: string;
  kind: 'point' | 'line' | 'circle';
  name: string;
  color: string;
  width: number;
  dash: number;
  face: 'o' | 'circle' | 'cross' | 'plus';
  showLabel: boolean;
  showValue: boolean;
  screenCoords: { x: number; y: number };
}

export type TransformPopoverInfo = {
  tool: 'rotate' | 'dilate' | 'regularPolygon' | 'translate' | 'reflectLine' | 'reflectPoint';
  anchor: { x: number; y: number };
} | null;

export interface MiniBoardHandle {
  getContainer: () => HTMLDivElement | null;
  getBbox: () => [number, number, number, number];
  getState: () => State;
  getShowAxis: () => boolean;
  getShowGrid: () => boolean;
  setTool: (t: GeomTool) => void;
  getTool: () => GeomTool;
  setShowAxis: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  undo: () => void;
  canUndo: () => boolean;
  redo: () => void;
  canRedo: () => boolean;
  subscribe: (cb: () => void) => () => void;
  snapshotObject: (id: string, anchorScreen: { x: number; y: number }) => ObjectSnapshot | null;
  mutateObject: (id: string, patch: { attrs?: Record<string, unknown>; remove?: boolean }) => void;
  getAllPointNames: () => string[];
  onSelect: (cb: (snap: ObjectSnapshot) => void) => () => void;
  onTransformParam: (cb: (info: TransformPopoverInfo) => void) => () => void;
  confirmTransformParam: (value: number) => void;
  cancelTransformParam: () => void;
  getSelectionSize: () => number;
  clearSelection: () => void;
  deleteSelection: () => void;
}

interface Props {
  onReady: (handle: MiniBoardHandle) => void;
  initialState: SerializedBoard | null;
  isDark?: boolean;
}

export const JSXGraphMiniBoard: React.FC<Props> = ({ onReady, initialState, isDark }) => {
  const isDarkRef = useRef(!!isDark); isDarkRef.current = !!isDark;
  const containerId = useId().replace(/:/g, '_') + '_jxgmini';
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<JxgObj>(null);
  const jxgRef = useRef<JxgObj>(null);
  const rendererRef = useRef<JxgRenderer | null>(null);
  const axisObjsRef = useRef<{ x?: JxgObj; y?: JxgObj }>({});

  const initState = useMemo<State>(
    () => initialState?.state ?? createEmptyState('2d'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { store } = useSceneStore(initState);
  const toolSM = useToolStateMachine('move');

  const [showAxis, setShowAxisState] = useState<boolean>(initialState?.showAxis ?? false);
  const [showGrid, setShowGridState] = useState<boolean>(initialState?.showGrid ?? false);
  const showAxisRef = useRef(showAxis); showAxisRef.current = showAxis;
  const showGridRef = useRef(showGrid); showGridRef.current = showGrid;

  const selectedSetRef = useRef<Set<string>>(new Set());
  const [, setSelectionTick] = useState(0);

  // Pending / preview / marquee state.
  const pendingRef = useRef<JxgObj[]>([]);
  const previewSegRef = useRef<JxgObj[]>([]);
  const phantomRef = useRef<JxgObj>(null);
  const previewShapeRef = useRef<JxgObj>(null);
  const previewRafRef = useRef<number | null>(null);
  const marqueeRef = useRef<{ startSx: number; startSy: number; rect?: JxgObj } | null>(null);
  const moveDownRef = useRef<{ sx: number; sy: number } | null>(null);
  const lastMoveClickRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingTransformRef = useRef<any>(null);

  // Subscribers.
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const selectSubsRef = useRef<Set<(snap: ObjectSnapshot) => void>>(new Set());
  const transformSubsRef = useRef<Set<(info: TransformPopoverInfo) => void>>(new Set());
  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => safeJsx('MiniBoard.notifySubscriber.cb', () => cb()));
  }, []);
  useEffect(() => store.subscribe(() => notifySubscribers()), [store, notifySubscribers]);
  useEffect(() => { notifySubscribers(); }, [showAxis, showGrid, toolSM.tool, notifySubscribers]);

  // Reverse map: jxg internal id → scene id (rebuilt mỗi store event).
  const jxgIdToSceneRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const rebuild = (): void => {
      const r = rendererRef.current;
      if (!r) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elements: Map<string, JxgObj> | undefined = (r as any).elements;
      const next = new Map<string, string>();
      if (elements) {
        for (const [sid, jxg] of elements) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jid = (jxg as any)?.id;
          if (jid) next.set(String(jid), sid);
        }
      }
      jxgIdToSceneRef.current = next;
    };
    rebuild();
    return store.subscribe(() => rebuild());
  }, [store]);

  const jxgFromSceneId = useCallback((id: string): JxgObj | null => {
    const r = rendererRef.current;
    if (!r) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((r as any).elements as Map<string, JxgObj> | undefined)?.get(id) ?? null;
  }, []);

  const jxgIdToSceneId = useCallback((jxgObj: JxgObj): string | null => {
    if (!jxgObj?.id) return null;
    return jxgIdToSceneRef.current.get(String(jxgObj.id)) ?? null;
  }, []);

  // ─── Hit-test helpers ──────────────────────────────────────────────────────
  const screenCoordsOf = useCallback((evt: JxgObj): [number, number] | null => {
    const b = boardRef.current;
    if (!b) return null;
    try {
      const mp = b.getMousePosition ? b.getMousePosition(evt) : null;
      if (mp && mp.length >= 2) return [mp[0], mp[1]];
    } catch { /* fall */ }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
      const cy = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
      return [cx - rect.left, cy - rect.top];
    }
    return null;
  }, []);

  const objectsAt = useCallback((evt: JxgObj): JxgObj[] => {
    const b = boardRef.current;
    const sc = b ? screenCoordsOf(evt) : null;
    if (!b || !sc) return [];
    const [sx, sy] = sc;
    const out: JxgObj[] = [];
    safeJsx('MiniBoard.objectsAt', () => {
      for (const o of (b.objectsList || [])) {
        if (o && typeof o.hasPoint === 'function' && o.hasPoint(sx, sy)) out.push(o);
      }
    });
    return out;
  }, [screenCoordsOf]);

  const findNearestPointJxg = useCallback((evt: JxgObj, tolPx = 12): JxgObj | null => {
    const b = boardRef.current;
    const sc = b ? screenCoordsOf(evt) : null;
    if (!b || !sc) return null;
    const [sx, sy] = sc;
    const pointCoord = (id: string): [number, number] | null => {
      const j = jxgFromSceneId(id);
      const sc2 = j?.coords?.scrCoords;
      return sc2 ? [sc2[1], sc2[2]] : null;
    };
    const result = findNearestPoint(store.getState(), pointCoord, sx, sy, tolPx);
    return result ? jxgFromSceneId(result.id) : null;
  }, [screenCoordsOf, jxgFromSceneId, store]);

  const promoteLabel = useCallback((o: JxgObj): JxgObj => {
    if (!o) return o;
    const t = (o.elType || o.type || '').toString().toLowerCase();
    if (t !== 'text' || !boardRef.current) return o;
    const promoted = safeJsx<JxgObj | null>('MiniBoard.promoteLabel', () => {
      for (const c of (boardRef.current!.objectsList || [])) {
        if (c.label === o) return c;
      }
      return null;
    }, null);
    return promoted ?? o;
  }, []);

  // ─── Selection / pending / preview actions ─────────────────────────────────
  const toggleSelect = useCallback((id: string, additive: boolean) => {
    if (!additive) { selectedSetRef.current.clear(); selectedSetRef.current.add(id); }
    else if (selectedSetRef.current.has(id)) selectedSetRef.current.delete(id);
    else selectedSetRef.current.add(id);
    setSelectionTick((t) => t + 1);
  }, []);
  const clearSelection = useCallback(() => {
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
  }, []);
  const deleteSelection = useCallback(() => {
    if (selectedSetRef.current.size === 0) return;
    store.transaction((dispatch) => {
      for (const id of selectedSetRef.current) dispatch({ type: 'DELETE', payload: { id } });
    });
    selectedSetRef.current.clear();
    setSelectionTick((t) => t + 1);
  }, [store]);

  const clearPreviewSegs = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    for (const s of previewSegRef.current) {
      safeJsx('MiniBoard.removeObject(previewSeg)', () => b.removeObject(s));
    }
    previewSegRef.current = [];
  }, []);
  const removePhantom = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    if (previewShapeRef.current) {
      safeJsx('MiniBoard.removeObject(previewShape)', () => b.removeObject(previewShapeRef.current));
      previewShapeRef.current = null;
    }
    if (phantomRef.current) {
      safeJsx('MiniBoard.removeObject(phantom)', () => b.removeObject(phantomRef.current));
      phantomRef.current = null;
    }
  }, []);
  const clearPending = useCallback(() => {
    removePhantom();
    clearPreviewSegs();
    pendingRef.current = [];
    toolSM.clearPending();
  }, [clearPreviewSegs, removePhantom, toolSM]);
  // Multi-pick live preview chuyển sang scene-driven sẽ làm ở sub-PR sau.
  const refreshPreview = useCallback(() => { /* no-op */ }, []);

  // ─── Warning flash ─────────────────────────────────────────────────────────
  const [, setWarn] = useState<string | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashWarn = useCallback((msg: string) => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    setWarn(msg);
    warnTimerRef.current = setTimeout(() => setWarn(null), 1800);
  }, []);
  useEffect(() => () => { if (warnTimerRef.current) clearTimeout(warnTimerRef.current); }, []);

  const nextLabelFor = useCallback(
    (kind: string): string => sceneNextLabel(store.getState(), kind),
    [store],
  );

  // ─── Snapshot + emit helpers ───────────────────────────────────────────────
  const buildSnapshot = useCallback(
    (id: string, anchorScreen: { x: number; y: number }): ObjectSnapshot | null => {
      const obj = store.getState().objects[id];
      if (!obj) return null;
      const k = obj.kind;
      if (k !== 'point' && k !== 'line' && k !== 'circle' && k !== 'segment' && k !== 'ray' && k !== 'vector') return null;
      const a = obj.attrs as Record<string, unknown>;
      const jKind: 'point' | 'line' | 'circle' = k === 'point' ? 'point' : (k === 'circle' ? 'circle' : 'line');
      return {
        id, kind: jKind, name: obj.label,
        color: (a.color as string) ?? '#0f172a',
        width: (a.width as number) ?? 2,
        dash: (a.dash as number) ?? 0,
        face: (a.face as ObjectSnapshot['face']) ?? 'o',
        showLabel: (a.showLabel as boolean) ?? true,
        showValue: (a.showValue as boolean) ?? false,
        screenCoords: anchorScreen,
      };
    },
    [store],
  );
  const emitSelect = useCallback((info: { id: string; anchorScreen: { x: number; y: number } }) => {
    const snap = buildSnapshot(info.id, info.anchorScreen);
    if (!snap) return;
    selectSubsRef.current.forEach((cb) => safeJsx('MiniBoard.emitSelect.cb', () => cb(snap)));
  }, [buildSnapshot]);
  const emitTransform = useCallback((info: TransformPopoverInfo) => {
    transformSubsRef.current.forEach((cb) => safeJsx('MiniBoard.emitTransform.cb', () => cb(info)));
  }, []);

  // ─── Handler context (read latest refs at call time) ───────────────────────
  const ctxRef = useRef<HandlerCtx | null>(null);
  ctxRef.current = {
    boardRef,
    toolRef: toolSM.toolRef as { current: GeomTool },
    pendingRef,
    pendingIdsRef: toolSM.pendingIdsRef as { current: string[] },
    previewSegRef,
    axisObjsRef,
    selectedSetRef,
    marqueeRef,
    moveDownRef,
    lastMoveClickRef,
    pendingTransformRef,
    phantomRef,
    previewShapeRef,
    previewRafRef,
    jxgRef,
    store,
    jxgIdToSceneId,
    jxgFromSceneId,
    screenCoordsOf,
    objectsAt,
    promoteLabel,
    findNearestPointJxg,
    toggleSelect,
    clearSelection,
    nextLabel: nextLabelFor,
    clearPending,
    clearPreviewSegs,
    refreshPreview,
    flashWarn,
    emitTransform: emitTransform as HandlerCtx['emitTransform'],
    emitSelect: emitSelect as HandlerCtx['emitSelect'],
    setPendingCount: () => { /* derived from toolSM */ },
    setSelectionTick: (fn) => setSelectionTick(fn),
  };

  // ─── Keyboard shortcuts (capture, ignore in fields) ────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const inField = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
      const lk = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && lk === 'z' && !e.shiftKey) {
        if (inField) return;
        e.preventDefault(); e.stopPropagation(); store.undo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && ((lk === 'z' && e.shiftKey) || (lk === 'y' && !e.shiftKey))) {
        if (inField) return;
        e.preventDefault(); e.stopPropagation(); store.redo(); return;
      }
      if (e.key === 'Escape' && !inField) {
        if (toolSM.pendingIdsRef.current.length > 0) {
          e.preventDefault(); e.stopPropagation(); clearPending();
        }
        if (selectedSetRef.current.size > 0) {
          e.preventDefault(); e.stopPropagation(); clearSelection();
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && selectedSetRef.current.size > 0) {
        e.preventDefault(); e.stopPropagation(); deleteSelection();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [store, toolSM, clearPending, clearSelection, deleteSelection]);

  // ─── Axis / grid toggle ────────────────────────────────────────────────────
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('MiniBoard.toggleAxis', () => {
      if (axisObjsRef.current.x) { safeJsx('MiniBoard.removeObject(axisX)', () => b.removeObject(axisObjsRef.current.x)); axisObjsRef.current.x = undefined; }
      if (axisObjsRef.current.y) { safeJsx('MiniBoard.removeObject(axisY)', () => b.removeObject(axisObjsRef.current.y)); axisObjsRef.current.y = undefined; }
      if (showAxis) {
        axisObjsRef.current.x = b.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        axisObjsRef.current.y = b.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
      }
      b.update();
    });
  }, [showAxis]);
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('MiniBoard.toggleGrid', () => {
      for (const o of Object.values(b.objects || {}) as JxgObj[]) {
        if (o && (o.elType === 'grid' || o.type === 'grid' || (o.visProp && o.visProp.type === 'grid'))) {
          safeJsx('MiniBoard.removeObject(grid)', () => b.removeObject(o));
        }
      }
      if (showGrid) b.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
      b.update();
    });
  }, [showGrid]);

  const handleToolChange = useCallback((t: GeomTool) => {
    clearPending();
    toolSM.setTool(t);
    const b = boardRef.current;
    if (b) safeJsx('MiniBoard.setPanForTool', () => {
      if (b.attr?.pan) b.attr.pan.enabled = (t !== 'select');
    });
  }, [clearPending, toolSM]);

  // ─── Board init (async JSXGraph load) ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let cancelled = false;
    let wheelCleanup: (() => void) | null = null;
    void (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !containerRef.current) return;
      jxgRef.current = JXG;
      safeJsx('MiniBoard.applyJxgOptions', () => {
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
          opts.label.strokeColor = themeLabel(isDarkRef.current);
          opts.text.strokeColor = themeLabel(isDarkRef.current);
        }
      });
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
        axis: false, grid: false,
        showCopyright: false, showNavigation: true,
        keepAspectRatio: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: false },
        ...({ precision: { hasPoint: 8, mouse: 4, touch: 16 } } as Record<string, unknown>),
      });
      boardRef.current = board;

      const theme = paletteFor(isDarkRef.current);
      rendererRef.current = new JxgRenderer(store, board, {
        theme: {
          stroke: theme.stroke, fill: '#60a5fa',
          axis: theme.axis, grid: theme.grid,
          label: theme.label, pointFill: theme.stroke,
        },
      });

      // Ctrl/Cmd + wheel zoom (Excalidraw-style).
      if (containerRef.current) {
        const wheelTarget = containerRef.current;
        const onWheel = (e: WheelEvent) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault(); e.stopPropagation();
          let cx: number | undefined, cy: number | undefined;
          safeJsx('MiniBoard.wheelZoom.coords', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usr = (board as any).getUsrCoordsOfMouse?.(e);
            if (Array.isArray(usr) && usr.length === 2
                && Number.isFinite(usr[0]) && Number.isFinite(usr[1])) {
              cx = usr[0] as number; cy = usr[1] as number;
            }
          });
          if (e.deltaY < 0) safeJsx('MiniBoard.wheelZoom.in', () => board.zoomIn(cx, cy));
          else if (e.deltaY > 0) safeJsx('MiniBoard.wheelZoom.out', () => board.zoomOut(cx, cy));
        };
        wheelTarget.addEventListener('wheel', onWheel, { passive: false });
        wheelCleanup = () => wheelTarget.removeEventListener('wheel', onWheel);
      }

      if (showAxisRef.current) safeJsx('MiniBoard.initAxes', () => {
        axisObjsRef.current.x = board.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        axisObjsRef.current.y = board.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
      });
      if (showGridRef.current) safeJsx('MiniBoard.initGrid', () =>
        board.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 }),
      );

      const fire = (h: (ctx: HandlerCtx, e: JxgObj) => void) =>
        (e: JxgObj) => { if (ctxRef.current) h(ctxRef.current, e); };
      board.on('down', fire(handleDown));
      board.on('up', fire(handleUp));
      board.on('move', fire(handleMove));

      onReady({
        getContainer: () => containerRef.current,
        getBbox: () => board ? board.getBoundingBox() : [-10, 10, 10, -10],
        getState: () => store.getState(),
        getShowAxis: () => showAxisRef.current,
        getShowGrid: () => showGridRef.current,
        setTool: handleToolChange,
        getTool: () => toolSM.toolRef.current,
        setShowAxis: (b: boolean) => setShowAxisState(b),
        setShowGrid: (b: boolean) => setShowGridState(b),
        undo: () => store.undo(),
        canUndo: () => store.canUndo(),
        redo: () => store.redo(),
        canRedo: () => store.canRedo(),
        subscribe: (cb) => { subscribersRef.current.add(cb); return () => { subscribersRef.current.delete(cb); }; },
        snapshotObject: (id, anchorScreen) => buildSnapshot(id, anchorScreen),
        mutateObject: (id, patch) => {
          if (patch.remove) store.dispatch({ type: 'DELETE', payload: { id } });
          else if (patch.attrs) store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: patch.attrs } });
        },
        getAllPointNames: () => listObjects(store.getState())
          .filter((o) => o.kind === 'point' || o.kind === 'intersection')
          .map((o) => o.label),
        onSelect: (cb) => { selectSubsRef.current.add(cb); return () => { selectSubsRef.current.delete(cb); }; },
        onTransformParam: (cb) => { transformSubsRef.current.add(cb); return () => { transformSubsRef.current.delete(cb); }; },
        confirmTransformParam: (_value: number) => {
          // Transform finalize logic được port chính xác ở sub-PR sau (kind
          // 'transform' chưa nằm trong scene registry). Hiện tại: cancel pending.
          pendingTransformRef.current = null;
          emitTransform(null);
          clearPending();
        },
        cancelTransformParam: () => {
          pendingTransformRef.current = null;
          emitTransform(null);
          clearPending();
        },
        getSelectionSize: () => selectedSetRef.current.size,
        clearSelection,
        deleteSelection,
      });
    })();
    return () => {
      cancelled = true;
      if (wheelCleanup) { wheelCleanup(); wheelCleanup = null; }
      if (previewRafRef.current != null) { cancelAnimationFrame(previewRafRef.current); previewRafRef.current = null; }
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (boardRef.current && jxgRef.current) {
        safeJsx('MiniBoard.freeBoard', () => jxgRef.current!.JSXGraph.freeBoard(boardRef.current));
        boardRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      data-testid="jxgmini-container"
      className="h-full min-h-0 bg-white"
      style={{ touchAction: 'none' }}
    />
  );
};
