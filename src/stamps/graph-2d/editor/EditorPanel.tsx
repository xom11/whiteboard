'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
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
}

export interface GraphEditorPanelHandle {
  insert(): boolean;
  hasContent(): boolean;
  setTool(t: GraphTool): void;
  setShowAxis(b: boolean): void;
  setShowGrid(b: boolean): void;
  resetView(): void;
  undo(): void;

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
  const idCounterRef = useRef(1);

  const toolRef = useRef<GraphTool>(tool);
  toolRef.current = tool;

  const intersectFirstRef = useRef<string | null>(null);

  const propsRef = useRef(props);
  propsRef.current = props;

  const pushUndo = useCallback((g: SerializedGraph) => {
    undoStackRef.current.push(g);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
  }, []);

  const notifyStateChange = useCallback((g: SerializedGraph, t: GraphTool) => {
    propsRef.current.onStateChange({
      tool: t,
      showAxis: g.view.showAxis,
      showGrid: g.view.showGrid,
      canUndo: undoStackRef.current.length > 0,
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
    },
    [pushUndo, notifyStateChange],
  );

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

      undo: () => {
        const prev = undoStackRef.current.pop();
        if (!prev) return;
        graphRef.current = prev;
        forceUpdate((n) => n + 1);
        propsRef.current.onStateChange({
          tool: toolRef.current,
          showAxis: prev.view.showAxis,
          showGrid: prev.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
        });
      },

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
        setErrors((e) => ({ ...e, [id]: null }));
        return { ok: true as const, id };
      },

      commitFunctionExpression: (id: string, expr: string) => {
        const g = graphRef.current;
        const v = validate(expr);
        if (!v.ok) {
          setErrors((e) => ({ ...e, [id]: v.error ?? 'Invalid' }));
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
        setErrors((e) => ({ ...e, [id]: null }));
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
        graphRef.current = {
          ...graphRef.current,
          parameters: graphRef.current.parameters.map((p) =>
            p.name === name ? { ...p, value } : p,
          ),
        };
        forceUpdate((n) => n + 1);
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
    // deps: updateGraph stable; errors changes when function errors change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateGraph, errors],
  );

  const graph = graphRef.current;

  return (
    <div className="graph-editor-panel">
      <MiniBoard
        graph={graph}
        activeTool={tool}
        isDark={props.isDark}
        onBoardEvent={onBoardEvent}
      />
      {props.isMobile ? (
        <button
          type="button"
          aria-label="Mở bảng đại số"
          className="graph-drawer-toggle"
          onClick={props.onOpenDrawer}
        >
          ☰
        </button>
      ) : null}
      <div className="graph-editor-footer">
        <button
          type="button"
          className="graph-btn-insert"
          onClick={() => {
            const g = graphRef.current;
            if (g.functions.length === 0) return;
            const jsonState = stringifySerializedGraph(g);
            renderGraph2dSvgFromState(jsonState)
              .then((svg) => propsRef.current.onInsert(jsonState, svg))
              .catch((err) => console.error('Graph2D insert render failed:', err));
          }}
        >
          Chèn
        </button>
      </div>
    </div>
  );
});
