export interface SerializedGraph {
  version: 1;
  view: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    showAxis: boolean;
    showGrid: boolean;
  };
  functions: SerializedFunction[];
  parameters: SerializedParameter[];
  points: SerializedPoint[];
  intersections: SerializedIntersection[];
  tangents: SerializedTangent[];
}

export interface SerializedFunction {
  id: string;
  name: string;
  expression: string;
  color: string;
  visible: boolean;
  domain?: { min: number; max: number };
}

export interface SerializedParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface SerializedPoint {
  id: string;
  functionId: string;
  x: number;
  label?: string;
}

export interface SerializedIntersection {
  id: string;
  functionIdA: string;
  functionIdB: string;
}

export interface SerializedTangent {
  id: string;
  pointId: string;
}

export const EMPTY_GRAPH: SerializedGraph = {
  version: 1,
  view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
  functions: [],
  parameters: [],
  points: [],
  intersections: [],
  tangents: [],
};

export function stringifySerializedGraph(graph: SerializedGraph): string {
  return JSON.stringify(graph);
}

export function parseSerializedGraph(jsonState: string): SerializedGraph | null {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonState);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  if (!r.view || typeof r.view !== 'object') return null;
  const v = r.view as Record<string, unknown>;
  if (
    typeof v.xMin !== 'number' ||
    typeof v.xMax !== 'number' ||
    typeof v.yMin !== 'number' ||
    typeof v.yMax !== 'number' ||
    typeof v.showAxis !== 'boolean' ||
    typeof v.showGrid !== 'boolean'
  ) {
    return null;
  }
  for (const key of ['functions', 'parameters', 'points', 'intersections', 'tangents']) {
    if (!Array.isArray(r[key])) return null;
  }
  return raw as SerializedGraph;
}
