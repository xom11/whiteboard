'use client';

import { useEffect, useRef } from 'react';
import type { SerializedGraph } from '../serialize';
import { compile } from '../parser';
import { graphPaletteFor } from './theme';
import type { GraphTool } from './tools';

export interface BoardEvent {
  type: 'click-curve' | 'click-empty' | 'view-change';
  functionId?: string;
  x?: number;
  y?: number;
  view?: SerializedGraph['view'];
}

export interface MiniBoardProps {
  graph: SerializedGraph;
  activeTool: GraphTool;
  isDark: boolean;
  onBoardEvent: (e: BoardEvent) => void;
}

interface CurveRef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  expression: string;
  color: string;
  visible: boolean;
  paramSignature: string;
}

export function MiniBoard({ graph, activeTool, isDark, onBoardEvent }: MiniBoardProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardRef = useRef<any>(null);
  const curvesRef = useRef<Map<string, CurveRef>>(new Map());
  const palette = graphPaletteFor(isDark);

  // Init board on mount
  useEffect(() => {
    let cancelled = false;
    let createdBoard: unknown = null;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerId = `jxg_graph2d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    containerEl.id = containerId;

    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (JXG as any).Options;
      if (opts) {
        opts.text = opts.text || {};
        opts.text.display = 'internal';
        opts.label = opts.label || {};
        opts.label.display = 'internal';
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const board = (JXG as any).JSXGraph.initBoard(containerId, {
        boundingbox: [graph.view.xMin, graph.view.yMax, graph.view.xMax, graph.view.yMin],
        axis: graph.view.showAxis,
        grid: graph.view.showGrid,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true, needShift: false },
        keepAspectRatio: false,
      });
      boardRef.current = board;
      createdBoard = board;
      syncCurves(board, graph, curvesRef.current);
      board.on('boundingbox', () => {
        const bb = board.getBoundingBox();
        onBoardEvent({
          type: 'view-change',
          view: {
            xMin: bb[0],
            xMax: bb[2],
            yMax: bb[1],
            yMin: bb[3],
            showAxis: graph.view.showAxis,
            showGrid: graph.view.showGrid,
          },
        });
      });
    })().catch((err) => console.error('MiniBoard init failed:', err));

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (createdBoard) (require('jsxgraph') as any).default.JSXGraph.freeBoard(createdBoard);
      } catch { /* ignore */ }
      boardRef.current = null;
      curvesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync curves khi graph thay đổi
  useEffect(() => {
    if (!boardRef.current) return;
    syncCurves(boardRef.current, graph, curvesRef.current);
  }, [graph]);

  // Suppress unused warnings - activeTool/palette wired ở Task 14
  void activeTool;
  void palette;

  return (
    <div
      ref={containerRef}
      className="graph-miniboard"
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
      data-testid="graph-miniboard"
    />
  );
}

function paramSig(graph: SerializedGraph): string {
  return graph.parameters.map((p) => `${p.name}=${p.value}`).join(',');
}

function syncCurves(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any,
  graph: SerializedGraph,
  curves: Map<string, CurveRef>,
): void {
  const sig = paramSig(graph);
  const paramMap: Record<string, number> = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;

  const wantedIds = new Set(graph.functions.map((f) => f.id));
  // Remove stale curves
  for (const [id, ref] of curves) {
    if (!wantedIds.has(id)) {
      try { board.removeObject(ref.obj); } catch { /* ignore */ }
      curves.delete(id);
    }
  }
  for (const f of graph.functions) {
    const existing = curves.get(f.id);
    const needsRecreate =
      !existing ||
      existing.expression !== f.expression ||
      existing.color !== f.color ||
      existing.visible !== f.visible ||
      existing.paramSignature !== sig;
    if (!needsRecreate) continue;
    if (existing) {
      try { board.removeObject(existing.obj); } catch { /* ignore */ }
    }
    if (!f.visible) {
      curves.delete(f.id);
      continue;
    }
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    const obj = board.create('functiongraph', [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false,
    });
    curves.set(f.id, {
      obj,
      expression: f.expression,
      color: f.color,
      visible: f.visible,
      paramSignature: sig,
    });
  }
  board.update();
}
