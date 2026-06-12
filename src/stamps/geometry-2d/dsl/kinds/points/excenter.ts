// src/stamps/geometry-2d/dsl/kinds/points/excenter.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject, resolveTriangleVertices } from '../_shared';

type Input = Extract<DslPointT, { kind: 'excenter' }>;

export const excenterModule = defineModule<'excenter', Input>({
  kind: 'excenter',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('excenter'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
    opposite: NameZ,
  }),
  collectRefs: (e) => [...e.vertices],
  refSpecs: [
    { field: 'vertices', role: 'point', many: true },
    { field: 'opposite', role: 'point' },
  ],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'excenter',
      vertices: resolveTriangleVertices(ctx, e.vertices),
      opposite: ctx.resolveId(e.opposite),
    }),
  }],
});
