// src/stamps/geometry-2d/dsl/schema.ts
import { z } from 'zod';

// Label-style name: chữ cái Latin đầu, cho phép unicode prime (') + subscript ₀-₉.
// Max length 12 ký tự. Phân biệt hoa/thường.
export const NameZ = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);

export const DslPoint = z.discriminatedUnion('kind', [
  z.object({ name: NameZ, kind: z.literal('free'),
             x: z.number().finite(), y: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('midpoint'),
             p1: NameZ, p2: NameZ }),
  z.object({ name: NameZ, kind: z.literal('onSegment'),
             segmentId: NameZ, t: z.number().min(0).max(1) }),
  z.object({ name: NameZ, kind: z.literal('onLine'),
             lineId: NameZ, t: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('onCircle'),
             circleId: NameZ, theta: z.number().finite() }),
  z.object({ name: NameZ, kind: z.literal('perpFoot'),
             from: NameZ, onLine: NameZ }),
  z.object({ name: NameZ, kind: z.literal('circumcenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('incenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('centroid'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('orthocenter'),
             vertices: z.tuple([NameZ, NameZ, NameZ]) }),
  z.object({ name: NameZ, kind: z.literal('intersection'),
             ref1: NameZ, ref2: NameZ,
             branch: z.union([z.literal(0), z.literal(1)]).optional() }),
]);

// Placeholder — sẽ mở rộng trong Task 1.5.
export const DslShape = z.never();

export const DslInput = z.object({
  version: z.literal(1),
  points: z.array(DslPoint),
  shapes: z.array(DslShape).default([]),
});

export type DslPointT = z.infer<typeof DslPoint>;
export type DslShapeT = z.infer<typeof DslShape>;
export type DslInputT = z.infer<typeof DslInput>;
