import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'excircle' }>;

export const excircleModule = defineModule<'excircle', Input>({
  kind: 'excircle',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('excircle'),
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
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        construction: {
          kind: 'excircle',
          p1: ctx.resolveId(e.vertices[0]),
          p2: ctx.resolveId(e.vertices[1]),
          p3: ctx.resolveId(e.vertices[2]),
          opposite: ctx.resolveId(e.opposite),
        },
      },
    },
  }],
});
