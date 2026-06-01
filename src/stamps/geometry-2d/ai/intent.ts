// src/stamps/geometry-2d/ai/intent.ts
//
// Intent schema — replacement for free-form DSL output.
//
// AI emit Intent[] thay vì DSL trực tiếp. Mỗi Intent là 1 "lệnh vẽ" cấp
// semantic ("vẽ tam giác đều ABC", "thêm trung điểm M của BC"). Builder
// (intentToDsl.ts) deterministic dịch Intent → DSL với canonical coords.
//
// Lợi ích:
//   - AI chỉ làm NLU (đọc-tách-lệnh), không tự đặt coord → 0% hallucinate coord
//   - Variant enum loại bỏ "tam giác vuông tại A nhưng coord vuông tại B"
//   - Schema explicit slot cho augmentations → guard "không thừa"

import { z } from 'zod';

// Tên label/point — alphanumeric, 1-8 chars, không trùng kind enum.
export const LabelZ = z.string().min(1).max(8).regex(/^[A-Za-z][A-Za-z0-9'_]*$/);

// ---------------------------------------------------------------------------
// Shape variants per shape type
// ---------------------------------------------------------------------------

// triangle variants
export const TriangleVariantZ = z.enum([
  'any',          // tam giác bất kỳ (scalene cố định)
  'equilateral',  // tam giác đều
  'isoceles-AB',  // cân tại C (AB đáy)
  'isoceles-BC',  // cân tại A (BC đáy)
  'isoceles-CA',  // cân tại B (CA đáy)
  'right-at-A',   // vuông tại A
  'right-at-B',   // vuông tại B
  'right-at-C',   // vuông tại C
]);

export const QuadVariantZ = z.enum([
  'any',          // tứ giác bất kỳ
]);

export const SquareVariantZ = z.enum([
  'standard',     // canonical
]);

export const RectangleVariantZ = z.enum([
  'wide',         // mặc định 4×2.5
  'tall',         // 2.5×4
]);

export const RhombusVariantZ = z.enum([
  'standard',     // canonical (diagonals 4,2)
]);

export const TrapezoidVariantZ = z.enum([
  'right',        // vuông
  'isoceles',     // cân
  'general',      // thường
]);

export const ParallelogramVariantZ = z.enum([
  'standard',     // mặc định
]);

// ---------------------------------------------------------------------------
// Intent ops
// ---------------------------------------------------------------------------
//
// Note: zod's discriminatedUnion không cho phép duplicate discriminator value
// (vd nhiều 'draw-shape' schemas khác nhau). Solution: flatten — mỗi op là 1
// schema duy nhất với `shape` là enum, runtime check variant ∈ allowed-for-shape
// trong builder. Đánh đổi: kém type-safety hơn variant-per-shape DSU, nhưng
// schema flatter → JSON Schema rõ ràng hơn cho LLM, Ollama format không phải
// nested anyOf.

const ShapeNameZ = z.enum([
  'triangle',
  'square',
  'rectangle',
  'rhombus',
  'trapezoid',
  'parallelogram',
  'quadrilateral',
]);

// Tất cả variant gộp 1 enum — runtime check ở builder.
const ShapeVariantZ = z.enum([
  // triangle
  'any', 'equilateral',
  'isoceles-AB', 'isoceles-BC', 'isoceles-CA',
  'right-at-A', 'right-at-B', 'right-at-C',
  // square / rhombus / parallelogram
  'standard',
  // rectangle
  'wide', 'tall',
  // trapezoid
  'right', 'isoceles', 'general',
]);

// op: draw-shape
export const DrawShapeIntentZ = z.object({
  op: z.literal('draw-shape'),
  shape: ShapeNameZ,
  labels: z.array(LabelZ).min(3).max(8),
  variant: ShapeVariantZ.default('any'),
  explicitCoords: z.record(LabelZ, z.tuple([z.number(), z.number()])).optional(),
});

// op: add-point
export const AddPointIntentZ = z.object({
  op: z.literal('add-point'),
  name: LabelZ,
  constraint: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('midpoint'), of: z.string() }),
    z.object({ kind: z.literal('perpFoot'), from: LabelZ, onLine: z.string() }),
    z.object({ kind: z.literal('centroid'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('circumcenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('incenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('orthocenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]) }),
    z.object({ kind: z.literal('intersection'), of: z.tuple([z.string(), z.string()]) }),
    z.object({ kind: z.literal('onSegment'), of: z.string(), t: z.number().min(0).max(1).optional() }),
    z.object({ kind: z.literal('free'), at: z.tuple([z.number(), z.number()]).optional() }),
  ]),
});

// op: connect
export const ConnectIntentZ = z.object({
  op: z.literal('connect'),
  from: LabelZ,
  to: LabelZ,
  style: z.enum([
    'segment',
    'line',
    'ray',
    'perpBisector',
    'angleBisector',
  ]).default('segment'),
});

// op: draw-circle — single schema, spec là enum, points conditional
export const DrawCircleIntentZ = z.object({
  op: z.literal('draw-circle'),
  name: LabelZ,
  spec: z.enum(['centerThrough', 'through3']),
  center: LabelZ.optional(),
  through: LabelZ.optional(),
  points: z.tuple([LabelZ, LabelZ, LabelZ]).optional(),
});

// Master discriminated union — chỉ 4 variants theo op
export const IntentZ = z.discriminatedUnion('op', [
  DrawShapeIntentZ,
  AddPointIntentZ,
  ConnectIntentZ,
  DrawCircleIntentZ,
]);

// Re-export variant enums cho consumer (vd UI dropdown)
export {
  TriangleVariantZ as TriangleVariants,
  SquareVariantZ as SquareVariants,
  RectangleVariantZ as RectangleVariants,
  RhombusVariantZ as RhombusVariants,
  TrapezoidVariantZ as TrapezoidVariants,
  ParallelogramVariantZ as ParallelogramVariants,
  QuadVariantZ as QuadVariants,
};

export type IntentT = z.infer<typeof IntentZ>;
export type DrawShapeIntentT = z.infer<typeof DrawShapeIntentZ>;
export type AddPointIntentT = z.infer<typeof AddPointIntentZ>;
export type ConnectIntentT = z.infer<typeof ConnectIntentZ>;
export type DrawCircleIntentT = z.infer<typeof DrawCircleIntentZ>;

// ---------------------------------------------------------------------------
// Envelope — wraps intents[] + decision
// ---------------------------------------------------------------------------

export const IntentEnvelopeZ = z
  .object({
    decision: z.enum(['build', 'refuse']),
    intents: z.array(IntentZ).optional(),
    reason: z.string().optional(),
  })
  .refine(
    (e) =>
      e.decision === 'build'
        ? Array.isArray(e.intents) && e.intents.length > 0
        : e.reason != null && e.reason.length > 0,
    {
      message:
        'decision=build cần intents non-empty; decision=refuse cần reason',
    },
  );

export type IntentEnvelopeT = z.infer<typeof IntentEnvelopeZ>;
