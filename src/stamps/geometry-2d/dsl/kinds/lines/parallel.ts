// src/stamps/geometry-2d/dsl/kinds/lines/parallel.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'parallel' }>;

export const parallelModule = defineModule<'parallel', Input>({
  kind: 'parallel',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('parallel'),
    throughPoint: NameZ,
    toLine: NameZ,
  }),
  collectRefs: (e) => [e.throughPoint, e.toLine],
  refSpecs: [
    { field: 'throughPoint', role: 'point' },
    { field: 'toLine', role: 'line-like' },
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
          kind: 'parallel',
          throughPoint: ctx.resolveId(e.throughPoint),
          toLine: ctx.resolveId(e.toLine),
        },
      },
    },
  }],
});
