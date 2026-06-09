// src/stamps/geometry-2d/dsl/kinds/circles/circleDiameter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'circleDiameter' }>;

// Đường tròn đường kính p1p2 — tâm = trung điểm, bán kính = |p1p2|/2.
// Emit circle với construction 'diameter'; renderer dựng midpoint ẩn + circle qua p2.
export const circleDiameterModule = defineModule<'circleDiameter', Input>({
  kind: 'circleDiameter',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleDiameter'),
    p1: NameZ,
    p2: NameZ,
    visible: z.boolean().optional(),
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      visible: e.visible ?? true,
      attrs: {
        construction: {
          kind: 'diameter',
          p1: ctx.resolveId(e.p1),
          p2: ctx.resolveId(e.p2),
        },
      },
    },
  }],
});
