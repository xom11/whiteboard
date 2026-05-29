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

const ALL_MODULES: ReadonlyArray<DslKindModule> = [
  freeModule, midpointModule, onSegmentModule, onLineModule, onCircleModule,
  perpFootModule, circumcenterModule, incenterModule, centroidModule,
  orthocenterModule, intersectionModule,
  segmentModule, lineModule, rayModule,
  perpendicularModule, parallelModule, perpBisectorModule,
  angleBisectorModule, tangentModule,
  polygonModule,
  circleCPModule, circle3Module,
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

// Built in Phase 6 (Task 11). Until then `dsl/schema.ts` keeps its inline union.
export const DslEntitySchema: z.ZodTypeAny = z.never();
