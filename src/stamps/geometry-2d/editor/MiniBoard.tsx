'use client';
/* eslint-disable max-lines -- TODO Tier B: extract sub-components/hooks (issue #30) */
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
  useSceneStore,
  type State,
} from '../../../core/scene';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import type { SerializedBoard } from '../serialize';
import { handleDown, handleMove, handleUp, finalizeTransform, type HandlerCtx, type TransformToolKey } from './handlers';
import { findNearestPoint } from './hitTest';
import { paletteFor, themeAxis, themeGrid, themeLabel } from './theme';
import { GROUP_LABELS, TOOLS, objKind, type GeomTool, type ToolDef } from './tools';
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
  getStore: () => import('../../../core/scene/store').Store;
  highlight: (id: string | null) => void;
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
    const elements = (r as any).elements as Map<string, JxgObj> | undefined;
    if (!elements) return null;
    // Synthetic "<polyId>:border:<N>" → polygon.borders[N]. Cho phép preview
    // shape của tool perpendicular/parallel kéo theo cạnh đa giác làm parent.
    const m = /^(.+):border:(\d+)$/.exec(id);
    if (m) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poly = elements.get(m[1]) as any;
      const idx = parseInt(m[2], 10);
      const borders = poly?.borders;
      if (Array.isArray(borders) && borders[idx]) return borders[idx];
      return null;
    }
    return elements.get(id) ?? null;
  }, []);

  const jxgIdToSceneId = useCallback((jxgObj: JxgObj): string | null => {
    if (!jxgObj?.id) return null;
    const direct = jxgIdToSceneRef.current.get(String(jxgObj.id));
    if (direct) return direct;
    // Fallback: dò polygon's borders → synthetic id "<polyId>:border:<idx>".
    // Border là sub-segment do JSXGraph auto-tạo trong polygon, không có scene
    // id riêng → không có trong jxgIdToSceneRef. Trả synthetic id để construct
    // tools (perpendicular, parallel) có thể tham chiếu cạnh đa giác như một
    // line input.
    const r = rendererRef.current;
    if (!r) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements = (r as any).elements as Map<string, JxgObj> | undefined;
    if (!elements) return null;
    for (const [sid, el] of elements) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const borders = (el as any)?.borders;
      if (Array.isArray(borders)) {
        const idx = borders.indexOf(jxgObj);
        if (idx >= 0) return `${sid}:border:${idx}`;
      }
    }
    return null;
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
    // Loại trừ phantom point + preview shape + preview segments khỏi hit-test.
    // Phantom là invisible point JSXGraph kéo theo cursor để dựng live-preview;
    // nếu không loại trừ, click chỗ trống sẽ snap trúng phantom (cách click 0px)
    // → drawing 'đứng' vì pendingRef nhét phantom (không có scene id), tool
    // không tiến tới được needs threshold. (Regression từ commit 95a6c13.)
    const excludes = new Set<JxgObj>();
    if (phantomRef.current) excludes.add(phantomRef.current);
    if (previewShapeRef.current) excludes.add(previewShapeRef.current);
    for (const s of previewSegRef.current) excludes.add(s);
    const out: JxgObj[] = [];
    safeJsx('MiniBoard.objectsAt', () => {
      for (const o of (b.objectsList || [])) {
        if (excludes.has(o)) continue;
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

  // Build a transient preview shape (not part of scene store) from pending
  // picks + phantom point. Returns the created JSXGraph object so the caller
  // can tear it down when picks change. Mirrors the legacy live-preview from
  // commit ce78521, adapted to read picks via `pendingRef` (still JxgObj[]).
  const buildPreview = useCallback((toolDef: ToolDef, picks: JxgObj[], phantom: JxgObj): JxgObj => {
    const b = boardRef.current;
    if (!b) return null;
    const style: Record<string, unknown> = {
      strokeColor: '#3b82f6',
      strokeWidth: 1.5,
      strokeOpacity: 0.65,
      dash: 2,
      fixed: true,
      highlight: false,
      withLabel: false,
    };
    const circStyle: Record<string, unknown> = { ...style, fillColor: 'none', fillOpacity: 0 };
    return safeJsx<JxgObj>('MiniBoard.buildPreview', () => {
      switch (toolDef.key) {
        case 'segment':
        case 'midpoint':
        case 'distance':
          return b.create('segment', [picks[0], phantom], style);
        case 'line':
          return b.create('line', [picks[0], phantom], style);
        case 'ray':
          return b.create('line', [picks[0], phantom], { ...style, straightFirst: false, straightLast: true });
        case 'vector':
          return b.create('arrow', [picks[0], phantom], style);
        case 'circleCenter':
          return b.create('circle', [picks[0], phantom], circStyle);
        case 'circle3':
          if (picks.length === 1) return b.create('circle', [picks[0], phantom], circStyle);
          if (picks.length === 2) return b.create('circumcircle', [picks[0], picks[1], phantom], circStyle);
          return null;
        case 'angle':
          if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
          if (picks.length === 2) {
            return b.create('angle', [picks[0], picks[1], phantom], {
              ...style,
              radius: 1,
              fillColor: '#22c55e',
              fillOpacity: 0.15,
            });
          }
          return null;
        case 'perpBisector':
          return b.create('segment', [picks[0], phantom], style);
        case 'angleBisector':
          if (picks.length === 1) return b.create('segment', [picks[0], phantom], style);
          if (picks.length === 2) return b.create('bisector', [picks[0], picks[1], phantom], style);
          return null;
        case 'perpendicular':
        case 'parallel':
        case 'tangent': {
          if (picks.length !== 1) return null;
          const k = objKind(picks[0]);
          if (k === 'line' && toolDef.key !== 'tangent') {
            return b.create(toolDef.key, [picks[0], phantom], style);
          }
          if (k === 'circle' && toolDef.key === 'tangent') {
            const glider = b.create('glider', [phantom.X(), phantom.Y(), picks[0]], {
              visible: false,
              withLabel: false,
            });
            return b.create('tangent', [glider], style);
          }
          return null;
        }
        default:
          return null;
      }
    }, null);
  }, []);

  // Tear down old preview shape and build a fresh one from the current picks
  // + phantom. Phantom is created lazily so we don't spawn a hidden point until
  // the user has at least one real pick.
  const refreshPreview = useCallback(() => {
    const b = boardRef.current;
    if (!b) return;
    if (previewShapeRef.current) {
      safeJsx('MiniBoard.removeObject(previewShape)', () => b.removeObject(previewShapeRef.current));
      previewShapeRef.current = null;
    }
    const t = toolSM.toolRef.current;
    const toolDef = TOOLS.find((td) => td.key === t);
    if (!toolDef) return;
    const picks = pendingRef.current;
    // toolDef.needs === -1 means polygon (variable-length); handlers.ts already
    // emits per-vertex segments via previewSegRef, so we skip phantom-preview.
    if (picks.length === 0 || toolDef.needs <= 0) return;
    if (picks.length >= toolDef.needs) return;
    if (!phantomRef.current) {
      phantomRef.current = safeJsx<JxgObj>('MiniBoard.createPhantom', () => b.create('point', [0, 0], {
        visible: false,
        fixed: true,
        withLabel: false,
        name: '',
      }), null);
      if (!phantomRef.current) return;
    }
    previewShapeRef.current = buildPreview(toolDef, picks, phantomRef.current);
  }, [buildPreview, toolSM]);

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
          // Tắt hover-highlight mặc định của JSXGraph (đổi sang xanh/đen khi
          // di chuột vào element). Highlight selection (đỏ) chủ động qua
          // JxgRenderer.highlight() thay vì để JSXGraph tự xử lý.
          opts.elements = opts.elements || {};
          opts.elements.highlight = false;
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
        getStore: () => store,
        highlight: (id: string | null) => { rendererRef.current?.highlight(id); },
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
          if (patch.remove) {
            store.dispatch({ type: 'DELETE', payload: { id } });
            return;
          }
          if (!patch.attrs) return;
          // PropertiesPopover phát attrs theo tên JSXGraph (strokeColor,
          // strokeWidth, withLabel, name, …). Scene attrs dùng tên ngắn gọn
          // (color, width, showLabel, …) và `label` là field top-level của
          // SceneObject (không nằm trong attrs). Map ở đây để popover khỏi
          // cần biết shape của scene.
          const incoming = patch.attrs as Record<string, unknown>;
          const { name, withLabel, strokeColor, fillColor, strokeWidth, ...rest } = incoming as {
            name?: unknown;
            withLabel?: unknown;
            strokeColor?: unknown;
            fillColor?: unknown;
            strokeWidth?: unknown;
            [k: string]: unknown;
          };
          // 1) Rename → UPDATE top-level `label`.
          if (typeof name === 'string') {
            store.dispatch({ type: 'UPDATE', payload: { id, patch: { label: name } } });
          }
          // 2) Map JSXGraph attr names → scene attr names.
          const mapped: Record<string, unknown> = { ...rest };
          // strokeColor / fillColor cùng đại diện cho cùng 1 thuộc tính `color`
          // ở scene. PropertiesPopover đã thêm sẵn `color` cùng strokeColor,
          // nên ưu tiên dùng `color` (đã có trong rest) — nhưng nếu user gọi
          // mutateObject bằng tên JSXGraph thuần thì vẫn map fallback.
          if (strokeColor !== undefined && mapped.color === undefined) mapped.color = strokeColor;
          if (fillColor !== undefined && mapped.color === undefined) mapped.color = fillColor;
          if (strokeWidth !== undefined && mapped.width === undefined) mapped.width = strokeWidth;
          if (withLabel !== undefined && mapped.showLabel === undefined) mapped.showLabel = withLabel;
          if (Object.keys(mapped).length > 0) {
            store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: mapped } });
          }
        },
        getAllPointNames: () => listObjects(store.getState())
          .filter((o) => o.kind === 'point' || o.kind === 'intersection')
          .map((o) => o.label),
        onSelect: (cb) => { selectSubsRef.current.add(cb); return () => { selectSubsRef.current.delete(cb); }; },
        onTransformParam: (cb) => { transformSubsRef.current.add(cb); return () => { transformSubsRef.current.delete(cb); }; },
        confirmTransformParam: (value: number) => {
          const info = pendingTransformRef.current as
            | { tool: TransformToolKey; pendingIds: string[]; anchorScreen: { x: number; y: number } }
            | null;
          if (info && ctxRef.current) {
            safeJsx('MiniBoard.finalizeTransform', () =>
              finalizeTransform(ctxRef.current!, info.tool, info.pendingIds, value),
            );
          }
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
