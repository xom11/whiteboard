// src/stamps/geometry-2d/dsl/kinds/circles/circleCP.ts
import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'circleCP' }>;

export const circleCPModule = defineModule<'circleCP', Input>({
  kind: 'circleCP',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCP'),
    center: NameZ,
    surfacePoint: NameZ,
    visible: z.boolean().optional(),
  }),
  collectRefs: (e) => [e.center, e.surfacePoint],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      visible: e.visible ?? true,
      attrs: { center: ctx.resolveId(e.center), surfacePoint: ctx.resolveId(e.surfacePoint) },
    },
  }],
});
