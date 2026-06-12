// src/stamps/geometry-2d/dsl/kinds/points/centroid.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslPointT } from '../../schema';
import { defineModule } from '../_types';
import { emitPointObject, resolveTriangleVertices } from '../_shared';

type Input = Extract<DslPointT, { kind: 'centroid' }>;

export const centroidModule = defineModule<'centroid', Input>({
  kind: 'centroid',
  role: 'point',
  category: 'points',
  prefix: 'p',
  schema: z.object({
    name: NameZ,
    kind: z.literal('centroid'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  refSpecs: [{ field: 'vertices', role: 'point', many: true }],
  emit: (e, ctx) => [{
    role: 'primary',
    object: emitPointObject(
      ctx.resolveId(e.name),
      e.name,
      { kind: 'centroid', vertices: resolveTriangleVertices(ctx, e.vertices) },
    ),
  }],
});
