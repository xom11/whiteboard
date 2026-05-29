// src/stamps/geometry-2d/dsl/kinds/lines/perpendicular.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'perpendicular' }>;

export const perpendicularModule = defineModule<'perpendicular', Input>({
  kind: 'perpendicular',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('perpendicular'),
    throughPoint: NameZ,
    toLine: NameZ,
  }),
  collectRefs: (e) => [e.throughPoint, e.toLine],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'line',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'perpendicular',
          throughPoint: ctx.resolveId(e.throughPoint),
          toLine: ctx.resolveId(e.toLine),
        },
      },
    },
  }],
});
