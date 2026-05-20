// src/core/scene/kinds/2d-constraint.ts
export type Vec2 = [number, number];

export type Constraint2D =
  | { kind: 'free'; x: number; y: number }
  | { kind: 'onAxis'; axis: 'x' | 'y'; t: number }
  | { kind: 'onLine'; lineId: string; t: number }
  | { kind: 'onSegment'; segmentId: string; t: number }
  | { kind: 'onCircle'; circleId: string; theta: number }
  | { kind: 'onPolygon'; polygonId: string; u: number; v: number };

export function constraintRefs2D(c: Constraint2D): string[] {
  switch (c.kind) {
    case 'onLine': return [c.lineId];
    case 'onSegment': return [c.segmentId];
    case 'onCircle': return [c.circleId];
    case 'onPolygon': return [c.polygonId];
    default: return [];
  }
}
