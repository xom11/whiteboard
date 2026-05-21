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

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createEmptyState,
  nextLabel as sceneNextLabel,
  useSceneStore,
  type State,
} from '../../../core/scene';
import { JxgRenderer } from '../../../core/scene/render/JxgRenderer';
import type { SerializedBoard } from '../serialize';
import { handleDown, handleMove, handleUp, type HandlerCtx } from './handlers';
import {
  findNearestJxgPoint,
  objectsAt as objectsAtImpl,
  promoteToLabelOwner,
  screenCoordsOf as screenCoordsOfImpl,
} from './hitTest';
import { paletteFor, themeAxis, themeGrid, themeLabel } from './theme';
import { GROUP_LABELS, TOOLS, type GeomTool, type ToolDef } from './tools';
import { useToolStateMachine } from '../../shared/useToolStateMachine';
import { safeJsx } from '../../shared/safeJsx';
import { attachJxgWheelZoom } from '../../shared/attachJxgWheelZoom';
import { initJxgBoard } from '../../shared/initJxgBoard';
import { buildObjectSnapshot } from './snapshot';
import {
  clearPreviewSegs as clearPreviewSegsImpl,
  removePhantom as removePhantomImpl,
  refreshPreviewShape,
} from './previewActions';
import { buildMiniBoardHandle } from './buildHandle';
import {
  jxgFromSceneId as jxgFromSceneIdImpl,
  jxgIdToSceneId as jxgIdToSceneIdImpl,
} from './idResolvers';
import { useAxisGridSync } from './useAxisGridSync';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useJxgSceneIdMap } from './useJxgSceneIdMap';

import type { MiniBoardHandle, ObjectSnapshot, TransformPopoverInfo } from './MiniBoard.types';

export { TOOLS, GROUP_LABELS };
export type { GeomTool, ToolDef };
export type { ObjectSnapshot, TransformPopoverInfo, MiniBoardHandle } from './MiniBoard.types';

type JxgObj = any;

interface Props {
  /** Signal "board boot xong" — parent gọi handle methods qua ref sau khi nhận. */
  onReady?: () => void;
  initialState: SerializedBoard | null;
  isDark?: boolean;
}

