// src/stamps/geometry-2d/dsl/kinds/points/free.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'free' }>;

export const freeModule = defineModule<'free', Input>({
  kind: 'free',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('free'),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  collectRefs: () => [],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, { kind: 'free', x: e.x, y: e.y }),
  }],
});
