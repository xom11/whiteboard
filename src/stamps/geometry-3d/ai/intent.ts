import { z } from 'zod';

// Accept ASCII apostrophe (') and Unicode prime variants (′ U+2032, ' U+2019, ´ U+00B4)
// that the rule engine emits for primed labels like A′, B′.
export const Label3DZ = z.string().min(1).max(16).regex(/^[A-Za-z][A-Za-z0-9'′’´_]*$/);

export type SolidFlavor = 'pyramid' | 'prism' | 'tetrahedron' | 'box';
export type BaseVariant =
  | 'square' | 'rectangle' | 'parallelogram' | 'trapezoid' | 'rhombus'
  | 'triangle' | 'equilateral-triangle';
export type ApexVariant = 'regular' | 'over-vertex' | 'over-edge-mid' | 'free';

const SolidIntentZ = z.object({
  op: z.literal('solid'),
  flavor: z.enum(['pyramid', 'prism', 'tetrahedron', 'box']),
  baseLabels: z.array(Label3DZ).min(3),
  baseVariant: z.enum(['square','rectangle','parallelogram','trapezoid','rhombus','triangle','equilateral-triangle']),
  apex: Label3DZ.optional(),               // pyramid/tetrahedron apex; prism: top labels derived
  apexVariant: z.enum(['regular','over-vertex','over-edge-mid','free']),
  apexAnchor: z.string().optional(),        // vertex label (over-vertex) or edge token "AB" (over-edge-mid)
  topLabels: z.array(Label3DZ).optional(),  // prism/box top face
});

// Mirror Constraint3D kinds (core/scene/kinds/3d-constraint.ts) + a few rule-level kinds.
const AddPoint3DIntentZ = z.object({
  op: z.literal('add-point-3d'),
  name: Label3DZ,
  constraint: z.record(z.unknown()),        // validated downstream by builder against Constraint3D
});

const Plane3DIntentZ = z.object({
  op: z.literal('plane'),
  name: Label3DZ,
  spec: z.record(z.unknown()),              // {kind:'threePoints',p1,p2,p3} | parallelThrough | perpToLine
});

const Line3DIntentZ = z.object({
  op: z.literal('line'),
  name: Label3DZ.optional(),
  kind: z.enum(['segment','line','ray','planePlaneIntersection','parallelThrough','perpToPlane']),
  refs: z.record(z.unknown()).optional(),
});

const Connect3DIntentZ = z.object({
  op: z.literal('connect'),
  from: Label3DZ, to: Label3DZ,
  style: z.enum(['segment','line','ray']).default('segment'),
});

const CrossSectionIntentZ = z.object({
  op: z.literal('cross-section'),
  name: Label3DZ.optional(),
  plane: Label3DZ,
  solid: Label3DZ.optional(),
});

// ───── Khối tròn xoay (Phase 4) — 1:1 scene kind sphere3d/cone3d/cylinder3d ─────
const SphereIntentZ = z.object({
  op: z.literal('sphere'),
  name: Label3DZ.optional(),
  center: Label3DZ,
  surfacePoint: Label3DZ,
});

export const Intent3DZ = z.discriminatedUnion('op', [
  SolidIntentZ, AddPoint3DIntentZ, Plane3DIntentZ, Line3DIntentZ, Connect3DIntentZ, CrossSectionIntentZ,
  SphereIntentZ,
]);
export type Intent3DT = z.infer<typeof Intent3DZ>;

export function solid(spec: {
  flavor: SolidFlavor; baseLabels: string[]; baseVariant: BaseVariant;
  apex?: string; apexVariant: ApexVariant; apexAnchor?: string; topLabels?: string[];
}): Intent3DT {
  return { op: 'solid', ...spec } as Intent3DT;
}

export function addPoint3d(name: string, constraint: Record<string, unknown>): Intent3DT {
  return { op: 'add-point-3d', name, constraint } as Intent3DT;
}

export function plane3d(name: string, spec: Record<string, unknown>): Intent3DT {
  return { op: 'plane', name, spec } as Intent3DT;
}

// Routes all keys other than `name` and `kind` into a `refs` record,
// so that later tasks (giao tuyến) can pass plane1/plane2 under refs
// without being stripped by Zod discriminatedUnion.
export function line3dIntent(spec: { name?: string; kind: string } & Record<string, unknown>): Intent3DT {
  const { name, kind, ...rest } = spec;
  return { op: 'line', ...(name ? { name } : {}), kind, refs: rest } as Intent3DT;
}

export function connect3d(from: string, to: string, style = 'segment'): Intent3DT {
  return { op: 'connect', from, to, style } as Intent3DT;
}

export function crossSection3d(spec: { name?: string; plane: string; solid?: string }): Intent3DT {
  return { op: 'cross-section', ...spec } as Intent3DT;
}

export function sphereIntent(spec: { name?: string; center: string; surfacePoint: string }): Intent3DT {
  return { op: 'sphere', ...spec } as Intent3DT;
}
