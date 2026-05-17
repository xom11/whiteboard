'use client';

import { useEffect, useRef } from 'react';
import type { SerializedGraph } from '../serialize';
import { compile } from '../parser';
import { graphPaletteFor } from './theme';
import type { GraphTool } from './tools';
import { numericalDerivative } from './handlers';

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

export function MiniBoard({ graph, activeTool, isDark, onBoardEvent }: MiniBoardProps) {
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
      syncObjects(board, graph, curvesRef.current);
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
      board.on('down', (ev: { clientX?: number; clientY?: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usrCoords = (board as any).getUsrCoordsOfMouse?.(ev as unknown as MouseEvent);
        const x = usrCoords?.[0] ?? 0;
        const y = usrCoords?.[1] ?? 0;
        // Tìm curve dưới chuột (best-effort)
        let functionId: string | undefined;
        for (const [id, ref] of curvesRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = ref.obj as any;
          if (obj?.hasPoint && obj.hasPoint(ev.clientX ?? 0, ev.clientY ?? 0)) {
            functionId = id;
            break;
          }
        }
        if (functionId) onBoardEvent({ type: 'click-curve', functionId, x, y });
        else onBoardEvent({ type: 'click-empty', x, y });
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

  // Sync objects khi graph thay đổi
  useEffect(() => {
    if (!boardRef.current) return;
    syncObjects(boardRef.current, graph, curvesRef.current);
  }, [graph]);

  // Suppress unused warnings - palette consumed by syncObjects via isDark
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

function syncObjects(
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

  // Render points
  for (const point of graph.points) {
    const fn = graph.functions.find((f) => f.id === point.functionId);
    if (!fn || !fn.visible) continue;
    const compiled = compile(fn.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const y = compiled(point.x);
    board.create('point', [point.x, y], {
      name: point.label ?? '',
      size: 3,
      fillColor: fn.color,
      strokeColor: fn.color,
      withLabel: !!point.label,
    });
  }

  // Render intersections
  for (const inter of graph.intersections) {
    const fa = graph.functions.find((f) => f.id === inter.functionIdA);
    const fb = graph.functions.find((f) => f.id === inter.functionIdB);
    if (!fa || !fb || !fa.visible || !fb.visible) continue;
    const cfa = compile(fa.expression, paramMap);
    const cfb = compile(fb.expression, paramMap);
    if (typeof cfa !== 'function' || typeof cfb !== 'function') continue;
    const roots = scanRoots((x: number) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
    for (const x of roots) {
      board.create('point', [x, cfa(x)], {
        size: 3,
        fillColor: '#000',
        strokeColor: '#000',
      });
    }
  }

  // Render tangents
  for (const tan of graph.tangents) {
    const pt = graph.points.find((p) => p.id === tan.pointId);
    if (!pt) continue;
    const fn = graph.functions.find((f) => f.id === pt.functionId);
    if (!fn || !fn.visible) continue;
    const slope = numericalDerivative(fn.expression, paramMap, pt.x);
    const cfn = compile(fn.expression, paramMap);
    if (typeof cfn !== 'function' || !Number.isFinite(slope)) continue;
    const y0 = cfn(pt.x);
    const x1 = graph.view.xMin;
    const x2 = graph.view.xMax;
    board.create(
      'line',
      [
        [x1, slope * (x1 - pt.x) + y0],
        [x2, slope * (x2 - pt.x) + y0],
      ],
      {
        strokeColor: fn.color,
        strokeWidth: 1,
        dash: 2,
        straightFirst: false,
        straightLast: false,
      },
    );
  }

  board.update();
}

function scanRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = 200,
): number[] {
  const roots: number[] = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      // bisection
      let a = prevX;
      let b = x;
      let ya = prevY;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) {
          a = b = m;
          break;
        }
        if (ya * ym < 0) {
          b = m;
        } else {
          a = m;
          ya = ym;
        }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
