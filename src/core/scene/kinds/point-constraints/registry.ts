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
// Batch 2 — function-coords / native intersection kinds
import { centroidConstraint } from './centroid';
import { arcMidpointConstraint } from './arcMidpoint';
import { excenterConstraint } from './excenter';
import { mixtilinearPointConstraint } from './mixtilinearPoint';
import { pointAtDistanceConstraint } from './pointAtDistance';
import { circleIntersectionConstraint } from './circleIntersection';
import { circleSecondIntersectionConstraint } from './circleSecondIntersection';
import { secondIntersectionConstraint } from './secondIntersection';
import { tangencyPointConstraint } from './tangencyPoint';
// Batch 3 — aux/_helpers/drag-sync kinds
import { transformedConstraint } from './transformed';
import { orthocenterConstraint } from './orthocenter';
import { onPerpendicularConstraint } from './onPerpendicular';
import { onPerpBisectorConstraint } from './onPerpBisector';
import { onCircleAroundPointConstraint } from './onCircleAroundPoint';
import { tangentPointExtConstraint } from './tangentPointExt';

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
  centroidConstraint,
  arcMidpointConstraint,
  excenterConstraint,
  mixtilinearPointConstraint,
  pointAtDistanceConstraint,
  circleIntersectionConstraint,
  circleSecondIntersectionConstraint,
  secondIntersectionConstraint,
  tangencyPointConstraint,
  transformedConstraint,
  orthocenterConstraint,
  onPerpendicularConstraint,
  onPerpBisectorConstraint,
  onCircleAroundPointConstraint,
  tangentPointExtConstraint,
];
export const POINT_CONSTRAINTS: ReadonlyMap<string, PointConstraintModule> =
  new Map(ALL.map((m) => [m.kind, m]));
