import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'tangentPointExt' }>;

export const tangentPointExtModule = defineModule<'tangentPointExt', Input>({
  kind: 'tangentPointExt',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangentPointExt'),
    from: NameZ,
    circle: NameZ,
    which: z.union([z.literal(0), z.literal(1)]),
  }),
  collectRefs: (e) => [e.from, e.circle],
  refSpecs: [
    { field: 'from', role: 'point' },
    { field: 'circle', role: 'circle' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'tangentPointExt',
        from: ctx.resolveId(e.from),
        circle: ctx.resolveId(e.circle),
        which: e.which,
      },
    ),
  }],
});
