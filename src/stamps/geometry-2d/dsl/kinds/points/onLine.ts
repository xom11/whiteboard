// src/stamps/geometry-2d/dsl/kinds/points/onLine.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'onLine' }>;

export const onLineModule = defineModule<'onLine', Input>({
  kind: 'onLine',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onLine'),
    lineId: NameZ,
    t: z.number().finite(),
  }),
  collectRefs: (e) => [e.lineId],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'onLine', lineId: ctx.resolveId(e.lineId), t: e.t },
    ),
  }],
});
