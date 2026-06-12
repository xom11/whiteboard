// src/stamps/geometry-2d/dsl/kinds/lines/ray.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'ray' }>;

export const rayModule = defineModule<'ray', Input>({
  kind: 'ray',
  role: 'ray',
  category: 'lines',
  prefix: 'r',
  schema: z.object({
    name: NameZ,
    kind: z.literal('ray'),
    origin: NameZ,
    through: NameZ,
  }),
  collectRefs: (e) => [e.origin, e.through],
  refSpecs: [
    { field: 'origin', role: 'point' },
    { field: 'through', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'ray',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { origin: ctx.resolveId(e.origin), through: ctx.resolveId(e.through) },
    },
  }],
});
