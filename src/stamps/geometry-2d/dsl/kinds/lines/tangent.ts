// src/stamps/geometry-2d/dsl/kinds/lines/tangent.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'tangent' }>;

export const tangentModule = defineModule<'tangent', Input>({
  kind: 'tangent',
  role: 'lineConstruction',
  category: 'lines',
  prefix: 'l',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangent'),
    throughPoint: NameZ,
    toCircle: NameZ,
    branch: z.union([z.literal(0), z.literal(1), z.literal('on')]).optional(),
  }),
  collectRefs: (e) => [e.throughPoint, e.toCircle],
  emit: (e, ctx) => {
    const construction: Record<string, unknown> = {
      kind: 'tangent',
      throughPoint: ctx.resolveId(e.throughPoint),
      toCircle: ctx.resolveId(e.toCircle),
    };
    if (e.branch !== undefined) construction.branch = e.branch;
    return [{
      role: 'primary',
      object: {
        id: ctx.resolveId(e.name),
        kind: 'line',
        label: e.name,
        ...SHAPE_BASE_FIELDS,
        attrs: { construction },
      },
    }];
  },
});
