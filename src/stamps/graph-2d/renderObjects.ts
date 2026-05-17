import type { SerializedGraph } from './serialize';
import { compile } from './parser';
import { numericalDerivative } from './editor/handlers';

/**
 * Render tất cả objects (functions, points, intersections, tangents) lên board JSXGraph.
 *
 * Pure function — không giữ state, dùng cho one-shot render (render.ts).
 * MiniBoard giữ syncObjects riêng để diff/track curves theo id.
 */
export function renderGraphObjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any,
  graph: SerializedGraph,
): void {
  const paramMap: Record<string, number> = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;

  // Functions
  for (const f of graph.functions) {
    if (!f.visible) continue;
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    board.create('functiongraph', [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false,
    });
  }

  // Points
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

  // Intersections
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

  // Tangents
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
