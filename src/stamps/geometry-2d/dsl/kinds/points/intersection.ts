// src/stamps/geometry-2d/dsl/kinds/points/intersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { POINT_BASE_FIELDS } from '../_shared';

type Input = Extract<DslPointT, { kind: 'intersection' }>;

export const intersectionModule = defineModule<'intersection', Input>({
  kind: 'intersection',
  role: 'point',
  category: 'points',
  prefix: 'i',
  schema: z.object({
    name: NameZ,
    kind: z.literal('intersection'),
    ref1: NameZ,
    ref2: NameZ,
    branch: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  collectRefs: (e) => [e.ref1, e.ref2],
  refSpecs: [
    { field: 'ref1', role: 'line-or-circle' },
    { field: 'ref2', role: 'line-or-circle' },
  ],
  emit: (e, ctx) => {
    const r1IsCircle = ctx.hintOf(e.ref1) === 'circle';
    const r2IsCircle = ctx.hintOf(e.ref2) === 'circle';
    let intersectKind: 'lineLine' | 'lineCircle' | 'circleCircle';
    if (r1IsCircle && r2IsCircle) intersectKind = 'circleCircle';
    else if (r1IsCircle || r2IsCircle) intersectKind = 'lineCircle';
    else intersectKind = 'lineLine';

    const attrs: Record<string, unknown> = {
      kind: intersectKind,
      ref1: ctx.resolveId(e.ref1),
      ref2: ctx.resolveId(e.ref2),
    };
    if (intersectKind !== 'lineLine') {
      attrs.branch = e.branch ?? 0;
    }
    return [{
      role: 'primary',
      object: {
        id: ctx.resolveId(e.name),
        kind: 'intersection',
        label: e.name,
        ...POINT_BASE_FIELDS,
        attrs,
      },
    }];
  },
});
