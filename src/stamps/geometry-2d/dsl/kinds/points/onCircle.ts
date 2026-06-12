// src/stamps/geometry-2d/dsl/kinds/points/onCircle.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'onCircle' }>;

export const onCircleModule = defineModule<'onCircle', Input>({
  kind: 'onCircle',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('onCircle'),
    circleId: NameZ,
    theta: z.number().finite(),
  }),
  collectRefs: (e) => [e.circleId],
  refSpecs: [{ field: 'circleId', role: 'circle' }],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'onCircle', circleId: ctx.resolveId(e.circleId), theta: e.theta },
    ),
  }],
});
