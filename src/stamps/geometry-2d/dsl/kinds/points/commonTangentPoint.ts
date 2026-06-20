// src/stamps/geometry-2d/dsl/kinds/points/commonTangentPoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'commonTangentPoint' }>;

export const commonTangentPointModule = defineModule<'commonTangentPoint', Input>({
  kind: 'commonTangentPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('commonTangentPoint'),
    circles: z.tuple([NameZ, NameZ]),
    on: z.union([z.literal(0), z.literal(1)]),
    variant: z.enum(['external', 'internal']),
    side: z.union([z.literal(0), z.literal(1)]),
  }),
  collectRefs: (e) => [e.circles[0], e.circles[1]],
  refSpecs: [{ field: 'circles', role: 'circle', many: true }],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'commonTangentPoint',
      circles: [ctx.resolveId(e.circles[0]), ctx.resolveId(e.circles[1])],
      on: e.on,
      variant: e.variant,
      side: e.side,
    }),
  }],
});
