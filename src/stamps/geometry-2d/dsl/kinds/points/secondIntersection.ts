import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'secondIntersection' }>;

export const secondIntersectionModule = defineModule<'secondIntersection', Input>({
  kind: 'secondIntersection',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('secondIntersection'),
    line: NameZ,
    circle: NameZ,
    other: NameZ,
  }),
  collectRefs: (e) => [e.line, e.circle, e.other],
  refSpecs: [
    { field: 'line', role: 'line-like' },
    { field: 'circle', role: 'circle' },
    { field: 'other', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'secondIntersection',
        line: ctx.resolveId(e.line),
        circle: ctx.resolveId(e.circle),
        other: ctx.resolveId(e.other),
      },
    ),
  }],
});
