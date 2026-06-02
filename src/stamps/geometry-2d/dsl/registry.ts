// src/stamps/geometry-2d/dsl/registry.ts
import { z } from 'zod';
import type { DslKindModule } from './kinds/_types';
import { freeModule } from './kinds/points/free';
import { midpointModule } from './kinds/points/midpoint';
import { onSegmentModule } from './kinds/points/onSegment';
import { onLineModule } from './kinds/points/onLine';
import { onCircleModule } from './kinds/points/onCircle';
import { perpFootModule } from './kinds/points/perpFoot';
import { circumcenterModule } from './kinds/points/circumcenter';
import { incenterModule } from './kinds/points/incenter';
import { centroidModule } from './kinds/points/centroid';
import { orthocenterModule } from './kinds/points/orthocenter';
import { intersectionModule } from './kinds/points/intersection';
import { segmentModule } from './kinds/lines/segment';
import { lineModule } from './kinds/lines/line';
import { rayModule } from './kinds/lines/ray';
import { perpendicularModule } from './kinds/lines/perpendicular';
import { parallelModule } from './kinds/lines/parallel';
import { perpBisectorModule } from './kinds/lines/perpBisector';
import { angleBisectorModule } from './kinds/lines/angleBisector';
import { tangentModule } from './kinds/lines/tangent';
import { polygonModule } from './kinds/polygons/polygon';
import { circleCPModule } from './kinds/circles/circleCP';
import { circle3Module } from './kinds/circles/circle3';
import { secondIntersectionModule } from './kinds/points/secondIntersection';
import { circleIntersectionModule } from './kinds/points/circleIntersection';
import { tangencyPointModule } from './kinds/points/tangencyPoint';
import { tangentPointExtModule } from './kinds/points/tangentPointExt';
import { circleCRModule } from './kinds/circles/circleCR';
import { incircleModule } from './kinds/circles/incircle';

const ALL_MODULES: ReadonlyArray<DslKindModule> = [
  freeModule, midpointModule, onSegmentModule, onLineModule, onCircleModule,
  perpFootModule, circumcenterModule, incenterModule, centroidModule,
  orthocenterModule, intersectionModule,
  // NEW Tier 4+5 points
  secondIntersectionModule, circleIntersectionModule, tangencyPointModule, tangentPointExtModule,
  segmentModule, lineModule, rayModule,
  perpendicularModule, parallelModule, perpBisectorModule,
  angleBisectorModule, tangentModule,
  polygonModule,
  circleCPModule, circle3Module,
  // NEW Tier 4+5 circles
  circleCRModule, incircleModule,
];

export const KIND_REGISTRY: ReadonlyMap<string, DslKindModule> =
  new Map(ALL_MODULES.map((m) => [m.kind, m]));

export const POINT_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter((m) => m.role === 'point').map((m) => m.kind),
);

export const LINE_LIKE_SHAPE_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter(
    (m) =>
      m.role === 'segment' ||
      m.role === 'line' ||
      m.role === 'ray' ||
      m.role === 'lineConstruction',
  ).map((m) => m.kind),
);

export const CIRCLE_KINDS: ReadonlySet<string> = new Set(
  ALL_MODULES.filter((m) => m.role === 'circle').map((m) => m.kind),
);

// Top-level entity discriminated union — used internally by schema.ts for building DslPoint/DslShape.
export const DslEntitySchema = z.discriminatedUnion(
  'kind',
  ALL_MODULES.map((m) => m.schema) as unknown as [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]],
);
