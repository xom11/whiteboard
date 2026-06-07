// src/stamps/geometry-2d/dsl/schema.ts
import { z } from 'zod';
import { NameZ } from './names';
import { KIND_REGISTRY, POINT_KINDS } from './registry';

// Re-export NameZ for backward compat with consumers.
export { NameZ } from './names';

function asTuple(arr: z.ZodObject<any>[]): [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]] {
  if (arr.length < 2) throw new Error('schema: need at least 2 variants for discriminatedUnion');
  return arr as never;
}

const pointSchemas = Array.from(KIND_REGISTRY.values())
  .filter((m) => POINT_KINDS.has(m.kind))
  .map((m) => m.schema);

const shapeSchemas = Array.from(KIND_REGISTRY.values())
  .filter((m) => !POINT_KINDS.has(m.kind))
  .map((m) => m.schema);

// Runtime schemas assembled from the registry (Phase 6).
export const DslPoint = z.discriminatedUnion('kind', asTuple(pointSchemas));
export const DslShape = z.discriminatedUnion('kind', asTuple(shapeSchemas));

export const DslInput = z.object({
  version: z.literal(1),
  points: z.array(DslPoint),
  shapes: z.array(DslShape).default([]),
});

// -----------------------------------------------------------------------------
// Static types
//
// We cannot derive these via `z.infer<typeof DslPoint>` because the kind
// modules use `Extract<DslPointT, { kind: '...' }>` to type their `emit` /
// `collectRefs` callbacks. That creates a type-graph cycle
// (schema.ts -> registry.ts -> kinds/* -> schema.ts) which TypeScript collapses
// to `any` (and `Extract<any, ...>` to `never`) because the registry stores
// schemas as the erased `z.ZodObject<any>`.
//
// Keeping the discriminated union types listed explicitly here breaks the cycle
// while still letting `DslPoint`/`DslShape` (runtime) be registry-assembled.
// Adding a new kind = 1 new module file + 1 entry in registry.ts + 1 variant
// listed below (a single object literal — much smaller than duplicating the
// full Zod schema).
// -----------------------------------------------------------------------------

type Name = z.infer<typeof NameZ>;

// scale/offset OPTIONAL (Issue #46 nhóm C): d = scale·base + offset. Absent →
// d = base như cũ (additive, serialize/golden không đổi).
export type DslDistanceSpec =
  | { kind: 'circleRadius'; circle: Name; scale?: number; offset?: number }
  | { kind: 'segmentLength'; p1: Name; p2: Name; scale?: number; offset?: number }
  | { kind: 'literal'; value: number; scale?: number; offset?: number };

export type DslPointT =
  | { name: Name; kind: 'free'; x: number; y: number }
  | { name: Name; kind: 'midpoint'; p1: Name; p2: Name; visible?: boolean }
  | { name: Name; kind: 'onSegment'; segmentId: Name; t: number }
  | { name: Name; kind: 'onLine'; lineId: Name; t: number }
  | { name: Name; kind: 'onCircle'; circleId: Name; theta: number }
  | { name: Name; kind: 'perpFoot'; from: Name; onLine: Name }
  | { name: Name; kind: 'circumcenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'incenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'centroid'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'orthocenter'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'intersection'; ref1: Name; ref2: Name; branch?: 0 | 1 }
  // NEW Tier 4+5
  | { name: Name; kind: 'secondIntersection'; line: Name; circle: Name; other: Name }
  | { name: Name; kind: 'circleIntersection'; c1: Name; c2: Name; which: 0 | 1 }
  | { name: Name; kind: 'tangencyPoint'; circle: Name; onLine: Name }
  | { name: Name; kind: 'tangentPointExt'; from: Name; circle: Name; which: 0 | 1 }
  // Cụm A
  | { name: Name; kind: 'arcMidpoint'; circle: Name; a: Name; b: Name; notContaining: Name }
  | { name: Name; kind: 'excenter'; vertices: [Name, Name, Name]; opposite: Name }
  | { name: Name; kind: 'reflectPoint'; of: Name; through: Name }
  | { name: Name; kind: 'reflectLine'; of: Name; through: Name }
  // Cụm B points
  | { name: Name; kind: 'pointAtDistance'; from: Name; through: Name; distance: DslDistanceSpec };

export type DslShapeT =
  | { name: Name; kind: 'segment'; p1: Name; p2: Name }
  | { name: Name; kind: 'line'; p1: Name; p2: Name }
  | { name: Name; kind: 'ray'; origin: Name; through: Name }
  | { name: Name; kind: 'polygon'; vertices: Name[] }
  | { name: Name; kind: 'perpendicular'; throughPoint: Name; toLine: Name }
  | { name: Name; kind: 'parallel'; throughPoint: Name; toLine: Name }
  | { name: Name; kind: 'perpBisector'; p1: Name; p2: Name }
  | { name: Name; kind: 'angleBisector'; p1: Name; vertex: Name; p2: Name }
  | { name: Name; kind: 'tangent'; throughPoint: Name; toCircle: Name; branch?: 0 | 1 | 'on' }
  | { name: Name; kind: 'circleCP'; center: Name; surfacePoint: Name; visible?: boolean }
  | { name: Name; kind: 'circle3'; p1: Name; p2: Name; p3: Name }
  // NEW Tier 4+5
  | { name: Name; kind: 'circleCR'; center: Name; radius: number }
  | { name: Name; kind: 'incircle'; vertices: [Name, Name, Name] }
  | { name: Name; kind: 'excircle'; vertices: [Name, Name, Name]; opposite: Name };

export type DslInputT = {
  version: 1;
  points: DslPointT[];
  shapes: DslShapeT[];
};
