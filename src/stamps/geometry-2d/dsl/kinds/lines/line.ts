// src/stamps/geometry-2d/dsl/kinds/lines/line.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'line' }>;

export const lineModule = defineModule<'line', Input>({
  kind: 'line',
  role: 'line',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('line'),
    p1: NameZ,
    p2: NameZ,
  }),
  collectRefs: (e) => [e.p1, e.p2],
  refSpecs: [
    { field: 'p1', role: 'point' },
    { field: 'p2', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'line',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
    },
  }],
});
