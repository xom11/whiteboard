// src/stamps/geometry-2d/dsl/kinds/circles/circle3.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'circle3' }>;

export const circle3Module = defineModule<'circle3', Input>({
  kind: 'circle3',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circle3'),
    p1: NameZ,
    p2: NameZ,
    p3: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2, e.p3],
  refSpecs: [
    { field: 'p1', role: 'point' },
    { field: 'p2', role: 'point' },
    { field: 'p3', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'circumscribed',
          p1: ctx.resolveId(e.p1),
          p2: ctx.resolveId(e.p2),
          p3: ctx.resolveId(e.p3),
        },
      },
    },
  }],
});