export const MiniBoard2D = forwardRef<MiniBoardHandle, Props>(function MiniBoard2D(
  { onReady, initialState, isDark },
  ref,
) {
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
  const toolSM = useToolStateMachine<GeomTool>('move');

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

  const { jxgIdToSceneRef } = useJxgSceneIdMap({ store, rendererRef });

  const jxgFromSceneId = useCallback(
    (id: string) => jxgFromSceneIdImpl(rendererRef.current, id),
    [],
  );
  const jxgIdToSceneId = useCallback(
    (jxgObj: JxgObj) => jxgIdToSceneIdImpl(rendererRef.current, jxgIdToSceneRef.current, jxgObj),
    [jxgIdToSceneRef],
  );

  // ─── Hit-test helpers ──────────────────────────────────────────────────────
  // Mỗi callback wrap pure function ở hitTest.ts, gom refs vào tham số.
  const screenCoordsOf = useCallback(
    (evt: JxgObj) => screenCoordsOfImpl(boardRef.current, containerRef.current, evt),
    [],
  );
  const objectsAt = useCallback(
    (evt: JxgObj) => objectsAtImpl(boardRef.current, containerRef.current, evt, [
      phantomRef.current,
      previewShapeRef.current,
      ...previewSegRef.current,
    ]),
    [],
  );
  const findNearestPointJxg = useCallback(
    (evt: JxgObj, tolPx = 12) =>
      findNearestJxgPoint(boardRef.current, containerRef.current, store.getState(), jxgFromSceneId, evt, tolPx),
    [jxgFromSceneId, store],
  );
  const promoteLabel = useCallback(
    (o: JxgObj) => promoteToLabelOwner(boardRef.current, o),
    [],
  );

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

  const clearPreviewSegs = useCallback(
    () => clearPreviewSegsImpl(boardRef.current, previewSegRef),
    [],
  );
  const removePhantom = useCallback(
    () => removePhantomImpl(boardRef.current, { previewShapeRef, phantomRef }),
    [],
  );
  const clearPending = useCallback(() => {
    removePhantom();
    clearPreviewSegs();
    pendingRef.current = [];
    toolSM.clearPending();
  }, [clearPreviewSegs, removePhantom, toolSM]);
  const refreshPreview = useCallback(
    () => refreshPreviewShape(boardRef.current, toolSM, {
      previewSegRef, phantomRef, previewShapeRef, pendingRef,
    }),
    [toolSM],
  );

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
    (id: string, anchorScreen: { x: number; y: number }): ObjectSnapshot | null =>
      buildObjectSnapshot(store.getState(), id, anchorScreen),
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

  useEditorShortcuts({
    store,
    pendingIdsRef: toolSM.pendingIdsRef,
    selectedSetRef,
    clearPending,
    clearSelection,
    deleteSelection,
  });
  useAxisGridSync({ boardRef, axisObjsRef, isDarkRef, showAxis, showGrid });

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
    let freeBoard: (() => void) | null = null;
    void (async () => {
      const { JXG, board, cleanup } = await initJxgBoard(containerId, {
        label: 'MiniBoard.2d',
        defaults: { disableElementHighlight: true },
        boardOptions: {
          boundingbox: initialState?.bbox ?? [-10, 10, 10, -10],
          axis: false, grid: false,
          showCopyright: false, showNavigation: true,
          keepAspectRatio: true,
          pan: { enabled: true, needShift: false },
          zoom: { wheel: false },
          precision: { hasPoint: 8, mouse: 4, touch: 16 },
        },
        extraOptionTweaks: (opts) => {
          // Apply theme label/text stroke color sau common defaults. Selection
          // highlight (đỏ) chủ động qua JxgRenderer.highlight() — đã disable
          // JSXGraph hover-highlight qua defaults.disableElementHighlight.
          if (opts.label) opts.label.strokeColor = themeLabel(isDarkRef.current);
          if (opts.text) opts.text.strokeColor = themeLabel(isDarkRef.current);
        },
      });
      if (cancelled || !containerRef.current) { cleanup(); return; }
      jxgRef.current = JXG;
      boardRef.current = board;
      freeBoard = cleanup;

      rendererRef.current = new JxgRenderer(store, board, {
        theme: paletteFor(isDarkRef.current),
      });

      // Ctrl/Cmd + wheel zoom (Excalidraw-style).
      if (containerRef.current) {
        wheelCleanup = attachJxgWheelZoom(containerRef.current, board, 'MiniBoard.2d');
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

      onReady?.();
    })();
    return () => {
      cancelled = true;
      if (wheelCleanup) { wheelCleanup(); wheelCleanup = null; }
      if (previewRafRef.current != null) { cancelAnimationFrame(previewRafRef.current); previewRafRef.current = null; }
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (freeBoard) { freeBoard(); freeBoard = null; }
      boardRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // Handle delivery qua ref. Methods đọc trực tiếp từ refs — handle có thể
  // tạo trước khi board boot xong; gọi method trước onReady?.() sẽ trả stale
  // refs. Object literal được build ở `buildHandle.ts` để giảm size file.
  useImperativeHandle(
    ref,
    () => buildMiniBoardHandle({
      containerRef, boardRef, rendererRef,
      showAxisRef, showGridRef,
      subscribersRef, selectSubsRef, transformSubsRef,
      selectedSetRef, pendingTransformRef, ctxRef,
      store, toolSM,
      handleToolChange,
      clearPending, clearSelection, deleteSelection,
      emitTransform,
      setShowAxisState, setShowGridState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, handleToolChange, clearSelection, deleteSelection, clearPending, emitTransform],
  );

  return (
    <div
      ref={containerRef}
      id={containerId}
      data-testid="jxgmini-container"
      className="h-full min-h-0 bg-white"
      style={{ touchAction: 'none' }}
    />
  );
});
