// src/stamps/geometry-2d/dsl/kinds/points/circleSecondIntersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'circleSecondIntersection' }>;

// Giao điểm THỨ HAI của 2 đường tròn (c1 ∩ c2), biết điểm chung `exclude`.
// Renderer: JSXGraph 'otherintersection' → nghiệm KHÁC `exclude`.
export const circleSecondIntersectionModule = defineModule<'circleSecondIntersection', Input>({
  kind: 'circleSecondIntersection',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleSecondIntersection'),
    c1: NameZ,
    c2: NameZ,
    exclude: NameZ,
  }),
  collectRefs: (e) => [e.c1, e.c2, e.exclude],
  refSpecs: [
    { field: 'c1', role: 'circle' },
    { field: 'c2', role: 'circle' },
    { field: 'exclude', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'circleSecondIntersection',
        c1: ctx.resolveId(e.c1),
        c2: ctx.resolveId(e.c2),
        exclude: ctx.resolveId(e.exclude),
      },
    ),
  }],
});
