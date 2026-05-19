'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import { MiniBoard } from './MiniBoard';
import type { BoardEvent } from './MiniBoard';
import {
  EMPTY_GRAPH,
  stringifySerializedGraph,
  type SerializedFunction,
  type SerializedGraph,
  type SerializedParameter,
} from '../serialize';
import { validate } from '../parser';
import { renderGraph2dSvgFromState } from '../render';
import { nextColor, nextFunctionName, MAX_FUNCTIONS, MAX_PARAMETERS } from '../colors';
import type { GraphTool } from './tools';
import { addPointOnCurve, addIntersection } from './handlers';

export interface GraphState {
  tool: GraphTool;
  showAxis: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface GraphEditorPanelHandle {
  insert(): boolean;
  hasContent(): boolean;
  setTool(t: GraphTool): void;
  setShowAxis(b: boolean): void;
  setShowGrid(b: boolean): void;
  resetView(): void;
  undo(): void;
  redo(): void;

  addFunction(expr: string): { ok: true; id: string } | { ok: false; error: string };
  commitFunctionExpression(id: string, expr: string): void;
  toggleFunctionVisible(id: string): void;
  removeFunction(id: string): void;

  setParameter(name: string, value: number): void;
  setParameterRange(name: string, min: number, max: number, step: number): void;
  removeParameter(name: string): void;

  getGraph(): SerializedGraph;
  getErrors(): Record<string, string | null>;
}

export interface GraphEditorPanelProps {
  initialState: SerializedGraph | null;
  onInsert: (jsonState: string, svgString: string) => void;
  onClose: () => void;
  onStateChange: (state: GraphState) => void;
  withLeftPanel: boolean;
  isDark: boolean;
  isMobile: boolean;
  onOpenDrawer: () => void;
  // Lift state up so Host can render AlgebraView with current graph + errors
  onGraphChange?: (g: SerializedGraph) => void;
  onErrorsChange?: (errors: Record<string, string | null>) => void;
}

export const GraphEditorPanel = forwardRef(function GraphEditorPanel(
  props: GraphEditorPanelProps,
  ref: Ref<GraphEditorPanelHandle>,
) {
  // graphRef is the single source of truth for imperative reads (hasContent, getGraph, etc.)
  // setGraph triggers re-render to sync JSXGraph MiniBoard
  const initialGraph = props.initialState ?? EMPTY_GRAPH;
  const graphRef = useRef<SerializedGraph>(initialGraph);
  const [, forceUpdate] = useState(0);

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [tool, setToolState] = useState<GraphTool>('move');
  const undoStackRef = useRef<SerializedGraph[]>([]);
  const redoStackRef = useRef<SerializedGraph[]>([]);
  const idCounterRef = useRef(1);

  const toolRef = useRef<GraphTool>(tool);
  toolRef.current = tool;

  const intersectFirstRef = useRef<string | null>(null);

  const propsRef = useRef(props);
  propsRef.current = props;

  // Notify initial graph state to Host on mount
  const initialGraphNotifiedRef = useRef(false);

  const pushUndo = useCallback((g: SerializedGraph) => {
    undoStackRef.current.push(g);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    // Bất kỳ thao tác mới nào cũng làm rớt nhánh redo
    redoStackRef.current = [];
  }, []);

  const setErrorsWithNotify = useCallback(
    (updater: (prev: Record<string, string | null>) => Record<string, string | null>) => {
      setErrors((prev) => {
        const next = updater(prev);
        propsRef.current.onErrorsChange?.(next);
        return next;
      });
    },
    [],
  );

  const notifyStateChange = useCallback((g: SerializedGraph, t: GraphTool) => {
    propsRef.current.onStateChange({
      tool: t,
      showAxis: g.view.showAxis,
      showGrid: g.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  const updateGraph = useCallback(
    (mutator: (prev: SerializedGraph) => SerializedGraph) => {
      const prev = graphRef.current;
      pushUndo(prev);
      const next = mutator(prev);
      graphRef.current = next;
      notifyStateChange(next, toolRef.current);
      forceUpdate((n) => n + 1);
      propsRef.current.onGraphChange?.(next);
    },
    [pushUndo, notifyStateChange],
  );

  const doUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(graphRef.current);
    if (redoStackRef.current.length > 30) redoStackRef.current.shift();
    graphRef.current = prev;
    forceUpdate((n) => n + 1);
    propsRef.current.onStateChange({
      tool: toolRef.current,
      showAxis: prev.view.showAxis,
      showGrid: prev.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
    propsRef.current.onGraphChange?.(prev);
  }, []);

  const doRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(graphRef.current);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    graphRef.current = next;
    forceUpdate((n) => n + 1);
    propsRef.current.onStateChange({
      tool: toolRef.current,
      showAxis: next.view.showAxis,
      showGrid: next.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
    propsRef.current.onGraphChange?.(next);
  }, []);

  // Global keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const inField = !!(
        ae &&
        (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
      );
      if (inField) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        doUndo();
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        doRedo();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [doUndo, doRedo]);

  const onBoardEvent = useCallback((ev: BoardEvent) => {
    const currentTool = toolRef.current;
    if (currentTool === 'point-on-curve' && ev.type === 'click-curve' && ev.functionId && ev.x !== undefined) {
      updateGraph((g) =>
        addPointOnCurve(
          g,
          { x: ev.x!, y: ev.y ?? 0, functionId: ev.functionId },
          () => `p${idCounterRef.current++}`,
        ),
      );
      setToolState('move');
    } else if (currentTool === 'intersect' && ev.type === 'click-curve' && ev.functionId) {
      if (!intersectFirstRef.current) {
        intersectFirstRef.current = ev.functionId;
      } else {
        const a = intersectFirstRef.current;
        const b = ev.functionId;
        intersectFirstRef.current = null;
        updateGraph((g) =>
          addIntersection(g, a, b, () => `i${idCounterRef.current++}`),
        );
        setToolState('move');
      }
    } else if (currentTool === 'tangent' && ev.type === 'click-curve' && ev.functionId && ev.x !== undefined) {
      const pointId = `p${idCounterRef.current++}`;
      const tangentId = `t${idCounterRef.current++}`;
      updateGraph((g) => ({
        ...g,
        points: [...g.points, { id: pointId, functionId: ev.functionId!, x: ev.x! }],
        tangents: [...g.tangents, { id: tangentId, pointId }],
      }));
      setToolState('move');
    }
  }, [updateGraph]);

  useImperativeHandle(
    ref,
    () => ({
      insert: () => {
        const g = graphRef.current;
        if (g.functions.length === 0) return false;
        const jsonState = stringifySerializedGraph(g);
        renderGraph2dSvgFromState(jsonState)
          .then((svg) => propsRef.current.onInsert(jsonState, svg))
          .catch((err) => console.error('Graph2D insert render failed:', err));
        return true;
      },

      hasContent: () => graphRef.current.functions.length > 0,

      setTool: (t: GraphTool) => {
        setToolState(t);
        const g = graphRef.current;
        propsRef.current.onStateChange({
          tool: t,
          showAxis: g.view.showAxis,
          showGrid: g.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0,
        });
      },

      setShowAxis: (b: boolean) =>
        updateGraph((g) => ({ ...g, view: { ...g.view, showAxis: b } })),

      setShowGrid: (b: boolean) =>
        updateGraph((g) => ({ ...g, view: { ...g.view, showGrid: b } })),

      resetView: () =>
        updateGraph((g) => ({
          ...g,
          view: { ...g.view, xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        })),

      undo: doUndo,
      redo: doRedo,

      addFunction: (expr: string) => {
        const g = graphRef.current;
        if (g.functions.length >= MAX_FUNCTIONS) {
          return { ok: false as const, error: `Tối đa ${MAX_FUNCTIONS} hàm` };
        }
        const v = validate(expr);
        if (!v.ok) return { ok: false as const, error: v.error ?? 'Invalid' };

        const id = `f${idCounterRef.current++}`;
        const usedNames = g.functions.map((f) => f.name);
        const usedColors = g.functions.map((f) => f.color);
        const newFn: SerializedFunction = {
          id,
          name: nextFunctionName(usedNames),
          expression: expr,
          color: nextColor(usedColors),
          visible: true,
        };

        const usedParamNames = new Set(g.parameters.map((p) => p.name));
        const newParams: SerializedParameter[] = [];
        for (const varName of v.freeVars) {
          if (usedParamNames.has(varName)) continue;
          if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
          newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
        }

        updateGraph((prev) => ({
          ...prev,
          functions: [...prev.functions, newFn],
          parameters: [...prev.parameters, ...newParams],
        }));
        setErrorsWithNotify((e) => ({ ...e, [id]: null }));
        return { ok: true as const, id };
      },

      commitFunctionExpression: (id: string, expr: string) => {
        const g = graphRef.current;
        const v = validate(expr);
        if (!v.ok) {
          setErrorsWithNotify((e) => ({ ...e, [id]: v.error ?? 'Invalid' }));
          return;
        }
        const usedParamNames = new Set(g.parameters.map((p) => p.name));
        const newParams: SerializedParameter[] = [];
        for (const varName of v.freeVars) {
          if (usedParamNames.has(varName)) continue;
          if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
          newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
        }
        updateGraph((prev) => ({
          ...prev,
          functions: prev.functions.map((f) =>
            f.id === id ? { ...f, expression: expr } : f,
          ),
          parameters: [...prev.parameters, ...newParams],
        }));
        setErrorsWithNotify((e) => ({ ...e, [id]: null }));
      },

      toggleFunctionVisible: (id: string) =>
        updateGraph((g) => ({
          ...g,
          functions: g.functions.map((f) =>
            f.id === id ? { ...f, visible: !f.visible } : f,
          ),
        })),

      removeFunction: (id: string) =>
        updateGraph((g) => ({
          ...g,
          functions: g.functions.filter((f) => f.id !== id),
        })),

      // setParameter does NOT push undo — would flood the stack (slider drag)
      setParameter: (name: string, value: number) => {
        const next = {
          ...graphRef.current,
          parameters: graphRef.current.parameters.map((p) =>
            p.name === name ? { ...p, value } : p,
          ),
        };
        graphRef.current = next;
        forceUpdate((n) => n + 1);
        propsRef.current.onGraphChange?.(next);
      },

      setParameterRange: (name: string, min: number, max: number, step: number) =>
        updateGraph((g) => ({
          ...g,
          parameters: g.parameters.map((p) =>
            p.name === name
              ? { ...p, min, max, step, value: Math.min(max, Math.max(min, p.value)) }
              : p,
          ),
        })),

      removeParameter: (name: string) =>
        updateGraph((g) => ({
          ...g,
          parameters: g.parameters.filter((p) => p.name !== name),
        })),

      getGraph: () => graphRef.current,
      getErrors: () => errors,
    }),
    // deps: updateGraph stable; errors changes when function errors change; setErrorsWithNotify stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateGraph, errors, setErrorsWithNotify, doUndo, doRedo],
  );

  // Notify Host of initial graph on mount (so AlgebraView renders correctly for re-edit)
  useEffect(() => {
    if (!initialGraphNotifiedRef.current) {
      initialGraphNotifiedRef.current = true;
      propsRef.current.onGraphChange?.(graphRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const graph = graphRef.current;
  const hasContent = graph.functions.length > 0;

  const handleInsert = () => {
    const g = graphRef.current;
    if (g.functions.length === 0) return;
    const jsonState = stringifySerializedGraph(g);
    renderGraph2dSvgFromState(jsonState)
      .then((svg) => propsRef.current.onInsert(jsonState, svg))
      .catch((err) => console.error('Graph2D insert render failed:', err));
  };

  const { isMobile, isDark, withLeftPanel } = props;
  const wrapperStyle: CSSProperties = isMobile
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
      aria-label="Đồ thị 2D"
      data-testid="graph-editor-panel"
      data-stamp-area="true"
      data-mobile-editor={isMobile ? 'true' : undefined}
      style={wrapperStyle}
      className={[
        isDark ? 'theme--dark ' : '',
        'flex flex-col overflow-hidden bg-white',
        isMobile
          ? 'h-full w-full'
          : 'h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5',
      ].join(' ')}
    >
      <header className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 text-white">
        {isMobile && (
          <button
            type="button"
            onClick={props.onOpenDrawer}
            aria-label="Mở bảng đại số"
            data-testid="graph-drawer-toggle"
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
            <path d="M3 21 V3" />
            <path d="M3 21 H21" />
            <path d="M5 19 C8 5, 14 5, 19 17" />
          </svg>
          Đồ thị 2D
        </h3>
        {isMobile && (
          <button
            type="button"
            onClick={handleInsert}
            disabled={!hasContent}
            data-testid="graph-insert-btn-mobile"
            className="rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
          >
            Chèn
          </button>
        )}
        <button
          onClick={props.onClose}
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
        <MiniBoard
          graph={graph}
          activeTool={tool}
          isDark={isDark}
          onBoardEvent={onBoardEvent}
        />
      </div>

      {!isMobile && (
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Nhập biểu thức trong bảng đại số bên trái.</span>
          <div className="flex gap-2">
            <button
              onClick={props.onClose}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Huỷ
            </button>
            <button
              onClick={handleInsert}
              disabled={!hasContent}
              data-testid="graph-insert-btn"
              className="rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              Chèn
            </button>
          </div>
        </footer>
      )}
    </div>
  );
});
