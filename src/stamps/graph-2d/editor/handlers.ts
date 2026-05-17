import type {
  SerializedGraph,
  SerializedPoint,
  SerializedIntersection,
  SerializedTangent,
} from '../serialize';
import { compile } from '../parser';

export interface ClickContext {
  x: number;
  y: number;
  functionId?: string;
}

export function addPointOnCurve(
  graph: SerializedGraph,
  ctx: ClickContext,
  idFactory: () => string,
): SerializedGraph {
  if (!ctx.functionId) return graph;
  const point: SerializedPoint = {
    id: idFactory(),
    functionId: ctx.functionId,
    x: ctx.x,
  };
  return { ...graph, points: [...graph.points, point] };
}

export function addIntersection(
  graph: SerializedGraph,
  functionIdA: string,
  functionIdB: string,
  idFactory: () => string,
): SerializedGraph {
  if (functionIdA === functionIdB) return graph;
  const exists = graph.intersections.some(
    (i) =>
      (i.functionIdA === functionIdA && i.functionIdB === functionIdB) ||
      (i.functionIdA === functionIdB && i.functionIdB === functionIdA),
  );
  if (exists) return graph;
  const intersection: SerializedIntersection = {
    id: idFactory(),
    functionIdA,
    functionIdB,
  };
  return { ...graph, intersections: [...graph.intersections, intersection] };
}

export function addTangent(
  graph: SerializedGraph,
  pointId: string,
  idFactory: () => string,
): SerializedGraph {
  const exists = graph.tangents.some((t) => t.pointId === pointId);
  if (exists) return graph;
  const tangent: SerializedTangent = { id: idFactory(), pointId };
  return { ...graph, tangents: [...graph.tangents, tangent] };
}

/**
 * Numerical derivative via centered difference. Dùng cho tangent tool.
 */
export function numericalDerivative(
  expression: string,
  paramValues: Record<string, number>,
  x: number,
  h = 1e-4,
): number {
  const fn = compile(expression, paramValues);
  if (typeof fn !== 'function') return NaN;
  const y1 = fn(x - h);
  const y2 = fn(x + h);
  return (y2 - y1) / (2 * h);
}
