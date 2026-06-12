// src/stamps/geometry-2d/dsl/kinds/lines/angleBisector.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'angleBisector' }>;

export const angleBisectorModule = defineModule<'angleBisector', Input>({
  kind: 'angleBisector',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('angleBisector'),
    p1: NameZ,
    vertex: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.vertex, e.p2],
  refSpecs: [
    { field: 'p1', role: 'point' },
    { field: 'vertex', role: 'point' },
    { field: 'p2', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'line',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'angleBisector',
          p1: ctx.resolveId(e.p1),
          vertex: ctx.resolveId(e.vertex),
          p2: ctx.resolveId(e.p2),
        },
      },
    },
  }],
});
