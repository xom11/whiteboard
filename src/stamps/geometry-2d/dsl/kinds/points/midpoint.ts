// src/stamps/geometry-2d/dsl/kinds/points/midpoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'midpoint' }>;

export const midpointModule = defineModule<'midpoint', Input>({
  kind: 'midpoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('midpoint'),
    p1: NameZ,
    p2: NameZ,
    visible: z.boolean().optional(),
  }),
  collectRefs: (e) => [e.p1, e.p2],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'midpoint', p1: ctx.resolveId(e.p1), p2: ctx.resolveId(e.p2) },
      e.visible ?? true,
    ),
  }],
});
