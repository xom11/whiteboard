import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'incircle' }>;

export const incircleModule = defineModule<'incircle', Input>({
  kind: 'incircle',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('incircle'),
    vertices: z.tuple([NameZ, NameZ, NameZ]),
  }),
  collectRefs: (e) => [...e.vertices],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: {
        kind: 'incircle',
        vertices: [
          ctx.resolveId(e.vertices[0]),
          ctx.resolveId(e.vertices[1]),
          ctx.resolveId(e.vertices[2]),
        ],
      },
    },
  }],
});
