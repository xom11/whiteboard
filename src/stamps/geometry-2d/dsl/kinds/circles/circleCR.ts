import { z } from 'zod';
import { NameZ } from '../../names';
import type { DslShapeT } from '../../schema';
import { defineModule } from '../_types';
import { SHAPE_BASE_FIELDS } from '../_shared';

type Input = Extract<DslShapeT, { kind: 'circleCR' }>;

export const circleCRModule = defineModule<'circleCR', Input>({
  kind: 'circleCR',
  role: 'circle',
  category: 'circles',
  prefix: 'c',
  schema: z.object({
    name: NameZ,
    kind: z.literal('circleCR'),
    center: NameZ,
    radius: z.number().positive(),
  }),
  collectRefs: (e) => [e.center],
  emit: (e, ctx) => [{
    role: 'primary',
    object: {
      id: ctx.resolveId(e.name),
      kind: 'circle',
      label: e.name,
      ...SHAPE_BASE_FIELDS,
      attrs: { center: ctx.resolveId(e.center), radius: e.radius },
    },
  }],
});
