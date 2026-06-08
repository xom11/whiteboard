// src/stamps/geometry-2d/dsl/kinds/lines/radicalAxis.ts
//
// Trục đẳng phương 2 đường tròn (issue #47, construct 2): đường ⊥ đường nối tâm
// O₁O₂, mọi điểm trên nó có lũy thừa (power) bằng nhau với 2 đường tròn. Kind
// role 'lineConstruction' nhưng tham chiếu 2 CIRCLE (không phải điểm) — mirror
// `lineThrough` về cấu trúc, khác ở refSpecs role 'circle'.
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import type { RefSpec } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'radicalAxis' }>;

export const radicalAxisModule = defineModule<'radicalAxis', Input>({
  kind: 'radicalAxis',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('radicalAxis'),
    circle1: NameZ,
    circle2: NameZ,
  }),
  collectRefs: (e) => [e.circle1, e.circle2],
  refSpecs: [
    { field: 'circle1', role: 'circle' },
    { field: 'circle2', role: 'circle' },
  ] as readonly RefSpec[],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'line',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'radicalAxis',
          circle1: ctx.resolveId(e.circle1),
          circle2: ctx.resolveId(e.circle2),
        },
      },
    },
  }],
});
