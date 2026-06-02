import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'tangencyPoint' }>;

export const tangencyPointModule = defineModule<'tangencyPoint', Input>({
  kind: 'tangencyPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('tangencyPoint'),
    circle: NameZ,
    onLine: NameZ,
  }),
  collectRefs: (e) => [e.circle, e.onLine],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      {
        kind: 'tangencyPoint',
        circle: ctx.resolveId(e.circle),
        onLine: ctx.resolveId(e.onLine),
      },
    ),
  }],
});
