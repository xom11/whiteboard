// src/stamps/geometry-2d/dsl/kinds/points/reflectPoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject } from '../_shared';

type Input = Extract<DslPointT, { kind: 'reflectPoint' }>;

export const reflectPointModule = defineModule<'reflectPoint', Input>({
  kind: 'reflectPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({ name: NameZ, kind: z.literal('reflectPoint'), of: NameZ, through: NameZ }),
  collectRefs: (e) => [e.of, e.through],
  refSpecs: [
    { field: 'of', role: 'point' },
    { field: 'through', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'transformed',
      source: ctx.resolveId(e.of),
      transform: { kind: 'reflectPoint', center: ctx.resolveId(e.through) },
    }),
  }],
});
