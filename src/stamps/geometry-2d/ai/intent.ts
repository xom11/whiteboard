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
    // Điểm A nằm NGOÀI đường tròn `circle` (free external point) — builder đọc
    // tâm+bán kính của circle từ build state rồi đặt A free tại coord ngoài
    // circle. Unblock tangentFromExt render (đề "Lấy A ngoài (O), kẻ 2 tiếp tuyến").
    z.object({ kind: z.literal('externalToCircle'), circle: LabelZ }),
    // NEW Tier 4+5
    z.object({ kind: z.literal('secondIntersection'), line: z.string(), circle: LabelZ, other: LabelZ }),
    z.object({ kind: z.literal('circleIntersection'), c1: LabelZ, c2: LabelZ, which: z.union([z.literal(0), z.literal(1)]) }),
    z.object({ kind: z.literal('tangencyPoint'), circle: LabelZ, onLine: z.string() }),
    z.object({ kind: z.literal('tangentPoint'), from: LabelZ, circle: LabelZ, which: z.union([z.literal(0), z.literal(1)]) }),
    z.object({ kind: z.literal('angleBisectorFoot'), from: LabelZ, onLine: z.string() }),
    // Phân giác NGOÀI: chân phân giác ngoài đỉnh `from` trên đường thẳng `onLine`
    // (phân giác ngoài ⊥ phân giác trong tại `from`). Issue #46 nhóm A.
    z.object({ kind: z.literal('externalAngleBisectorFoot'), from: LabelZ, onLine: z.string() }),
    // Cụm A
    z.object({ kind: z.literal('arcMidpoint'), circle: LabelZ, a: LabelZ, b: LabelZ, notContaining: LabelZ }),
    z.object({ kind: z.literal('reflectPoint'), of: LabelZ, through: LabelZ }),
    z.object({ kind: z.literal('reflectLine'), of: LabelZ, through: z.string() }),
    z.object({ kind: z.literal('excenter'), of: z.tuple([LabelZ, LabelZ, LabelZ]), opposite: LabelZ }),
    // Góc vuông nhìn đoạn: M trên onLine sao cho ∠ a-name-b = 90°
    z.object({ kind: z.literal('rightAngleViewing'), a: LabelZ, b: LabelZ, onLine: z.string(), which: z.union([z.literal(0), z.literal(1)]).optional() }),
    z.object({
      kind: z.literal('pointAtDistance'),
      from: LabelZ,
      through: LabelZ,
      // scale/offset OPTIONAL (Issue #46 nhóm C): d = scale·base + offset.
      // scale > 0; absent → giữ d = base như cũ (additive).
      distance: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('circleRadius'), circle: LabelZ, scale: z.number().positive().optional(), offset: z.number().optional() }),
        z.object({ kind: z.literal('segmentLength'), p1: LabelZ, p2: LabelZ, scale: z.number().positive().optional(), offset: z.number().optional() }),
        z.object({ kind: z.literal('literal'), value: z.number().positive(), scale: z.number().positive().optional(), offset: z.number().optional() }),
      ]),
    }),
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
  spec: z.enum(['centerThrough', 'through3', 'centerRadius', 'inscribedIn']),
  center: LabelZ.optional(),
  through: LabelZ.optional(),
  points: z.tuple([LabelZ, LabelZ, LabelZ]).optional(),
  // NEW Tier 4+5
  radius: z.number().positive().optional(),
  triangle: z.tuple([LabelZ, LabelZ, LabelZ]).optional(),
});

// op: draw-line
export const DrawLineIntentZ = z.object({
  op: z.literal('draw-line'),
  name: LabelZ,
  kind: z.enum(['perpThrough', 'parallelThrough', 'tangentAt', 'tangentFromExt', 'angleBisector', 'lineThrough']),
  through: LabelZ.optional(),
  to: LabelZ.optional(),
  from: LabelZ.optional(),
  circle: LabelZ.optional(),
  which: z.enum(['first', 'second', 'both']).optional(),
  // lineThrough (đường qua ≥2 điểm đồng tuyến — vd Euler line G/H/O, issue #47).
  points: z.array(LabelZ).optional(),
  // angleBisector (phân giác TRONG của góc ∠p1·vertex·p2, VISIBLE, không foot —
  // Issue #46 nhóm A). vertex = đỉnh góc.
  p1: LabelZ.optional(),
  vertex: LabelZ.optional(),
  p2: LabelZ.optional(),
});

// op: mark-shape (sub-shape từ điểm đã có, không tạo coord mới)
export const MarkShapeIntentZ = z.object({
  op: z.literal('mark-shape'),
  shape: z.enum(['triangle', 'quadrilateral']),
  labels: z.array(LabelZ).min(3).max(4),
});

// Master discriminated union — 6 variants theo op
export const IntentZ = z.discriminatedUnion('op', [
  DrawShapeIntentZ,
  AddPointIntentZ,
  ConnectIntentZ,
  DrawCircleIntentZ,
  DrawLineIntentZ,   // NEW
  MarkShapeIntentZ,  // NEW
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
export type DrawLineIntentT = z.infer<typeof DrawLineIntentZ>;
export type MarkShapeIntentT = z.infer<typeof MarkShapeIntentZ>;

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
