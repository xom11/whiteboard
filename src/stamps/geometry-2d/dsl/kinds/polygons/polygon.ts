// src/stamps/geometry-2d/dsl/kinds/polygons/polygon.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'polygon' }>;

export const polygonModule = defineModule<'polygon', Input>({
  kind: 'polygon',
  role: 'polygon',
  category: 'polygons',
  prefix: 'poly',
  schema: z.object({
    name: NameZ,
    kind: z.literal('polygon'),
    vertices: z.array(NameZ).min(3),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'polygon',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { vertices: e.vertices.map((v) => ctx.resolveId(v)) },
    },
  }],
});
