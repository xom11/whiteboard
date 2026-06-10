// src/stamps/geometry-2d/dsl/kinds/points/mixtilinearPoint.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject, resolveTriangleVertices } from '../_shared';

type Input = Extract<DslPointT, { kind: 'mixtilinearPoint' }>;

export const mixtilinearPointModule = defineModule<'mixtilinearPoint', Input>({
  kind: 'mixtilinearPoint',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('mixtilinearPoint'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
    which: z.union([z.literal('center'), z.literal('touch')]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(ctx.resolveId(e.name), e.name, {
      kind: 'mixtilinearPoint',
      vertices: resolveTriangleVertices(ctx, e.vertices),
      which: e.which,
    }),
  }],
});
