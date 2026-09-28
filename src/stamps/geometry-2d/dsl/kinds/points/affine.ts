// src/stamps/geometry-2d/dsl/kinds/points/affine.ts
//
// Điểm = Σ weights[i]·points[i], Σ weights = 1 (tổ hợp affine — không phụ thuộc gốc
// toạ độ). Dùng cho điểm xác định bởi đẳng thức vectơ có từ ba điểm trở lên và đỉnh
// thứ tư hình bình hành (D = A − B + C).
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'affine' }>;

export const affineModule = defineModule<'affine', Input>({
  kind: 'affine',
  role: 'point',
  category: 'points',
  prefix: 'p',
  // (Độ dài khớp nhau + Σ = 1 do builder add-point kiểm; schema module phải là
  // ZodObject thuần nên không .refine ở đây.)
  schema: z.object({
    name: NameZ,
    kind: z.literal('affine'),
    points: z.array(NameZ).min(2).max(8),
    weights: z.array(z.number().finite()).min(2).max(8),
    // Phần quay +90° (hình vuông / tam giác đều dựng trên cạnh) + điểm để chọn phía.
    rot: z.array(z.number().finite()).min(2).max(8).optional(),
    awayFrom: NameZ.optional(),
  }),
  collectRefs: (e) => (e.awayFrom ? [...e.points, e.awayFrom] : [...e.points]),
  refSpecs: (e) => [
    { field: 'points', role: 'point', many: true },
    ...(e.awayFrom ? [{ field: 'awayFrom', role: 'point' as const }] : []),
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'affine',
      points: e.points.map((p) => ctx.resolveId(p)),
      weights: [...e.weights],
      ...(e.rot ? { rot: [...e.rot] } : {}),
      ...(e.awayFrom ? { awayFrom: ctx.resolveId(e.awayFrom) } : {}),
    }),
  }],
});
