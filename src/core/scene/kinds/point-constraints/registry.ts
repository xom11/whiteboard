// point-constraints/registry.ts
import type { PointConstraintModule } from './_types';
// Batch 1 — native/glider kinds
import { freeConstraint } from './free';
import { onAxisConstraint } from './onAxis';
import { midpointConstraint } from './midpoint';
import { perpFootConstraint } from './perpFoot';
import { circumcenterConstraint } from './circumcenter';
import { incenterConstraint } from './incenter';
import { onLineConstraint } from './onLine';
import { onSegmentConstraint } from './onSegment';
import { onCircleConstraint } from './onCircle';
import { onPolygonConstraint } from './onPolygon';

const ALL: PointConstraintModule[] = [
  freeConstraint,
  onAxisConstraint,
  midpointConstraint,
  perpFootConstraint,
  circumcenterConstraint,
  incenterConstraint,
  onLineConstraint,
  onSegmentConstraint,
  onCircleConstraint,
  onPolygonConstraint,
];
export const POINT_CONSTRAINTS: ReadonlyMap<string, PointConstraintModule> =
  new Map(ALL.map((m) => [m.kind, m]));
