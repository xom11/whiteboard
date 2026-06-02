// src/stamps/geometry-2d/dsl/kinds/points/circleIntersection.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'circleIntersection' }>;

export const circleIntersectionModule = defineModule<'circleIntersection', Input>({
  kind: 'circleIntersection',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleIntersection'),
    c1: NameZ,
    c2: NameZ,
    which: z.union([z.literal(0), z.literal(1)]),
  }),
  collectRefs: (e) => [e.c1, e.c2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'circleIntersection',
        c1: ctx.resolveId(e.c1),
        c2: ctx.resolveId(e.c2),
        which: e.which,
      },
    ),
  }],
});
